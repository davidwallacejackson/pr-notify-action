export type WebhookContext =
  | {
      eventName: 'pull_request_review_comment'
      payload: CommentPayload
    }
  | {
      eventName: 'pull_request'
      payload: PullRequestPayload
    }
  | {
      eventName: 'pull_request_review'
      payload: ReviewPayload
    }
  | {
      eventName: string
      payload: any
    }

export type CommentPayload = {
  action: 'created' | string
  pull_request: PullRequest
  comment: GitHubComment
}

export type PullRequestPayload = {
  action: 'review_requested' | string
  pull_request: PullRequest
}

export type ReviewPayload = {
  action: 'submitted' | string
  pull_request: PullRequest
  review: PullRequestReview
}

export type Message = {
  githubUsername: string
  body: string
}

export type SlackUser = {
  id: string
  name: string
  real_name: string
}

export type PullRequest = {
  url: string
  html_url: string
  user: GitHubUser
  title: string
  assignees: GitHubUser[]
}

export type PullRequestReview = {
  body: string
  html_url: string
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED'
  user: GitHubUser
}

export type GitHubUser = {
  login: string
}

export type GitHubComment = {
  url: string
  html_url: string
  body: string
  user: GitHubUser
}

export type Config = {
  users: {[githubUsername: string]: string}
  slackToken: string
  secret: string
}
