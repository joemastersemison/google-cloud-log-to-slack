const { IncomingWebhook } = require("@slack/webhook");
const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK_URL);

exports.forwardErrors = async (message, context) => {
  const log = JSON.parse(Buffer.from(message.data, "base64").toString());
  const text = log.textPayload || log.jsonPayload?.message || "No message";

  await webhook.send({
    text: `🚨 Error in project *${log.resource.labels.project_id}*\n${text}`,
  });
};
