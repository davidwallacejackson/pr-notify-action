import {Request, Response} from 'express'
import {Message, Jira} from '../types'
import sendMessages from '../slack'
import {link} from '../util'
import {getJiraBaseURL, getIssueWatchers} from './api'

export default async function handleJiraWebhook(
  req: Request,
  res: Response
): Promise<void> {
  const json = req.body as Jira.IssueEventPayload

  try {
    await handleEvent(json)
  } catch (error) {
    console.error('server error: ', error.toString())
    res.status(500).send('not ok')
  }

  res.status(200).send()
}

export async function handleEvent(json: Jira.IssueEventPayload) {
  let messages: Message[] = []
  switch (json.webhookEvent) {
    case 'jira:issue_created':
      messages = await handleIssueCreatedEvent(json)
    default:
      console.log(`unhandled Jira event: ${json.webhookEvent}`)
  }

  if (messages.length > 0) {
    console.log('sending messages')
    console.log(JSON.stringify(messages))
    await sendMessages(messages)
  }
}

async function handleIssueCreatedEvent(json: Jira.IssueEventPayload) {
  const watchersPayload = await getIssueWatchers(json.issue)
  const recipients = watchersPayload.watchers
    .map(partialUser => partialUser.email)
    .filter(email => email !== json.user.key)

  const viewURL = getIssueViewURL(json.issue)

  return recipients.map(email => ({
    email,
    body: `${json.user.name} created a Jira issue: ${link(
      viewURL,
      json.issue.summary
    )}`
  }))
}

function getIssueViewURL(issue: Jira.Issue) {
  return `${getJiraBaseURL(issue.self)}/browse/issue/${issue.key}`
}
