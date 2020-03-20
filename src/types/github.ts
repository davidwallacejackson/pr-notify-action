export type PullRequestReviewCommentPayload = {
  action: 'created' | string
  pull_request: PullRequest
  comment: Comment
}

export type PullRequestPayload = {
  action: 'review_requested' | 'assigned'
  pull_request: PullRequest
  requested_reviewer?: User
}

export type ReviewPayload = {
  action: 'submitted' | string
  pull_request: PullRequest
  review: PullRequestReview
}

export type IssueCommentPayload = {
  action: 'created' | string
  issue: Issue
  comment: Comment
}

export type PullRequest = {
  id: number
  url: string
  html_url: string
  user: User
  title: string
  requested_reviewers: User[]
}

export type PullRequestReview = {
  body: string
  html_url: string
  state: 'approved' | 'changes_requested' | 'commented'
  user: User
}

export type User = {
  login: string
}

export type Comment = {
  id: number
  url: string
  html_url: string
  body: string
  user: User
}

export type Issue = {
  id: number
  url: string
  html_url: string
  pull_request?: {
    url: string
    html_url: string
  }
}

export type GitHubWebhookContext = {
  eventName: 'pull_request_review_comment'
  payload: PullRequestReviewCommentPayload
}
| {
  eventName: 'pull_request'
  payload: PullRequestPayload
}
| {
  eventName: 'pull_request_review'
  payload: ReviewPayload
} | {
  eventName: 'issue_comment'
  payload: IssueCommentPayload
}