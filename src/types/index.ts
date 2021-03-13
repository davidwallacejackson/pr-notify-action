import { GitHubWebhookContext } from './github';

export * as GitHub from './github';

export type WebhookContext =
  | GitHubWebhookContext
  | {
      eventName: string
      payload: any
    }

export type Message = {
  githubUsername: string
  email: null
  body: string
} | {
  githubUsername: null
  email: string
  body: string
}

export type SlackUser = {
  id: string
  name: string
  real_name: string
}

export type Config = {
  users: {[githubUsername: string]: string}
  slackToken: string
  gitHubToken: string
  secret: string
  blacklist: string[]
}
