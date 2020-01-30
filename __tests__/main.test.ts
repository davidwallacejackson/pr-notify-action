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
  assignees: [users.bar, users.baz]
}

const sendMessagesFake = sinon.fake.returns(Promise.resolve(null))
jest.mock('../src/slack', () => ({
  __esModule: true,
  default: sendMessagesFake
}))

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
      secret: 'secret'
    })
}))

import {assert} from 'chai'

import {PullRequest, GitHubUser, Message, WebhookContext} from '../src/types'
import handleEvent from '../src/handleEvent'

beforeEach(() => {
  sendMessagesFake.resetHistory()
})

test('sends messages when a review is assigned', async () => {
  await handleEvent({
    eventName: 'pull_request',
    payload: {
      action: 'assigned',
      pull_request: fakePR
    }
  })

  assert.isTrue(sendMessagesFake.calledOnce)

  const messages: Message[] = sendMessagesFake.args[0][0]

  assert.strictEqual(messages[0].githubUsername, 'bar')
  assert.include(messages[0].body, 'foo requested your review')

  assert.strictEqual(messages[1].githubUsername, 'baz')
  assert.include(messages[1].body, 'foo requested your review')
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
})

test('sends messages when a review with comment is left', async () => {
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
})

test('does not notify the PR author if they review their own PR', async () => {
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
})

test('sends messages when a comment is left on a PR', async () => {
  await handleEvent({
    eventName: 'pull_request_review_comment',
    payload: {
      action: 'created',
      pull_request: fakePR,
      comment: {
        url: '',
        html_url: 'http://github.com/repo/pulls/1/comments/1',
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
    'baz <http://github.com/repo/pulls/1/comments/1|commented on>'
  )
  assert.include(messages[0].body, 'Hmm.')
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
