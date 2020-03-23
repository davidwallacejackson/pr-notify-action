import sinon, {SinonFakeServer} from 'sinon'
import nock from 'nock'

const BASE_API_URL = 'http://wandb.atlassian.net/rest/api/2/'

const fakeUsers: Jira.User[] = [
  {
    self: `${BASE_API_URL}/user?accountId=1`,
    accountId: '1',
    name: 'foo',
    displayName: 'Foo',
    emailAddress: 'foo@email.com'
  },
  {
    self: `${BASE_API_URL}/user?accountId=2`,
    accountId: '2',
    name: 'bar',
    displayName: 'Bar',
    emailAddress: 'bar@email.com'
  }
]

const fakeIssue: Jira.Issue = {
  self: `${BASE_API_URL}/1234`,
  id: '1234',
  key: 'WB-0001',
  fields: {
    summary: 'An issue'
  }
}

const fakeComment: Jira.IssueComment = {
  self: `${BASE_API_URL}/comment/456`,
  author: {
    self: `${BASE_API_URL}/user?accountId=1`,
    accountId: '1'
  },
  updateAuthor: {
    self: `${BASE_API_URL}/user?accountId=1`,
    accountId: '1'
  },
  body: 'looks good'
}

const fakeWatchers: Jira.WatchersPayload = {
  self: `${BASE_API_URL}/issue/1234/watchers`,
  isWatching: true,
  watchCounts: 2,
  watchers: [
    {
      self: fakeUsers[0].self,
      accountId: fakeUsers[0].accountId,
      active: true,
      displayName: fakeUsers[0].displayName,
      emailAddress: fakeUsers[0].emailAddress
    },
    {
      self: fakeUsers[1].self,
      accountId: fakeUsers[1].accountId,
      active: true,
      displayName: fakeUsers[1].displayName,
      emailAddress: fakeUsers[1].emailAddress
    }
  ]
}

const sendMessagesFake = sinon.fake.returns(Promise.resolve(null))
jest.mock('../src/slack', () => ({
  __esModule: true,
  default: sendMessagesFake
}))

nock.disableNetConnect()

jest.mock('../src/config', () => ({
  __esModule: true,
  default: () =>
    Promise.resolve({
      users: {
        foo: 'foo@email.com',
        bar: 'bar@email.com',
        baz: 'baz@email.com'
      },
      slackToken: 'SLACK_TOKEN',
      gitHubToken: 'GITHUB_TOKEN',
      secret: 'secret',
      blacklist: ['quux'],
      jiraUsername: 'jiraUsername',
      jiraToken: 'JIRA_TOKEN'
    })
}))

import {assert} from 'chai'

import {Jira, Message} from '../src/types'
import {handleEvent} from '../src/jira'

const mockJiraCalls = () => {
  return nock('http://wandb.atlassian.net')
    .get(/watchers$/)
    .reply(200, fakeWatchers)
    .get(/issue\/WB-0001$/)
    .reply(200, fakeIssue)
    .get(/user\?accountId=1$/)
    .reply(200, fakeUsers[0])
    .get(/user\?accountId=2$/)
    .reply(200, fakeUsers[1])
}

beforeEach(() => {
  sendMessagesFake.resetHistory()
})

afterEach(() => {
  nock
})

test('sends messages when a comment is left on an issue', async () => {
  const scope = mockJiraCalls()
  await handleEvent({
    webhookEvent: 'comment_created',
    comment: fakeComment,
    issue: fakeIssue
  })

  assert.isTrue(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]

  assert.strictEqual(messages[0].email, 'bar@email.com')
  console.log(messages[0])
  assert.include(messages[0].body, 'foo commented on Jira issue')
})

test('sends a message when a user is assigned to an issue', async () => {
  const scope = mockJiraCalls()
  await handleEvent({
    webhookEvent: 'jira:issue_updated',
    issue: fakeIssue,
    changelog: {
      id: '999',
      items: [
        {
          field: 'assignee',
          from: null,
          to: '2'
        },
        {
          field: 'otherField',
          from: 'some value',
          to: 'some other value'
        }
      ]
    },
    user: {
      self: fakeUsers[0].self,
      accountId: fakeUsers[0].accountId
    }
  })

  assert.isTrue(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]

  assert.strictEqual(messages[0].email, 'bar@email.com')
  console.log(messages[0])
  assert.include(messages[0].body, 'foo assigned you')
})

test('sends no message when a user assigns themself to an issue', async () => {
  const scope = mockJiraCalls()
  await handleEvent({
    webhookEvent: 'jira:issue_updated',
    issue: fakeIssue,
    changelog: {
      id: '999',
      items: [
        {
          field: 'assignee',
          from: null,
          to: '2'
        },
        {
          field: 'otherField',
          from: 'some value',
          to: 'some other value'
        }
      ]
    },
    user: {
      self: fakeUsers[1].self,
      accountId: fakeUsers[1].accountId
    }
  })

  assert.isTrue(sendMessagesFake.notCalled)
})
