import 'dotenv/config'

import express from 'express'
import handleGitHubWebhook from './github'

const app = express()
app.use('/github', handleGitHubWebhook)
app.use((req, res) => {
  res.send(404)
})
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('server error: ', err.toString())
    console.error(err.stack)
    res.status(500).send('not ok')
  }
)

export const handle = app
