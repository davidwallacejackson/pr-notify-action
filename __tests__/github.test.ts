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

test('sends messages when a PR is approved', async () => {
  await handleEvent({
    eventName: 'pull_request_review',
    payload: {
      action: 'submitted',
      pull_request: fakePR,
      review: {
        body: 'Looks good.',
        url: '',
        html_url: 'http://github.com/repo/pulls/1/some-review',
        state: 'approved',
        user: users.bar
      }
    }
  })

  assert.isTrue(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]

  assert.strictEqual(messages.length, 1)
  assert.strictEqual(messages[0].githubUsername, 'foo')
  assert.include(
    messages[0].body,
    'bar <http://github.com/repo/pulls/1/some-review|approved>'
  )
})

test('sends messages when changes are requested', async () => {
  const scope = mockGitHubCalls()
  await handleEvent({
    eventName: 'pull_request_review',
    payload: {
      action: 'submitted',
      pull_request: fakePR,
      review: {
        body: 'Looks good.',
        url: '',
        html_url: 'http://github.com/repo/pulls/1/some-review',
        state: 'changes_requested',
        user: users.bar
      }
    }
  })

  assert.isTrue(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]

  assert.strictEqual(messages.length, 2)
  assert.strictEqual(messages[0].githubUsername, 'foo')
  assert.include(
    messages[0].body,
    'bar <http://github.com/repo/pulls/1/some-review|requested changes to> your PR'
  )
  assert.strictEqual(messages[1].githubUsername, 'baz')
  assert.include(
    messages[1].body,
    'bar <http://github.com/repo/pulls/1/some-review|requested changes to> a PR'
  )
  scope.done()
})

test('sends messages when a review with comment is left', async () => {
  const scope = mockGitHubCalls()
  await handleEvent({
    eventName: 'pull_request_review',
    payload: {
      action: 'submitted',
      pull_request: fakePR,
      review: {
        body: 'Commenting, but not explicitly approving...',
        url: '',
        html_url: 'http://github.com/repo/pulls/1/some-review',
        state: 'commented',
        user: users.bar
      }
    }
  })

  assert.isTrue(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]

  assert.strictEqual(messages.length, 2)
  assert.strictEqual(messages[0].githubUsername, 'foo')
  assert.include(
    messages[0].body,
    'bar <http://github.com/repo/pulls/1/some-review|commented on> your PR'
  )
  assert.strictEqual(messages[1].githubUsername, 'baz')
  assert.include(
    messages[1].body,
    'bar <http://github.com/repo/pulls/1/some-review|commented on> a PR'
  )
  scope.done()
})

test('does not notify the PR author if they review their own PR', async () => {
  const scope = mockGitHubCalls()
  await handleEvent({
    eventName: 'pull_request_review',
    payload: {
      action: 'submitted',
      pull_request: fakePR,
      review: {
        body: 'Following up on some of the above...',
        url: '',
        html_url: 'http://github.com/repo/pulls/1/some-review',
        state: 'commented',
        user: users.foo
      }
    }
  })

  assert.isTrue(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]

  assert.strictEqual(messages.length, 2)
  assert.strictEqual(messages[0].githubUsername, 'bar')
  assert.strictEqual(messages[1].githubUsername, 'baz')
  assert.include(
    messages[0].body,
    'foo <http://github.com/repo/pulls/1/some-review|commented on>'
  )
  scope.done()
})

test('sends messages when a comment is left on a PR diff', async () => {
  const fakeCommentsOrReviews = [{user: users.bar}, {user: users.baz}]
  const scope = nock('http://api.github.com')
    .get(/comments$/)
    .reply(200, fakeCommentsOrReviews)
    .get(/reviews$/)
    .reply(200, fakeCommentsOrReviews)

  await handleEvent({
    eventName: 'pull_request_review_comment',
    payload: {
      action: 'created',
      pull_request: fakePR,
      comment: {
        url: '',
        html_url: 'http://github.com/repo/pull/1#issuecomment-1',
        body: 'Hmm.',
        user: users.baz
      }
    }
  })

  assert.isTrue(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]

  assert.strictEqual(messages.length, 2)
  assert.strictEqual(messages[0].githubUsername, 'foo')
  assert.strictEqual(messages[1].githubUsername, 'bar')
  assert.include(
    messages[0].body,
    'baz <http://github.com/repo/pull/1#issuecomment-1|commented on>'
  )
  assert.include(messages[0].body, 'Hmm.')
  scope.done()
})

test('sends messages when a comment is left on a PR', async () => {
  const fakeCommentsOrReviews = [{user: users.bar}, {user: users.baz}]
  const scope = nock('http://api.github.com')
    .get(/comments$/)
    .reply(200, fakeCommentsOrReviews)
    .get(/reviews$/)
    .reply(200, fakeCommentsOrReviews)
    .get(/repo\/pulls\//)
    .reply(200, fakePR)

  await handleEvent({
    eventName: 'issue_comment',
    payload: {
      action: 'created',
      issue: {
        pull_request: {
          url: fakePR.url,
          html_url: fakePR.html_url
        }
      },
      comment: {
        url: '',
        html_url: 'http://github.com/repo/pull/1#issuecomment-1',
        body: 'Hmm.',
        user: users.baz
      }
    }
  })

  assert.isTrue(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]

  assert.strictEqual(messages.length, 2)
  assert.strictEqual(messages[0].githubUsername, 'foo')
  assert.strictEqual(messages[1].githubUsername, 'bar')
  assert.include(
    messages[0].body,
    'baz <http://github.com/repo/pull/1#issuecomment-1|commented on>'
  )
  assert.include(messages[0].body, 'Hmm.')
  scope.done()
})


test("ignores events that it's not supposed to handle", async () => {
  await handleEvent({
    eventName: 'pull_request',
    payload: {
      action: 'created',
      pull_request: fakePR
    }
  })
  assert.isTrue(sendMessagesFake.notCalled)

  await handleEvent({
    eventName: 'pull_request_review',
    payload: {
      action: 'edited',
      pull_request: fakePR,
      review: {
        body: 'Looks good.',
        url: '',
        html_url: 'http://github.com/repo/pulls/1/some-review',
        state: 'APPROVED',
        user: users.bar
      }
    }
  })
  assert.isTrue(sendMessagesFake.notCalled)

  await handleEvent({
    eventName: 'pull_request_review_comment',
    payload: {
      action: 'edited',
      pull_request: fakePR,
      comment: {
        url: '',
        html_url: 'http://github.com/repo/pulls/1/comments/1',
        body: 'Hmm.',
        user: users.baz
      }
    }
  })
  assert.isTrue(sendMessagesFake.notCalled)

  await handleEvent({
    eventName: 'other_event',
    payload: {}
  })
  assert.isTrue(sendMessagesFake.notCalled)
})

it('prevents messages from being sent from users on the blacklist', async () => {
  await handleEvent({
    eventName: 'pull_request_review_comment',
    payload: {
      action: 'created',
      pull_request: fakePR,
      comment: {
        url: '',
        html_url: 'http://github.com/repo/pulls/1/comments/1',
        body: 'Hmm.',
        user: users.quux
      }
    }
  })
  assert.isTrue(sendMessagesFake.notCalled)

  await handleEvent({
    eventName: 'pull_request_review',
    payload: {
      action: 'submitted',
      pull_request: fakePR,
      review: {
        body: 'Following up on some of the above...',
        url: '',
        html_url: 'http://github.com/repo/pulls/1/some-review',
        state: 'commented',
        user: users.quux
      }
    }
  })

  assert.isTrue(sendMessagesFake.notCalled)
})
