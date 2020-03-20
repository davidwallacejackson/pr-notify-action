import express from 'express'
import handleGitHubWebhook from './github';

const app = express();
app.use(handleGitHubWebhook)

export const handle = app;

