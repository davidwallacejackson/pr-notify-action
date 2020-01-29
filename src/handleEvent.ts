import * as core from '@actions/core'
import {
  WebhookContext,
  PullRequestPayload,
  ReviewPayload,
  CommentPayload,
  Message
} from './types'
import sendMessages from './slack'

export default async function handleEvent(
  context: WebhookContext
): Promise<void> {
  console.log('handling event: ', context.eventName)
  console.debug(context)
  let messages: Message[] = []

  switch (context.eventName) {
    case 'pull_request':
      messages = await handlePREvent(context.payload)
      break
    case 'pull_request_review':
      messages = await handleReviewEvent(context.payload)
      break
    case 'pull_request_review_comment':
      messages = await handleCommentEvent(context.payload)
  }

  if (messages.length > 0) {
    console.log('sending messages', messages)
    await sendMessages(messages)
  }
}

async function handlePREvent(payload: PullRequestPayload): Promise<Message[]> {
  console.log('handling PR')
  if (payload.action !== 'assigned') {
    return []
  }

  const prAuthor = payload.pull_request.user

  return payload.pull_request.assignees.map(user => ({
    githubUsername: user.login,
    body: `${prAuthor.login} requested your review on a PR: ${payload.pull_request.title}`
  }))
}

async function handleReviewEvent(payload: ReviewPayload): Promise<Message[]> {
  console.log('handling review')
  if (payload.action !== 'submitted') {
    return []
  }

  const prAuthor = payload.pull_request.user
  let actionText: string

  switch (payload.review.state) {
    case 'APPROVED':
      actionText = 'approved'
      break
    case 'CHANGES_REQUESTED':
      actionText = 'requested changes to'
      break
    case 'COMMENTED':
      actionText = 'commented on'
  }

  return [
    {
      githubUsername: prAuthor.login,
      body: `${payload.review.user.login} ${actionText} your PR: ${payload.pull_request.title}`
    }
  ]
}

async function handleCommentEvent(payload: CommentPayload): Promise<Message[]> {
  console.log('handling comment')
  if (payload.action !== 'created') {
    return []
  }

  // send the message to all requested reviewers, plus the PR author
  // (but NOT to whomever wrote the comment)
  const prAuthor = payload.pull_request.user
  const commentAuthor = payload.comment.user
  const recipients = [prAuthor, ...payload.pull_request.assignees].filter(
    user => user.login !== commentAuthor.login
  )

  return recipients.map(user => ({
    githubUsername: user.login,
    body: `${commentAuthor.login} commented on ${payload.pull_request.title}: ${payload.comment.body}`
  }))
}
