# 🛡️ Spam Tracker

> Protect your Discord server from spam, raids, and malicious message flooding.

## Features
- ⚡ Automatic honeypot protection channel
- 🔨 2-hour timeout enforcement
- 🧹 20-minute message cleanup
- 🚫 Protected anti-spam channel
- 🗳️ Vote and support the bot
- 📊 Dynamic server count presence
- 🔒 Principle of least privilege

## How It Works
The bot uses a honeypot channel strategy: `/setup` creates a dedicated channel (`dont-msg-or-upload-here`) configured with View Channel, Send Messages, and Read Message History permissions for `@everyone`. Any spam bots or raiders that attempt to send messages or upload media there trigger an immediate:
1. Message deletion
2. 2-hour automated timeout
3. Mass cleanup of their recent messages (last 20 minutes) across all channels

> 💡 **Role Hierarchy Setup Tip:** In **Server Settings > Roles**, place the **Spam Tracker** bot role **above regular member roles** (below Admins/Mods, but above normal members). Discord requires a bot's highest role to be higher than the target member's highest role to issue timeouts.

## Commands
| Command | Description | Permission |
|---------|-------------|------------|
| `/setup` | Creates the protected honeypot channel and configures protection. | Administrator |
| `/vote` | Shows links to vote for the bot on bot lists. | Everyone |
| `/help` | Displays command overview and information. | Everyone |

## Quick Start
1. Clone the repo
2. `npm install`
3. Copy `.env.example` to `.env`, fill in values
4. `npx prisma generate`
5. `npx prisma db push`
6. `npm run deploy-commands`
7. `npm run dev`

## Installation
### Prerequisites
- Node.js 18+
- npm
- A Discord bot application

### Discord Developer Portal Setup
1. Go to https://discord.com/developers/applications
2. Create a new application named **Spam Tracker**
3. Go to the Bot section, create a bot
4. Enable privileged intents: **SERVER MEMBERS INTENT** and **MESSAGE CONTENT INTENT**
5. Copy the bot token
6. Go to OAuth2, copy the Client ID

### Required Privileged Intents
- **Server Members Intent (GuildMembers)**: Needed to inspect member roles, check permissions, and apply 2-hour timeouts.
- **Message Content Intent (MessageContent)**: Needed to detect messages sent in the protected honeypot channel.

### Required Bot Permissions
- **View Channels**: To see text channels and the protected channel.
- **Send Messages**: To post embeds and command responses.
- **Embed Links**: To format security embeds nicely.
- **Read Message History**: To fetch messages during recent 20-minute cleanup.
- **Manage Messages**: To delete triggering spam messages and clean up user history.
- **Manage Channels**: To create and configure the `dont-msg-or-upload-here` channel during `/setup`.
- **Moderate Members**: To apply the 2-hour timeout to spammers.

**OAuth2 Permission Integer:** `1099511719936`

**Invite URL Template:**
`https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=1099511719936&scope=bot%20applications.commands`

### Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | Yes |
| `CLIENT_ID` | Your bot's client ID | Yes |
| `DATABASE_URL` | SQLite / PostgreSQL connection string | Yes |
| `TOPGG_VOTE_URL` | Top.gg voting URL | Optional |
| `DISCORDBOTLIST_VOTE_URL` | Discord Bot List voting URL | Optional |
| `BOTSERVICES_VOTE_URL` | Bot Services voting URL | Optional |

### Database Setup
The project uses Prisma ORM configured for SQLite by default. For production PostgreSQL:
1. Update `provider = "postgresql"` in `prisma/schema.prisma`
2. Set `DATABASE_URL` in `.env`
3. Run `npx prisma migrate dev`

### Running the Bot
- **Development**: `npm run dev`
- **Production Build**: `npm run build`
- **Production Start**: `npm start`
- **Deploy Slash Commands**: `npm run deploy-commands`

### PM2 Deployment
Create an `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'spam-tracker',
    script: 'dist/index.js',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```
Then run: `pm2 start ecosystem.config.js`
Then run: `pm2 start ecosystem.config.js`

### Testing
Run tests using vitest:
- `npm test`
- `npm run test:watch`

## How the 20-Minute Cleanup Works
1. Bot tracks all messages in an in-memory cache.
2. When a user triggers the protected channel, the bot queries the cache for that user's messages from the last 20 minutes.
3. Messages are deleted in controlled batches to respect Discord rate limits.
4. The cache automatically cleans expired entries every 5 minutes.
5. Designed for Redis replacement for horizontal scaling.

## Voting Links
Voting URLs are configured via environment variables and shown through the `/vote` command.

## Security Notes
- Never commit `.env`
- Bot follows principle of least privilege
- No Administrator permission required
- All sensitive values use environment variables

## Architecture
- `src/services/` - Core business logic and discord interactions
- `src/commands/` - Slash command handlers
- `src/utils/` - Shared utilities and constants
- `src/database/` - Prisma configuration and db interactions
- `tests/` - Vitest test files

## Developer
NeonJava
https://github.com/neonjava

## License
MIT
