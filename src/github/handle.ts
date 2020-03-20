import {GitHub, Message} from '../types'
import {link} from '../util'
import getConfig from '../config'
import {getInvolvedUsers, getIssuePullRequest} from './api'
import {uniqBy} from 'lodash'

export async function handlePREvent(
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
      body: `${pr.user.login} requested your review on a PR: ${link(
        pr.html_url,
        pr.title
      )}`
    }
  ]
}

export async function handleReviewEvent(
  payload: GitHub.ReviewPayload
): Promise<Message[]> {
  console.log('handling review')
  if (payload.action !== 'submitted') {
    return []
  }

  const pr = payload.pull_request
  const review = payload.review

  const {blacklist} = await getConfig()

  if (blacklist.includes(review.user.login)) {
    console.log(
      `${review.user.login} is blacklisted -- not sending a notification`
    )
    return []
  }

  let recipients = []
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
      recipients = await getInvolvedUsers(pr)
  }

  // never send a review notification to the author of the review
  recipients = recipients.filter(user => user.login !== review.user.login)

  // only ever send one message to a user at a time
  recipients = uniqBy(recipients, user => user.login)

  return recipients.map(recipient => {
    const aOrYour = recipient.login === pr.user.login ? 'your' : 'a'

    return {
      githubUsername: recipient.login,
      body: `${review.user.login} ${link(
        review.html_url,
        actionText
      )} ${aOrYour} PR: ${link(pr.html_url, pr.title)}`
    }
  })
}

export async function handlePullRequestReviewCommentEvent(
  payload: GitHub.PullRequestReviewCommentPayload
): Promise<Message[]> {
  console.log('handling comment')
  if (payload.action !== 'created') {
    return []
  }

  // send the message to all requested reviewers, plus the PR author
  // (but NOT to whomever wrote the comment)
  const pr = payload.pull_request
  const comment = payload.comment

  const {blacklist} = await getConfig()

  if (blacklist.includes(comment.user.login)) {
    console.log(
      `${comment.user.login} is blacklisted -- not sending a notification`
    )
    return []
  }

  const recipients = (await getInvolvedUsers(pr)).filter(
    user => user.login !== comment.user.login
  )

  console.log('recipients: ', recipients)
  return recipients.map(user => ({
    githubUsername: user.login,
    body: `${comment.user.login} ${link(
      comment.html_url,
      'commented on'
    )} ${link(pr.html_url, pr.title)}: ${payload.comment.body}`
  }))
}

export async function handleIssueCommentEvent(
  payload: GitHub.IssueCommentPayload
): Promise<Message[]> {
  console.log('handling comment')
  if (payload.action !== 'created') {
    return []
  }

  // send the message to all requested reviewers, plus the PR author
  // (but NOT to whomever wrote the comment)
  const pr = await getIssuePullRequest(payload.issue)

  if (!pr) {
    // we got a comment for an issue that isn't a PR. ignore it.
    return [];
  }

  const comment = payload.comment

  const {blacklist} = await getConfig()

  if (blacklist.includes(comment.user.login)) {
    console.log(
      `${comment.user.login} is blacklisted -- not sending a notification`
    )
    return []
  }

  const recipients = (await getInvolvedUsers(pr)).filter(
    user => user.login !== comment.user.login
  )

  console.log('recipients: ', recipients)
  return recipients.map(user => ({
    githubUsername: user.login,
    body: `${comment.user.login} ${link(
      comment.html_url,
      'commented on'
    )} ${link(pr.html_url, pr.title)}: ${payload.comment.body}`
  }))
}
