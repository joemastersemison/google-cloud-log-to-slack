require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");

const webhook = process.env.SLACK_WEBHOOK_URL;
const topic = process.env.TOPIC_NAME || "errors-to-slack-topic";
const sink = process.env.SINK_NAME || "errors-to-slack";

// Simple sleep function using Atomics to block
function sleepSync(ms) {
  const now = new Date().getTime();
  while (new Date().getTime() < now + ms) {
    /* do nothing */
  }
}

if (!webhook) {
  console.error("❌ SLACK_WEBHOOK_URL not set in .env file");
  process.exit(1);
}

const projects = JSON.parse(fs.readFileSync("projects.json", "utf8"));

projects.forEach((projectId) => {
  console.log(`\n🚀 Setting up for project: ${projectId}`);

  try {
    execSync(`gcloud config set project ${projectId}`, { stdio: "inherit" });

    // Create Pub/Sub topic
    try {
      execSync(`gcloud pubsub topics create ${topic}`, { stdio: "inherit" });
    } catch (e) {
      console.log("✅ Pub/Sub topic already exists or was created.");
    }

    // Create Log Sink
    const filter = `\"resource.type=(\\\"cloud_function\\\" OR \\\"cloud_run_job\\\") AND severity>=ERROR\"`;
    try {
      execSync(
        `gcloud logging sinks create ${sink} pubsub.googleapis.com/projects/${projectId}/topics/${topic} --log-filter=${filter} --format=json`,
        { stdio: "pipe" }
      );
    } catch (e) {
      console.warn(
        `⚠️ Sink creation failed (may already exist): ${e.stderr?.toString() || e.message}`
      );
    }

    // Get sink service account
    let writerIdentity;
    for (let i = 0; i < 5; i++) {
      try {
        const sinkInfo = JSON.parse(
          execSync(`gcloud logging sinks describe ${sink} --format=json`)
        );
        writerIdentity = sinkInfo.writerIdentity;
        if (writerIdentity) break;
      } catch (e) {
        console.warn(`⏳ Waiting for sink to be available... (${i + 1}/5)`);
        sleepSync(3000); // wait 3 seconds
      }
    }

    if (!writerIdentity) {
      console.error("❌ Failed to retrieve sink writerIdentity after retries.");
      return;
    }

    console.log(`🔐 Granting pubsub.publisher to ${writerIdentity}`);
    execSync(
      `gcloud pubsub topics add-iam-policy-binding ${topic} --member="${writerIdentity}" --role="roles/pubsub.publisher"`,
      { stdio: "inherit" }
    );

    console.log(`🔐 Granting pubsub.publisher to ${writerIdentity}`);

    execSync(
      `gcloud pubsub topics add-iam-policy-binding ${topic} --member="${writerIdentity}" --role="roles/pubsub.publisher"`,
      { stdio: "inherit" }
    );
  } catch (err) {
    console.error(`❌ Error setting up project ${projectId}: ${err.message}`);
  }
});

console.log(
  "\n✅ Setup complete! You now need to deploy a subscriber to forward errors to Slack."
);
console.log(
  "👉 Use Cloud Functions or Cloud Run to consume the Pub/Sub topic and POST to the webhook."
);
