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
