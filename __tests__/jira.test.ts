import sinon, {SinonFakeServer} from 'sinon'
import nock from 'nock'

const users: {[name: string]: GitHub.User} = {
  foo: {login: 'foo'},
  bar: {login: 'bar'},
  baz: {login: 'baz'},
  quux: {login: 'quux'}
}

const fakePR: GitHub.PullRequest = {
  id: 1,
  url: 'http://api.github.com/repo/pulls/1234',
  html_url: 'http://github.com/repo/pulls/1234',
  user: users.foo,
  title: 'Fake PR',
  requested_reviewers: [users.bar, users.baz]
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
      blacklist: ['quux']
    })
}))

import {assert} from 'chai'

import {GitHub, Message, WebhookContext} from '../src/types'
import { handleEvent } from '../src/github'

// mock the calls needed for getInvolvedUsers
// call .done() on the returned scope to assert the two calls were made
const mockGitHubCalls = () => {
  const fakeCommentsOrReviews = [{user: users.bar}, {user: users.baz}]
  return nock('http://api.github.com')
    .get(/comments$/)
    .reply(200, fakeCommentsOrReviews)
    .get(/reviews$/)
    .reply(200, fakeCommentsOrReviews)
}

beforeEach(() => {
  sendMessagesFake.resetHistory()
})

afterEach(() => {
  nock
})

test('sends messages when a review is requested', async () => {
  await handleEvent({
    eventName: 'pull_request',
    payload: {
      action: 'review_requested',
      pull_request: fakePR,
      requested_reviewer: users.bar
    }
  })

  assert.isTrue(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]

  assert.strictEqual(messages[0].githubUsername, 'bar')
  console.log(messages[0])
  assert.include(messages[0].body, 'foo requested your review')

  // note that baz does *not* get a notification, even though he's
  // listed as a requested reviewer on the PR -- because he's not
  // the reviewer who's being "added" on this payload
})
