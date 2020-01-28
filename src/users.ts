import {Toolkit} from 'actions-toolkit'

const errorMessage = '`users` must be a JSON string'

export default async function getUsers(): Promise<{
  [username: string]: string
}> {
  const tools = new Toolkit()

  const usersString = tools.config('prnotify').users

  if (!usersString || typeof usersString !== 'string') {
    throw new Error(errorMessage)
  }

  try {
    return JSON.parse(usersString)
  } catch {
    throw new Error(errorMessage)
  }
}
