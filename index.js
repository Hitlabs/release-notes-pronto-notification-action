import core from '@actions/core'
import github from '@actions/github'
import axios from 'axios'

const prontoApiToken = core.getInput('pronto-api-token')
const githubApiToken = core.getInput('github-api-token')
const chatId = core.getInput('chat-id')
const prontoDomain = core.getInput('api-domain') || 'api.pronto.io'
const maxCommits = core.getInput('max-commits') || '10'
const messagePrefix = core.getInput('message-prefix')

const tab = '    '

try {
	console.log('*************** PRECHECK ******************')
	if (!chatId || !prontoApiToken || !githubApiToken) {
		throw new Error(
			`Invalid parameters provided: ${JSON.stringify({
				chatId,
				prontoApiToken,
				githubApiToken,
			})}`
		)
	}
	const { pull_request: pr, repository } = github.context.payload
	if (!pr) {
		throw new Error('Invalid PR State: Pull request does not exist')
	}
	if (!pr.merged) {
		throw new Error('Invalid PR State: Pull request has not yet been merged')
	}
	console.log('*************** STARTING ******************')
	const response = await githupApi('GET', pr._links.commits.href)
	const messageText = generateMessage(pr, repository, response.data)
	await postToPronto(messageText)
	console.log('***************** DONE ********************')
} catch (e) {
	console.error(e)
	console.log(
		'Variables',
		JSON.stringify({
			chatId,
			maxCommits,
			messagePrefix,
			prontoApiToken,
			githubApiToken,
		})
	)
	console.log(
		'The event payload:',
		JSON.stringify(github.context.payload, null, 2)
	)
}

function generateMessage(pr, repo, commits) {
	const allCommitMsgs = commits
		.map((c) => c.commit.message?.split(/[\r\n]/)?.[0])
		.filter((m) => m)
	const commitMsgs = Array.from(new Set(allCommitMsgs))
	const forDisplay = commitMsgs.slice(0, parseInt(maxCommits))
	const moreCount = commitMsgs.length - forDisplay.length
	const moreText = moreCount > 0 ? `-- and ${moreCount} more commits` : null

	const message = [
		messagePrefix ? `### ${messagePrefix}` : `### New release for ${repo.name}`,
		'',
		`PR: "${pr.title}"`,
		`PR Link: ${pr.html_url}`,
		`Branch: ${pr.base.ref}`,
		'',
		`Commits (${allCommitMsgs.length}):`,
		...forDisplay.map((msg) => `${tab}-- ${msg}`),
		moreText ? `${tab}${moreText}` : '',
	].join('\n')

	return message
}

async function postToPronto(messageText) {
	console.log(`[PRONTO API] sending message to pronto chat ${chatId}...`)
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
