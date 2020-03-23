import {Request, Response, NextFunction} from 'express'
import {Message, Jira} from '../types'
import sendMessages from '../slack'
import {link} from '../util'
import {getJiraBaseURL, getIssueWatchers, getUser, getFullIssue} from './api'

export default async function handleJiraWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await handleEvent(req.body as Jira.EventPayload)
    res.status(200).send()
  } catch (error) {
    next(error)
  }
}

export async function handleEvent(json: Jira.EventPayload) {
  console.log('handling event: ', json.webhookEvent)
  console.log(JSON.stringify(json))

  let messages: Message[] = []
  switch (json.webhookEvent) {
    case 'comment_created':
      messages = await handleCommentCreatedEvent(json)
      break
    case 'jira:issue_updated':
      messages = await handleIssueUpdatedEvent(json)
      break
    default:
      // we don't have types for the other kinds of events, so TS doesn't
      // know about them -- but we'd still like to log them
      console.log(`unhandled Jira event: ${(json as any).webhookEvent}`)
  }

  if (messages.length > 0) {
    console.log('sending messages')
    console.log(JSON.stringify(messages))
    await sendMessages(messages)
  }
}

async function handleCommentCreatedEvent(json: Jira.IssueCommentEventPayload) {
  console.log('handling comment created')
  const [watchersPayload, fullIssue, author] = await Promise.all([
    getIssueWatchers(json.issue),
    getFullIssue(json.issue),
    getUser(getJiraBaseURL(json.issue.self), json.comment.author.accountId)
  ])
  const recipients = watchersPayload.watchers
    .map(watcher => watcher.emailAddress)
    .filter(email => email !== author.emailAddress)

  const viewURL = getIssueViewURL(json.issue)

  return recipients.map(email => ({
    email,
    githubUsername: null,
    body: `${author.name} commented on Jira issue: ${link(
      viewURL,
      fullIssue.fields.summary
    )}: ${json.comment.body}`
  }))
}

async function handleIssueUpdatedEvent(json: Jira.IssueUpdatedPayload) {
  const [watchersPayload, fullIssue, updatingUser] = await Promise.all([
    getIssueWatchers(json.issue),
    getFullIssue(json.issue),
    getUser(getJiraBaseURL(json.issue.self), json.user.accountId)
  ])

  const messages: Message[] = []

  for (const change of json.changelog.items) {
    if (change.field === 'assignee' && change.to) {
      const assignee = await getUser(getJiraBaseURL(json.issue.self), change.to)

      if (assignee.emailAddress === updatingUser.emailAddress) {
        // don't send users notifications when they assign themselves
        continue
      }

      const viewURL = getIssueViewURL(json.issue)

      messages.push({
        email: assignee.emailAddress,
        githubUsername: null,
        body: `${updatingUser.name} assigned you to Jira issue: ${link(
          viewURL,
          fullIssue.fields.summary
        )}`
      })
    }
  }

  return messages
}

function getIssueViewURL(issue: Jira.PartialIssue) {
  return `${getJiraBaseURL(issue.self)}/browse/issue/${issue.key}`
}
