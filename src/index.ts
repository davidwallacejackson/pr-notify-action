import crypto from 'crypto'
import {Request, Response} from 'express'

import handleEvent from './handleEvent'
import getConfig from './config'

async function verify(req: Request) {
  const {secret} = await getConfig()
  if (req.method.toLowerCase() !== 'post') {
    throw new Error('must be POST')
  }

  const payload = JSON.stringify(req.body)
  if (!payload) {
    throw new Error('Request body empty')
  }

  const sig = req.get('x-hub-signature') || ''
  const hmac = crypto.createHmac('sha1', secret)
  const digest = Buffer.from(
    'sha1=' + hmac.update(payload).digest('hex'),
    'utf8'
  )
  const checksum = Buffer.from(sig, 'utf8')
  if (
    checksum.length !== digest.length ||
    !crypto.timingSafeEqual(digest, checksum)
  ) {
    throw new Error(
      `Request body digest (${digest}) did not match ${'x-hub-signature'} (${checksum})`
    )
  }
}

export async function handle(req: Request, res: Response): Promise<void> {
  try {
    console.log('verifying...')
    await verify(req)
    console.log('verified')
  } catch {
    res.status(400).send('invalid')
    return
  }

  try {
    const json = req.body
    const eventName = req.get('x-github-event') as string
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
