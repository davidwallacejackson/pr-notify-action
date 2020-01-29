import handleEvent from './handleEvent'
import {Request, Response} from 'express'

export async function handle(req: Request, res: Response): Promise<void> {
  try {
    const json = req.body
    const eventName = req.headers['x-github-event'] as string
    const context = {
      eventName,
      payload: json
    }
    await handleEvent(context)
    res.send('ok')
  } catch (error) {
    res.status(500).send('not ok')
  }
}
