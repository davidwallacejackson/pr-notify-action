import * as core from '@actions/core'
import * as github from '@actions/github'
import handleEvent from './handleEvent'
import {WebhookContext} from './types'

export default async function run(): Promise<void> {
  try {
    core.debug(`event received: ${github.context.eventName}`)
    core.debug(JSON.stringify(github.context))
    await handleEvent((github.context as unknown) as WebhookContext)
    return
  } catch (error) {
    core.setFailed(error.message)
  }
}
