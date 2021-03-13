import {WebClient} from '@slack/web-api'

import {Message, SlackUser} from './types'
import getConfig from './config'
import * as log from './log'

export default async function sendMessages(messages: Message[]): Promise<void> {
  const {users, slackToken} = await getConfig()
  const web = new WebClient(slackToken)

  const sends = messages.map(async message => {
    const userEmail = message.email
      ? message.email
      : users[message.githubUsername as string]

    if (!userEmail) {
      return null
    }

    const slackUser = ((
      await web.users.lookupByEmail({
        email: userEmail
      })
    ).user as unknown) as SlackUser

    // special for john
    if (message.githubUsername?.toLowerCase() === 'xyzrr') {
      web.chat.postMessage({
        channel: 'C017GKF1FUY',
        text: message.body,
        mrkdwn: true
      })
    }

    log.debug({
      sendingToSlackID: slackUser.id,
      message: message.body
    })
    return await web.chat.postMessage({
      channel: slackUser.id,
      text: message.body,
      mrkdwn: true
    })
  })

  await Promise.all(sends)

  return
}
