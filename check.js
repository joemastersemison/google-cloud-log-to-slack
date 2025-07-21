require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");

const topic = process.env.TOPIC_NAME || "errors-to-slack-topic";
const sink = process.env.SINK_NAME || "errors-to-slack";
const region = process.env.REGION || "us-central1";

const projects = JSON.parse(fs.readFileSync("projects.json", "utf8"));

projects.forEach((projectId) => {
  console.log(`\n🔍 Checking project: ${projectId}`);

  try {
    execSync(`gcloud config set project ${projectId}`, { stdio: "pipe" });

    // Check if sink exists
    let sinkExists = false;
    try {
      const sinkInfo = execSync(
        `gcloud logging sinks describe ${sink} --format="value(name)"`
      )
        .toString()
        .trim();
      if (sinkInfo === sink) {
        console.log(`✅ Sink "${sink}" exists`);
        sinkExists = true;
      }
    } catch {
      console.warn(`❌ Sink "${sink}" not found`);
    }

    // Check if topic exists
    try {
      const topicInfo = execSync(
        `gcloud pubsub topics describe ${topic} --format="value(name)"`
      )
        .toString()
        .trim();
      if (topicInfo.includes(topic)) {
        console.log(`✅ Pub/Sub topic "${topic}" exists`);
      }
    } catch {
      console.warn(`❌ Pub/Sub topic "${topic}" not found`);
    }

    // Check if subscriber function exists
    try {
      const fnName = execSync(
        `gcloud functions describe forwardErrors --region=${region} --format="value(name)"`
      )
        .toString()
        .trim();
      if (fnName.includes("forwardErrors")) {
        console.log(
          `✅ Cloud Function "forwardErrors" is deployed in region ${region}`
        );
      }
    } catch {
      console.warn(
        `❌ Cloud Function "forwardErrors" not found in region ${region}`
      );
    }
  } catch (err) {
    console.error(`❌ Error checking project ${projectId}: ${err.message}`);
  }
});
