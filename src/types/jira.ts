export type EventPayload = IssueUpdatedPayload | IssueCommentEventPayload
export type IssueUpdatedPayload = {
  webhookEvent: 'jira:issue_updated'
  user: PartialUser
  issue: PartialIssue
  changelog: {
    id: string
    items: {
      field: string
      from: string | null
      to: string | null
    }[]
  }
}

export type IssueCommentEventPayload = {
  webhookEvent: 'comment_created'
  issue: PartialIssue
  comment: IssueComment
}

export type User = {
  self: string
  accountId: string
  displayName: string
  emailAddress: string
}

export type Issue = {
  id: string
  key: string
  self: string
  fields: {
    summary: string
  }
}

export type IssueComment = {
  self: string
  author: {
    self: string
    accountId: string
  }
  updateAuthor: {
    self: string
    accountId: string
  }
  body: string
}

export type WatchersPayload = {
  self: string
  isWatching: boolean
  watchCounts: number
  watchers: {
    self: string
    accountId: string

    // this parameter is not documented, but does show up if
    // the user has a visible email
    emailAddress?: string

    displayName: string
    active: boolean
  }[]
}

// sometimes the webhook doesn't send all of a resource, depending on the event
// it's safer to assume only the minimum, and fetch the full resource from the
// API
export type PartialIssue = {
  self: string
  key: string
}

export type PartialUser = {
  self: string
  accountId: string
}
