import { GitHub } from './types'
import {uniqBy} from 'lodash'
import getConfig from './config'
import fetch from 'node-fetch'

export async function gitHubAPI(url: string) {
  const {gitHubToken} = await getConfig()
  const resp = await fetch(url, {
    headers: {
      Authorization: `token ${gitHubToken}`
    }
  })

  return resp.json()
}

async function getComments(pr: GitHub.PullRequest): Promise<GitHub.GitHubComment[]> {
return (await gitHubAPI(`${pr.url}/comments`)) as GitHub.GitHubComment[]
}
async function getReviews(pr: GitHub.PullRequest): Promise<GitHub.PullRequestReview[]> {
  return (await gitHubAPI(`${pr.url}/reviews`)) as GitHub.PullRequestReview[]
}
export async function getInvolvedUsers(pr: GitHub.PullRequest) {
  const [comments, reviews] = await Promise.all([
    getComments(pr),
    getReviews(pr)
  ])

  const commentUsers = comments.map(comment => comment.user)
  const reviewUsers = reviews.map(review => review.user)

  return uniqBy(
    [pr.user, ...pr.requested_reviewers, ...commentUsers, ...reviewUsers],
    user => user.login
  )
}
