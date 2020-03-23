import querystring from 'querystring'
import {Jira} from '../types'
import {uniqBy} from 'lodash'
import getConfig from '../config'
import fetch from 'node-fetch'

// NOTES:
// * the `self` url provided with issues in the webhook is INCORRECT

//   webhooks give BASE_URL/rest/api/2/issueID but it should be
//   BASE_URL/rest/api/2/issues/issueID instead

//   other URLs, such as for watchers, seem to be correct (this is how I
//   figured out the issue's self url was wrong in the first place -- by
//   comparing it to the others)

// * normal user permissions may not be enough to access the API
//   (my account was upgraded to admin while working on this and some URLs
//   magically became valid that weren't before. issue.self is still wrong,
//   though.)

export async function jiraAPI(url: string, queryParams?: any) {
  const {jiraUsername, jiraToken} = await getConfig()

  const query = queryParams ? '?' + querystring.stringify(queryParams) : ''

  // per https://developer.atlassian.com/server/jira/platform/basic-authentication/
  // and https://confluence.atlassian.com/cloud/api-tokens-938839638.html
  // (the token takes the place of a password)
  const authString = Buffer.from(`${jiraUsername}:${jiraToken}`).toString(
    'base64'
  )
  const resp = await fetch(url + query, {
    headers: {
      Authorization: `Basic ${authString}`
    }
  })

  return resp.json()
}

export async function getIssueWatchers(partialIssue: Jira.PartialIssue) {
  const watchersURL = `${getJiraBaseURL(partialIssue.self)}/rest/api/2/issue/${
    partialIssue.key
  }/watchers`
  return (await jiraAPI(watchersURL)) as Jira.WatchersPayload
}

export async function getUser(baseURL: string, accountId: string) {
  const userURL = `${baseURL}/rest/api/2/user`
  return (await jiraAPI(userURL, {accountId})) as Jira.User
}

export async function getFullIssue(partialIssue: Jira.PartialIssue) {
  const issueURL = `${getJiraBaseURL(partialIssue.self)}/rest/api/2/issue/${
    partialIssue.key
  }`
  return (await jiraAPI(issueURL)) as Jira.Issue
}

export function getJiraBaseURL(restAPIURL: string) {
  // from any rest URL (e.g. http://jira.atlassian.com/rest/api/2/issue/1234)
  // to the base URL (e.g. http://jira.atlassian.com)
  const match = restAPIURL.match(/(.*)\/rest\/api/)

  if (!match || match.length < 2) {
    throw new Error(`Can't identify JIRA base URL from REST URL: ${restAPIURL}`)
  }

  return match[1]
}
