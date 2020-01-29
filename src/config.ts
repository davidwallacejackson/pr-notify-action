import {ActionInputs} from './types'

const usersError = '`users` must be a JSON string'

export default async function getConfig(): Promise<ActionInputs> {
  const usersString = process.env['PR_NOTIFY_USERS']

  if (!usersString || typeof usersString !== 'string') {
    throw new Error(usersError)
  }

  const slackToken = process.env['PR_NOTIFY_SLACK_TOKEN']

  if (slackToken === '' || typeof slackToken !== 'string') {
    throw new Error('PR_NOTIFY_SLACK_TOKEN must be set')
  }

  try {
    return {
      users: JSON.parse(usersString),
      slackToken
    }
  } catch {
    throw new Error(usersError)
  }
}
