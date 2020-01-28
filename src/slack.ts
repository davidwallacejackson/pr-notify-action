import * as core from '@actions/core'

import {WebClient} from '@slack/web-api'

import {Message, SlackUser} from './types'
import getInputs from './inputs'

export default async function sendMessages(messages: Message[]): Promise<void> {
  const token = core.getInput('slackToken')
  const web = new WebClient(token)
  const users = (await getInputs()).users

  const sends = messages.map(async message => {
    const userEmail = users[message.githubUsername]

    if (!userEmail) {
      return null
    }

    const slackUser = ((await web.users.lookupByEmail({
      email: userEmail
    })) as unknown) as SlackUser

    return await web.chat.postMessage({
      channel: slackUser.id,
      text: message.body
    })
  })

  await Promise.all(sends)

  return
}
