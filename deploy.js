require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const webhook = process.env.SLACK_WEBHOOK_URL;
const topic = process.env.TOPIC_NAME || "errors-to-slack-topic";
const region = process.env.REGION || "us-central1";

if (!webhook) {
  console.error("❌ SLACK_WEBHOOK_URL not set in .env file");
  process.exit(1);
}

const projects = JSON.parse(fs.readFileSync("projects.json", "utf8"));

projects.forEach((projectId) => {
  try {
    console.log(
      `👷 Forcing creation of gcp-sa-pubsub service account by creating dummy push subscription...`
    );
    execSync(
      `gcloud pubsub subscriptions create temp-sub-${projectId} --topic=${topic} --push-endpoint=https://example.com/push --push-auth-token-audience=https://example.com`,
      { stdio: "pipe" }
    );
    execSync(`gcloud pubsub subscriptions delete temp-sub-${projectId}`, {
      stdio: "pipe",
    });
  } catch (e) {
    console.warn(
      `⚠️ Ignoring dummy push setup error (may already exist): ${e.message}`
    );
  }

  const projectNumber = execSync(
    `gcloud projects describe ${projectId} --format="value(projectNumber)"`
  )
    .toString()
    .trim();

  const pubsubServiceAgent = `serviceAccount:service-${projectNumber}@gcp-sa-pubsub.iam.gserviceaccount.com`;

  try {
    console.log(
      `🔐 Granting roles/iam.serviceAccountTokenCreator to ${pubsubServiceAgent}`
    );
    execSync(
      `gcloud projects add-iam-policy-binding ${projectId} --member="${pubsubServiceAgent}" --role="roles/iam.serviceAccountTokenCreator"`,
      { stdio: "inherit" }
    );
  } catch (err) {
    console.warn(`⚠️ Failed to assign IAM role: ${err.message}`);
  }

  console.log(`\n🚀 Deploying function to project: ${projectId}`);
  try {
    execSync(`gcloud config set project ${projectId}`, { stdio: "inherit" });

    execSync(
      `gcloud functions deploy forwardErrors \
      --gen2 \
      --runtime=nodejs20 \
      --region=${region} \
      --entry-point=forwardErrors \
      --source=./subscriber \
      --trigger-topic=${topic} \
      --set-env-vars SLACK_WEBHOOK_URL=${webhook}`,
      { stdio: "inherit", shell: true }
    );

    console.log(`✅ Deployed to project: ${projectId}`);
  } catch (err) {
    console.error(`❌ Error deploying to project ${projectId}: ${err.message}`);
  }
});
