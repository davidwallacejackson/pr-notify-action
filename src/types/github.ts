export type CommentPayload = {
  action: 'created' | string
  pull_request: PullRequest
  comment: GitHubComment
}

export type PullRequestPayload = {
  action: 'review_requested' | 'assigned'
  pull_request: PullRequest
  requested_reviewer?: GitHubUser
}

export type ReviewPayload = {
  action: 'submitted' | string
  pull_request: PullRequest
  review: PullRequestReview
}

export type PullRequest = {
  id: number
  url: string
  html_url: string
  user: GitHubUser
  title: string
  requested_reviewers: GitHubUser[]
}

export type PullRequestReview = {
  body: string
  html_url: string
  state: 'approved' | 'changes_requested' | 'commented'
  user: GitHubUser
}

export type GitHubUser = {
  login: string
}

export type GitHubComment = {
  id: number
  url: string
  html_url: string
  body: string
  user: GitHubUser
}

export type GitHubWebhookContext = {
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