export type WebhookContext =
  | {
      event: 'pull_request_review_comment'
      payload: CommentPayload
    }
  | {
      event: 'pull_request'
      payload: PullRequestPayload
    }
  | {
      event: 'pull_request_review'
      payload: ReviewPayload
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

type PullRequest = {
  url: string
  html_url: string
  user: GitHubUser
  title: string
  requested_reviewers: GitHubUser[]
}

type PullRequestReview = {
  body: string
  html_url: string
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED'
  user: GitHubUser
}

type GitHubUser = {
  login: string
}

type GitHubComment = {
  url: string
  html_url: string
  body: string
  user: GitHubUser
}
