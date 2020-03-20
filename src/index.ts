import express from 'express'
import handleGitHubWebhook from './github';
import handleJiraWebhook from './jira';

const app = express();
app.use('/github', handleGitHubWebhook)
app.use('/jira', handleJiraWebhook)
app.use((req, res) => {
  res.send(404);
})

export const handle = app;

