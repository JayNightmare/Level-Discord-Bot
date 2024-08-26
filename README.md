# Level Bot
This bot will keep track of user levels. Has anti spam measures and has commands for QOL 

## Install guide:
### Step 1:
Use `npm init -y` `npm install discord.js` to install discord.js.

---

### Step 2:
User
`npm install dotenv`
to install the dotenv package. This will keep your bot token secure. In your folder, make a file and name it `.env`. Make another file called `users.json`.

---

### Step 3:
Go to the discord dev portal, make a bot and get the bot token. Location: `Bot -> Token`. Copy the token and put it in your `.env` file. For example, `TOKEN=your token`

---

### Step 4:
Go back to the portal and go to `Bot -> Privileged Gateway Intents` and enable all. Then go to `Installation -> Installation Contexts` and enable `Guild Install`. Below that will be `Install Link`, use `Discord Provided Link`. Before copying to link, scroll down to `Default Install Settings`, you want to add
- Scopes: `application.commands` and `bot`
- Permissions: `Embed Links`, `Manage Messages`, `Manage Roles`, `Read Message History`, and `Send Messages` or `Administrator` for no conflict.

---

### Step 5:
If you have a logging channel, put the channel ID in the `.env`. For example, `LOGGING_CHANNEL=channel id`.

After all that, run `bot.js`.

---