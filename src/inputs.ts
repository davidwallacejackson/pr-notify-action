import * as core from '@actions/core'
import {ActionInputs} from './types'

const usersError = '`users` must be a JSON string'

export default async function getInputs(): Promise<ActionInputs> {
  const usersString = core.getInput('users')

  if (!usersString || typeof usersString !== 'string') {
    throw new Error(usersError)
  }

  try {
    return {
      users: JSON.parse(usersString),
      slackToken: core.getInput('slackToken')
    }
  } catch {
    throw new Error(usersError)
  }
}
