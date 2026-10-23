# WitS Mastermind

WitS Mastermind is a Discord bot for the WitS server. It manages member roles, provides reminder slash commands, and can turn a Discord forum post into a GitHub issue.

## Features

- Assigns the configured member role to existing server members when the bot starts and to new members as they join.
- Posts a welcome message when a new member joins.
- Registers three guild slash commands:
  - `/create_issue` — creates a GitHub issue from the current forum post, including its title, text, attachments, and tags.
  - `/remindme` — schedules a reminder for the current channel. Reminders start after six hours and repeat every six hours until removed.
  - `/stop` — removes your reminder for the current channel.
- Restricts slash commands to members with the configured team-member role.

## Requirements

- Node.js 22 or later (the included Dockerfile uses Node 22).
- A Discord application and bot added to the target server.
- A GitHub personal access token that can create issues in the configured repository.

## Configuration

Create a `.env` file in the project root. The file is ignored by Git; do not commit tokens or credentials.

```dotenv
DISCORD_TOKEN=
CLIENT_ID=
SERVER_ID=
ROLE_ID=
ROLE_TEAM_MEMBER_ID=
GENERAL_NOTIFICATION_CHANNEL_ID=
REMINDER_CHANNEL_ID=
GENERAL_REMINDER_CHANNEL_ID=
DISCORD_ADMIN_ID=
GITHUB_TOKEN=
REPO=
PROJECT=
```

Set the values as follows:

| Variable | Description |
| --- | --- |
| `DISCORD_TOKEN` | Bot token for logging in to Discord. |
| `CLIENT_ID` | Discord application (bot) ID used to register commands. |
| `SERVER_ID` | Discord server (guild) ID where commands are registered and members are synchronized. |
| `ROLE_ID` | Role assigned to existing and newly joined members. |
| `ROLE_TEAM_MEMBER_ID` | Role required to use the bot's slash commands. |
| `GENERAL_NOTIFICATION_CHANNEL_ID` | Text channel where new-member welcome messages are posted. |
| `REMINDER_CHANNEL_ID` | Reminder destination used for the user configured by `DISCORD_ADMIN_ID`. |
| `GENERAL_REMINDER_CHANNEL_ID` | Reminder destination for other users. |
| `DISCORD_ADMIN_ID` | Discord user ID whose reminders are sent to `REMINDER_CHANNEL_ID`. |
| `GITHUB_TOKEN` | GitHub token authorized to create issues in the target repository. |
| `REPO` | GitHub repository owner or organization. |
| `PROJECT` | GitHub repository name. |

Enable the **Server Members Intent** in the Discord Developer Portal for the bot. The bot also needs permission to view channels and threads, send messages, manage the configured member role, and use application commands. Its highest role must be above the role it assigns. To create GitHub issues, the token must have the necessary issue-write access to the repository.

## Run locally

Install dependencies:

```sh
npm install
```

Compile the TypeScript source and start the bot:

```sh
npm run build
npm start
```

For development with automatic restarts:

```sh
npm run dev
```

The bot registers its slash commands when it starts. Reminder data is stored in `data/reminders.json`, which is created automatically. Keep this file persistent across restarts and deployments if you need reminders to be retained.

## Run with Docker

Build the image from the project root:

```sh
docker build -t wits-mastermind .
```

Run the container with the required environment variables supplied through your deployment platform or an environment file:

```sh
docker run --env-file .env -v wits-mastermind-data:/app/data wits-mastermind
```

The mounted volume preserves reminder data when the container is replaced.

## Project structure

```text
src/
  Client.ts              Discord client setup
  CreateIssue.ts         GitHub issue creation from forum posts
  CreateReminders.ts     Reminder storage and delivery
  SyncMembers.ts         Member-role synchronization
  SyncSocialMediaPosts.ts Unwired social-media token helper
  index.ts               Startup, command registration, and event handlers
data/                    Runtime reminder data
```
