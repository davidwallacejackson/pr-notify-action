export type EventPayload = IssueEventPayload | IssueCommentEventPayload
export type IssueEventPayload = {
  webhookEvent: 'jira:issue_created' | 'jira:issue_updated'
  user: PartialUser
  issue: PartialIssue
}

export type IssueCommentEventPayload = {
  webhookEvent: 'comment_created'
  issue: PartialIssue
  comment: IssueComment
}

export type User = {
  key: string
  name: string
  displayName: string
  emailAddress: string
}

export type Issue = {
  id: string
  key: string
  self: string
  fields: {
    watches: {
      self: string
    }
    summary: string
  }
  worklog: {
    author: {
      self: string
      name: string
    }
    updateAuthor: {
      self: string
      name: string
    }
  }[]
}

export type IssueComment = {
  author: {
    self: string
    accountId: string
    displayName: string
  }
  updateAuthor: {
    self: string
    accountId: string
    displayName: string
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

    // this parameter is not documented, but does show up
    emailAddress: string

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
