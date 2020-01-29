import * as core from '@actions/core'

import {WebClient} from '@slack/web-api'

import {Message, SlackUser} from './types'
import getConfig from './config'

export default async function sendMessages(messages: Message[]): Promise<void> {
  const {users, slackToken} = await getConfig()
  const web = new WebClient(slackToken)

  const sends = messages.map(async message => {
    const userEmail = users[message.githubUsername]

    if (!userEmail) {
      return null
    }

    const slackUser = ((
      await web.users.lookupByEmail({
        email: userEmail
      })
    ).user as unknown) as SlackUser

    return await web.chat.postMessage({
      channel: slackUser.id,
      text: message.body
    })
  })

  await Promise.all(sends)

  return
}
