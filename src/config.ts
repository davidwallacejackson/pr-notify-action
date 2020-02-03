import {Config} from './types'

const usersError = '`users` must be a JSON string'

export default async function getConfig(): Promise<Config> {
  const usersString = process.env['PR_NOTIFY_USERS']

  if (!usersString || typeof usersString !== 'string') {
    throw new Error(usersError)
  }

  const slackToken = process.env['PR_NOTIFY_SLACK_TOKEN']

  if (slackToken === '' || typeof slackToken !== 'string') {
    throw new Error('PR_NOTIFY_SLACK_TOKEN must be set')
  }

  const secret = process.env['PR_NOTIFY_SECRET']
  if (secret === '' || typeof secret !== 'string') {
    throw new Error('PR_NOTIFY_SECRET must be set')
  }

  const gitHubToken = process.env['PR_NOTIFY_GITHUB_TOKEN']
  if (gitHubToken === '' || typeof gitHubToken !== 'string') {
    throw new Error('PR_NOTIFY_GITHUB_TOKEN must be set')
  }

  let blacklist

  try {
    blacklist = JSON.parse(process.env['PR_NOTIFY_BLACKLIST'] as string)
  } catch {
    blacklist = []
  }

  try {
    return {
      users: JSON.parse(usersString),
      slackToken,
      secret,
      gitHubToken,
      blacklist
    }
  } catch {
    throw new Error(usersError)
  }
}
