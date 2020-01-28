import * as core from '@actions/core'
import {wait} from './wait'
import {Toolkit} from 'actions-toolkit'
import {
  WebhookContext,
  PullRequestPayload,
  ReviewPayload,
  CommentPayload
} from './types'

async function run(): Promise<void> {
  try {
    const tools = new Toolkit()

    const context = (tools.context as unknown) as WebhookContext
    let messages: Message[] = []

    switch (context.event) {
      case 'pull_request':
        messages = await handlePREvent(context.payload)
        break
      case 'pull_request_review':
        messages = await handleReviewEvent(context.payload)
        break
      case 'pull_request_review_comment':
        messages = await handleCommentEvent(context.payload)
    }

    const ms: string = core.getInput('milliseconds')
    core.debug(`Waiting ${ms} milliseconds ...`)

    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    core.setFailed(error.message)
  }
}

type Message = {
  githubUsername: string
  body: string
}

async function handlePREvent(payload: PullRequestPayload): Promise<Message[]> {
  if (payload.action !== 'review_requested') {
    return []
  }

  const prAuthor = payload.pull_request.user

  return payload.pull_request.requested_reviewers.map(user => ({
    githubUsername: user.login,
    body: `${prAuthor.login} has requested your review on a PR: ${payload.pull_request.title}`
  }))
}

async function handleReviewEvent(payload: ReviewPayload): Promise<Message[]> {
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
      body: `${payload.review.user.login} has ${actionText} your PR: ${payload.pull_request.title}`
    }
  ]
}

async function handleCommentEvent(payload: CommentPayload): Promise<Message[]> {
  if (payload.action !== 'created') {
    return []
  }

  // send the message to all requested reviewers, plus the PR author
  // (but NOT to whomever wrote the comment)
  const prAuthor = payload.pull_request.user
  const commentAuthor = payload.comment.user
  const recipients = [
    prAuthor,
    ...payload.pull_request.requested_reviewers
  ].filter(user => user.login !== commentAuthor.login)

  return recipients.map(user => ({
    githubUsername: user.login,
    body: `${commentAuthor.login} commented on ${payload.pull_request.title}: ${payload.comment.body}`
  }))
}

run()
