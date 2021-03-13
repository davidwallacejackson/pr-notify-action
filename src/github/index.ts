import crypto from 'crypto'
import {Request, Response} from 'express'
import {uniqBy} from 'lodash'

import {GitHub, WebhookContext, Message} from '../types'
import {link} from '../util'
import getConfig from '../config'
import {getInvolvedUsers, getIssuePullRequest} from './api'
import sendMessages from '../slack'
import * as log from '../log'

async function verify(req: Request) {
  const {secret} = await getConfig()
  if (req.method.toLowerCase() !== 'post') {
    throw new Error('must be POST')
  }

  const payload = JSON.stringify(req.body)
  if (!payload) {
    throw new Error('Request body empty')
  }

  const sig = req.get('x-hub-signature') || ''
  const hmac = crypto.createHmac('sha1', secret)
  const digest = Buffer.from(
    'sha1=' + hmac.update(payload).digest('hex'),
    'utf8'
  )
  const checksum = Buffer.from(sig, 'utf8')
  if (
    checksum.length !== digest.length ||
    !crypto.timingSafeEqual(digest, checksum)
  ) {
    throw new Error(
      `Request body digest (${digest}) did not match x-hub-signature (${checksum})`
    )
  }
}

export default async function handleGitHubWebhook(
  req: Request,
  res: Response
): Promise<void> {
  try {
    log.debug('verifying...')
    await verify(req)
    log.debug('verified')
  } catch {
    log.error('invalid request')
    res.status(400).send('invalid')
    return
  }

  try {
    const json = req.body
    const eventName = req.get('x-github-event') as string
    const context = {
      eventName,
      payload: json
    }
    await handleEvent(context)
    res.send('ok')
  } catch (error) {
    log.error(`server error: ${error.toString()}`)
    res.status(500).send('not ok')
  }
}

export async function handleEvent(context: WebhookContext): Promise<void> {
  log.info(`handling event: ${context.eventName}`)
  log.debug(context)
  let messages: Message[] = []

  switch (context.eventName) {
    case 'pull_request':
      messages = await handlePREvent(context.payload)
      break
    case 'pull_request_review':
      messages = await handleReviewEvent(context.payload)
      break
    case 'pull_request_review_comment':
      messages = await handlePullRequestReviewCommentEvent(context.payload)
      break
    case 'issue_comment':
      messages = await handleIssueCommentEvent(context.payload)
      break
    case 'commit_comment':
      log.info('commit comment received')
      break
    default:
      log.info(`unhandled GitHub event: ${context.eventName}`)
  }

  if (messages.length > 0) {
    log.info({sendingMessages: messages})
    await sendMessages(messages)
  }
}

async function handlePREvent(
  payload: GitHub.PullRequestPayload
): Promise<Message[]> {
  if (payload.action !== 'review_requested') {
    return []
  }

  // only notify people who were added on this specific event
  const requestedReviewer = payload.requested_reviewer

  if (!requestedReviewer) {
    throw new Error('requested reviewer not found on review request event')
  }
  const pr = payload.pull_request

  return [
    {
      githubUsername: requestedReviewer.login,
      email: null,
      body: `${pr.user.login} requested your review on a PR: ${link(
        pr.html_url,
        pr.title
      )}`
    }
  ]
}

async function handleReviewEvent(
  payload: GitHub.ReviewPayload
): Promise<Message[]> {
  log.info('handling review')
  if (payload.action !== 'submitted') {
    return []
  }

  const pr = payload.pull_request
  const review = payload.review

  const {blacklist} = await getConfig()

  if (blacklist.includes(review.user.login)) {
    log.info(
      `${review.user.login} is blacklisted -- not sending a notification`
    )
    return []
  }

  let recipients: GitHub.User[] = []
  let actionText: string

  switch (payload.review.state) {
    case 'approved':
      actionText = 'approved'

      // only the PR author needs to hear about approvals
      recipients = [pr.user]
      break
    case 'changes_requested':
      actionText = 'requested changes to'
      recipients = await getInvolvedUsers(pr)
      break
    case 'commented':
      actionText = 'commented on'

      // individual comments trigger one of these with an empty body,
      // resulting in redundant messages
      if (!!payload.review.body) {
        recipients = await getInvolvedUsers(pr)
      }
  }

  // never send a review notification to the author of the review
  recipients = recipients.filter(user => user.login !== review.user.login)

  // only ever send one message to a user at a time
  recipients = uniqBy(recipients, user => user.login)

  return recipients.map(recipient => {
    const aOrYour = recipient.login === pr.user.login ? 'your' : 'a'

    return {
      githubUsername: recipient.login,
      email: null,
      body: `${review.user.login} ${link(
        review.html_url,
        actionText
      )} ${aOrYour} PR: ${link(pr.html_url, pr.title)}`
    }
  })
}

async function handlePullRequestReviewCommentEvent(
  payload: GitHub.PullRequestReviewCommentPayload
): Promise<Message[]> {
  log.info('handling comment')
  if (payload.action !== 'created') {
    return []
  }

  // send the message to all requested reviewers, plus the PR author
  // (but NOT to whomever wrote the comment)
  const pr = payload.pull_request
  const comment = payload.comment

  const {blacklist} = await getConfig()

  if (blacklist.includes(comment.user.login)) {
    log.info(
      `${comment.user.login} is blacklisted -- not sending a notification`
    )
    return []
  }

  const recipients = (await getInvolvedUsers(pr)).filter(
    user => user.login !== comment.user.login
  )

  return recipients.map(user => ({
    githubUsername: user.login,
    email: null,
    body: `${comment.user.login} ${link(
      comment.html_url,
      'commented on'
    )} ${link(pr.html_url, pr.title)}: ${payload.comment.body}`
  }))
}

async function handleIssueCommentEvent(
  payload: GitHub.IssueCommentPayload
): Promise<Message[]> {
  log.info('handling comment')
  if (payload.action !== 'created') {
    return []
  }

  // send the message to all requested reviewers, plus the PR author
  // (but NOT to whomever wrote the comment)
  const pr = await getIssuePullRequest(payload.issue)

  if (!pr) {
    // we got a comment for an issue that isn't a PR. ignore it.
    return []
  }

  const comment = payload.comment

  const {blacklist} = await getConfig()

  if (blacklist.includes(comment.user.login)) {
    log.info(
      `${comment.user.login} is blacklisted -- not sending a notification`
    )
    return []
  }

  const recipients = (await getInvolvedUsers(pr)).filter(
    user => user.login !== comment.user.login
  )

  return recipients.map(user => ({
    githubUsername: user.login,
    email: null,
    body: `${comment.user.login} ${link(
      comment.html_url,
      'commented on'
    )} ${link(pr.html_url, pr.title)}: ${payload.comment.body}`
  }))
}
