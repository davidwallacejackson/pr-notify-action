import * as core from '@actions/core'
import {
  WebhookContext,
  PullRequestPayload,
  ReviewPayload,
  CommentPayload,
  Message
} from './types'
import sendMessages from './slack'

const link = (url: string, text: string) => `<${url}|${text}>`

export default async function handleEvent(
  context: WebhookContext
): Promise<void> {
  console.log('handling event: ', context.eventName)
  console.log(JSON.stringify(context))
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
    console.log('sending messages')
    console.log(JSON.stringify(messages))
    await sendMessages(messages)
  }
}

async function handlePREvent(payload: PullRequestPayload): Promise<Message[]> {
  console.log('handling PR')
  if (payload.action !== 'assigned') {
    return []
  }

  const pr = payload.pull_request

  return payload.pull_request.assignees.map(user => ({
    githubUsername: user.login,
    body: `${pr.user.login} requested your review on a PR: ${link(
      pr.html_url,
      pr.title
    )}`
  }))
}

async function handleReviewEvent(payload: ReviewPayload): Promise<Message[]> {
  console.log('handling review')
  if (payload.action !== 'submitted') {
    return []
  }

  const pr = payload.pull_request
  const review = payload.review
  let actionText: string

  switch (payload.review.state) {
    case 'approved':
      actionText = 'approved'
      break
    case 'changes_requested':
      actionText = 'requested changes to'
      break
    case 'commented':
      actionText = 'commented on'
  }

  return [
    {
      githubUsername: pr.user.login,
      body: `${review.user.login} ${link(
        review.html_url,
        actionText
      )} your PR: ${link(pr.html_url, pr.title)}`
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
  const pr = payload.pull_request
  const comment = payload.comment
  const recipients = [pr.user, ...payload.pull_request.assignees].filter(
    user => user.login !== comment.user.login
  )

  return recipients.map(user => ({
    githubUsername: user.login,
    body: `${comment.user.login} ${link(
      comment.html_url,
      'commented on'
    )} ${link(pr.html_url, pr.title)}: ${payload.comment.body}`
  }))
}
