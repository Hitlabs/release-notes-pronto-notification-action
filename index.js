import core from '@actions/core'
import github from '@actions/github'
import axios from 'axios'

const prontoApiToken = core.getInput('pronto-api-token')
const githubApiToken = core.getInput('github-api-token')
const chatId = core.getInput('chat-id')
const prontoDomain = core.getInput('api-domain') || 'api.pronto.io'
const maxCommits = core.getInput('max-commits') || '10'
const messagePrefix = core.getInput('message-prefix')
const { payload } = github.context

const MSG_ID_REGEXP = /\[\[PRONTO_MSG_ID:(\d.*)\]\]/

console.log(`Chat ID: ${chatId}`)
console.log(`The event payload: ${JSON.stringify(payload, null, 2)}`)

if (!chatId || !prontoApiToken || !githubApiToken) {
	throw new Error(
		`Invalid parameters provided: ${JSON.stringify({
			chatId,
			prontoApiToken,
			githubApiToken,
		})}`
	)
}

const { pull_request: pr, repository } = payload.pull_request
if (!pr) {
	console.log('No pull request associated with this action. Going to bail.')
	throw new Error('Invalid PR State: Pull request does not exist')
}
// if (!pr.merged) {
// 	console.log('Pull request has not been merged yet. Going to bail.')
// 	throw new Error('Invalid PR State: Pull request has not yet been merged')
// }

const tab = '    '

try {
	console.log('*************** STARTING ******************')
	const response = await githupApi('GET', pr._links.commits.href)
	const messageText = generateMessage(pr, repository, response.data)
	await postToPronto(messageText)
	console.log('*************** DONE ******************')
} catch (e) {
	console.error(e)
}

function generateMessage(pr, repo, commits) {
	const commitMsgs = commits.map(c => c.commit.message)
	const forDisplay = commitMsgs.slice(0, parseInt(maxCommits))
	const moreCount = commitMsgs.length - forDisplay.length
	const moreText = moreCount > 0 ? `\nand ${moreCount} more commits` : null

	const noteLines = [
		`PR: "${pr.title}"`,
		`PR Link: ${pr.html_url}`,
		`Branch: ${pr.base.ref}`,
		'Commits:',
		...forDisplay.map(msg => `${tab}-- ${msg}`),
		moreText ? `${tab}${moreText}` : '',
	]
	const message = [
		messagePrefix ? `### ${messagePrefix}` : `### New release for ${repo.name}`,
		`"${pr.title}"`,
		...noteLines.map(line => tab + line)
	].join('\n')

	return message
}

async function postToPronto(messageText) {
	console.log('[PRONTO API] sending message to pronto...')
	const response = await axios({
		method: 'POST',
		url: `https://${prontoDomain}/api/chats/${chatId}/messages`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${prontoApiToken}`,
		},
		data: { text: messageText },
	})
	console.log('[PRONTO API] message successfully posted', response)
	return response
}

async function githupApi(method, url, body) {
	console.log('[GITHUB API] making request...', { method, url, body })
	const response = await axios({
		method,
		url,
		headers: {
			'Content-Type': 'application/vnd.github.v3+json',
			Authorization: `token ${githubApiToken}`,
		},
		data: { body },
	})
	console.log('[GITHUB API] request complete', response)
	return response
}
