import {Request, Response, NextFunction} from 'express'
import {Message, Jira} from '../types'
import sendMessages from '../slack'
import {link} from '../util'
import {getJiraBaseURL, getIssueWatchers, getUser, getFullIssue} from './api'
import {IssueCommentEventPayload} from '../types/jira'

export default async function handleJiraWebhook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const json = req.body as Jira.EventPayload
    let messages: Message[] = []
    switch (json.webhookEvent) {
      case 'jira:issue_created':
        messages = await handleIssueCreatedEvent(json)
        break
      case 'comment_created':
        messages = await handleCommentCreatedEvent(json)
        break
      default:
        console.log(`unhandled Jira event: ${json.webhookEvent}`)
    }

    console.log('passed switch')
    if (messages.length > 0) {
      console.log('sending messages')
      console.log(JSON.stringify(messages))
      await sendMessages(messages)
    }
    res.status(200).send()
  } catch (error) {
    next(error)
  }
}

async function handleIssueCreatedEvent(json: Jira.IssueEventPayload) {
  console.log('handling issue created')
  const [watchersPayload, fullIssue, creator] = await Promise.all([
    getIssueWatchers(json.issue),
    getFullIssue(json.issue),
    getUser(json.user.self)
  ])

  const recipients = watchersPayload.watchers
    .map(watcher => watcher.emailAddress)
    .filter(email => email !== creator.emailAddress)

  const viewURL = getIssueViewURL(json.issue)

  return recipients.map(email => ({
    email,
    body: `${creator.name} created a Jira issue: ${link(
      viewURL,
      fullIssue.fields.summary
    )}`
  }))
}

async function handleCommentCreatedEvent(json: IssueCommentEventPayload) {
  console.log('handling comment created')
  const [watchersPayload, fullIssue, author] = await Promise.all([
    getIssueWatchers(json.issue),
    getFullIssue(json.issue),
    getUser(json.comment.author.self)
  ])
  const recipients = watchersPayload.watchers
    .map(watcher => watcher.emailAddress)
    .filter(email => email !== author.emailAddress)

  const viewURL = getIssueViewURL(json.issue)

  return recipients.map(email => ({
    email,
    body: `${author.displayName} commented on Jira issue: ${link(
      viewURL,
      fullIssue.fields.summary
    )}: ${json.comment.body}`
  }))
}

function getIssueViewURL(issue: Jira.PartialIssue) {
  return `${getJiraBaseURL(issue.self)}/browse/issue/${issue.key}`
}
