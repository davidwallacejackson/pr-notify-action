export type IssueEventPayload = {
  webhookEvent:
    | 'jira:issue_created'
    | 'jira:issue_updated'
    | 'comment_created'
    | string
  user: User
  issue: Issue
  comment: IssueComment
}

export type User = {
  key: string
  name: string
  emailAddress: string
}

export type Issue = {
  id: string
  key: string
  summary: string
  self: string
  fields: {
    watches: {
      self: string
    }
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
    name: string
    emailAddress: string
  }
  updateAuthor: {
    self: string
    name: string
    emailAddress: string
  }
}

export type WatchersPayload = {
  self: string
  isWatching: boolean
  watchCounts: number
  watchers: {
    self: string

    // this parameter is not documented, but does show up
    email: string

    displayName: string
    active: boolean
  }[]
}
