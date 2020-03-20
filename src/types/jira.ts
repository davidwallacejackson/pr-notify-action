type IssueEventPayload = {
  event: string,
  user: User,
  issue: Issue,
  comment: IssueComment,
}

type User = {
  key: string,
  name: string,
  emailAddress: string,
}

type Issue = {
  id: string,
  key: string,
  worklog: {
    author: {
      self: string,
      name: string
    },
    updateAuthor: {
      self: string,
      name: string
    }
  }[]
}

type IssueComment = {
  author: {
    self: string,
    name: string,
    emailAddress: string
  },
  updateAuthor: {
    self: string,
    name: string,
    emailAddress: string
  }
}