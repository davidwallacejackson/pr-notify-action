import sinon from 'sinon'

const users: {[name: string]: GitHubUser} = {
  foo: {login: 'foo'},
  bar: {login: 'bar'},
  baz: {login: 'baz'}
}

const fakePR: PullRequest = {
  url: '',
  html_url: 'github.com/repo/pulls/1234',
  user: users.foo,
  title: 'Fake PR',
  requested_reviewers: [users.bar, users.baz]
}

const sendMessagesFake = sinon.fake.returns(Promise.resolve(null))
jest.mock('../src/slack', () => ({
  __esModule: true,
  default: sendMessagesFake
}))

jest.mock('../src/inputs', () => ({
  __esModule: true,
  default: () =>
    Promise.resolve({
      users: {
        foo: 'foo@email.com',
        bar: 'bar@email.com',
        baz: 'baz@email.com'
      },
      slackToken: 'SLACK_TOKEN'
    })
}))

import {assert} from 'chai'

import {PullRequest, GitHubUser, Message, WebhookContext} from '../src/types'
import handleEvent from '../src/handleEvent'

beforeEach(() => {
  sendMessagesFake.resetHistory()
})

test('sends messages when a PR is created', async () => {
  const context = {
    eventName: 'pull_request',
    payload: {
      action: 'created',
      pull_request: fakePR
    }
  } as WebhookContext

  await handleEvent(context)

  assert.ok(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]
  console.log(messages)

  assert.strictEqual(messages[0].githubUsername, 'bar')
  assert.include(messages[0].body, 'foo has requested your review')

  assert.strictEqual(messages[1].githubUsername, 'baz')
  assert.include(messages[1].body, 'foo has requested your review')
})
