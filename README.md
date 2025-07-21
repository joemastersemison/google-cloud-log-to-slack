# log-to-slack

This project automates the setup of Google Cloud Logging sinks that route all Cloud Function and Cloud Run **error logs** to **Slack**.

---

## ✨ Features

- Accepts a list of GCP project IDs
- Sets up:
  - Logging sinks for `cloud_function` and `cloud_run_job`
  - A shared or per-project Pub/Sub topic
  - IAM roles for log sinks to publish
- Outputs a Pub/Sub consumer function (Node.js) to post errors to Slack

---

## 📂 Directory Structure

```
log-to-slack/
├── .env               # Config with SLACK_WEBHOOK_URL, TOPIC_NAME, etc.
├── index.js           # Main setup script
├── projects.json      # List of GCP project IDs
├── subscriber
│   └── index.js       # Cloud Function to forward logs to Slack
├── README.md          # This file
```

---

## 📁 Setup

### 0. Slack setup

- Go to your Slack workspace.
- Create a new Slack app (or reuse an existing one) via https://api.slack.com/apps.
- Add the Incoming Webhooks feature to the app.
- Enable Incoming Webhooks and create a new webhook for the target channel.
- Copy the Webhook URL (you'll need it later).

### 1. Clone the repo

```bash
git clone https://github.com/joemastersemison/google-cloud-log-to-slack.git
cd google-cloud-log-to-slack
```

### 2. Create `.env`

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
SINK_NAME=errors-to-slack
TOPIC_NAME=errors-to-slack-topic
```

### 3. Create `projects.json`

```json
["project-id-1", "project-id-2"]
```

### 4. Install and run

```bash
npm install dotenv
node index.js
node deploy.js
```

### 4. Check

```bash
node check.js
```

will make sure that each project in projects.json is properly set up.

---

## 🔐 IAM Permissions Needed

Make sure the identity running `node index.js` has the following roles:

- Logging Admin
- Pub/Sub Admin
- Service Usage Admin (if creating APIs or sinks for first time)

---

## 🧰 Notes

- This sets up **per-project** sinks; you may also centralize via aggregated sinks if needed.
- Make sure to rate-limit or batch logs to Slack if volume is high.

---

## 📈 Example Error Log Forwarding

A typical Slack message looks like:

```
🚨 Error in project *project-id-1*
Function crashed: TypeError: cannot read property 'x' of undefined
```

---

## 💭 Questions?

PRs and issues welcome. Built for multi-project Firebase/Cloud Run error visibility.

---

## 🚧 LICENSE

MIT License
