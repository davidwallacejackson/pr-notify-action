import {
  WebhookContext,
  Message
} from './types'
import * as GHHandle from './github/handle'
import sendMessages from './slack'

export default async function handleEvent(
  context: WebhookContext
): Promise<void> {
  console.log('handling event: ', context.eventName)
  console.log(JSON.stringify(context))
  let messages: Message[] = []

  switch (context.eventName) {
    case 'pull_request':
      messages = await GHHandle.handlePREvent(context.payload)
      break
    case 'pull_request_review':
      messages = await GHHandle.handleReviewEvent(context.payload)
      break
    case 'pull_request_review_comment':
      messages = await GHHandle.handleCommentEvent(context.payload)
  }

  if (messages.length > 0) {
    console.log('sending messages')
    console.log(JSON.stringify(messages))
    await sendMessages(messages)
  }
}
