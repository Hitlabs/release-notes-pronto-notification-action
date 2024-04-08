import core from '@actions/core'
import github from '@actions/github'
import axios from 'axios'

const prontoApiToken = core.getInput('pronto-api-token')
const githubApiToken = core.getInput('github-api-token')
const chatId = core.getInput('chat-id')
const prontoDomain = core.getInput('api-domain') || 'api.pronto.io'
const maxCommits = core.getInput('max-commits') || '10'
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

const pr = payload.pull_request
if (!pr) {
	console.log('No pull request associated with this action. Going to bail.')
	throw new Error('Invalid PR State: Pull request does not exist')
}
// if (!pr.merged) {
// 	console.log('Pull request has not been merged yet. Going to bail.')
// 	throw new Error('Invalid PR State: Pull request has not yet been merged')
// }

try {
	console.log('*************** STARTING ******************')
	const response = await githupApi('GET', pr._links.commits.href)
	console.log('COMMITS', JSON.stringify(response.data, null, 4))
	const commitMsgs = response.data.map(c => c.commit.message)
	const forDisplay = commitMsgs.slice(0, parseInt(maxCommits))
	const moreCount = commitMsgs.length - forDisplay.length
	const moreText = moreCount > 0 ? `\nand ${moreCount} more commits` : null
	const commitText = forDisplay.map(msg => `-- ${msg}`).join('\n')
	let releaseNotes = `New release to ${pr.base.ref}\n\n"${pr.title}":\nPull Request: ${pr.html_url}\n${commitText}`
	if (moreText) {
		releaseNotes += moreText
	}
	console.log('*************** FINAL MESSAGE ******************')
	console.log(releaseNotes)
	console.log('*************** DONE ******************')
} catch (e) {
	console.error(e)
}

async function postToPronto(event, parent_id) {
	const { pull_request, sender } = event

	const text = parent_id
		? `${action} by @${sender.login}`
		: [
				pull_request.title,
				pull_request.html_url,
				`PR #${pull_request.number} ${action} by @${sender.login}`,
		  ].join('\n')

	const response = await axios({
		method: 'POST',
		url: `https://${prontoDomain}/api/chats/${chatId}/messages`,
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${prontoApiToken}`,
		},
		data: { parent_id, text },
	})
	console.log('Message Successfully Posted to Pronto!', response)
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
