# PR Review Pronto Notify Action

This action will post messages to a chat in Pronto when certain PR events occur.

# Adding the action to your project

In your repo, create a `.github/workflows` directory if it does not already exist, and add a `pronto_post.yml` file. Add the following as contents:

```yml
name: Post to Pronto
on:
  pull_request:
    types: [opened, closed, reopened]
  pull_request_review:
    types: [submitted, edited]
jobs:
  post-to-pronto:
    runs-on: ubuntu-latest
    steps:
      - name: post
        uses: Hitlabs/pr-reviewer-pronto-notification-action@main
        with:
          chat-id: 000000
          pronto-api-token: ${{ secrets.PRONTO_BOT_API_TOKEN }}
          github-api-token: ${{ secrets.PRONTO_GITHUB_API_TOKEN }}
```

Change the `chat-id` input property to be whatever chat you want the message to appear in. The API Token will be pulled in automatically from the organization's shared secret store.

By default messages are sent when PRs are opened, closed, reopened, or a PR review has finished or has changed. You can customize those events by updating the values in the `on` section at the top of the YAML file. You can find details about possible values here: https://docs.github.com/en/developers/webhooks-and-events/events/github-event-types#event-payload-object-9

Commit and push this file to your repo.

Test it out by creating a test PR.
