<div align="center">
    <img src="./image.png" height="128" >
</div>
<h1 align="center">Levelling Discord Bot</h1>
<div align="center">
    <a href="https://github.com/JayNightmare/Level-Discord-Bot/graphs/contributors">
      <img alt="GitHub Contributors" src="https://img.shields.io/github/contributors/JayNightmare/Level-Discord-Bot?color=2db94d" />
    </a>
    <a href="https://github.com/JayNightmare/Level-Discord-Bot/issues">
      <img alt="Issues" src="https://img.shields.io/github/issues/JayNightmare/Level-Discord-Bot?color=0088ff" />
    </a>
    <a href="https://github.com/JayNightmare/Level-Discord-Bot/pulls">
      <img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/JayNightmare/Level-Discord-Bot?color=0088ff" />
    </a>
    <br/>
</div>

<div align="center">
  <div>
    <a href="https://top.gg/bot/1278098225353719869">
      <img src="https://top.gg/api/widget/upvotes/1278098225353719869.svg">
    </a>
    <a href="https://discord.com/application-directory/1278098225353719869">
      <p>Discord App Directory</p>
    </a>
  </div>
</div>
<br/>
<p align="center">This bot will keep track of user levels. Has anti spam measures and has commands for QOL</p>

## Have a bug?
Submit an `Issue` and tell me what's wrong.

## Things to note before cloning
This code base uses discord.js, sqlite3, .env, and a few other npm packages. If you forget to import a one of these, an error WILL occur. I'm using `npm` so all imports will start with `npm install`.

All the things you need to import are:
> #### Absolutely Needed Imports:
- discord.js@latest
- -g npm (ensures node.js and npm are up to date)
- dotenv (.env file type)

> #### For JSON Data Management Imports:
- body-parser (for handling JSON request bodies)

> #### For SQLite Data Management Imports:
- sqlite3 (or better-sqlite3 if you want to sync APIs, faster for more frequent queries)

> #### For MongoDB and Mongoose Data Management Imports:
- mongodb mongoose

> #### For PostgreSQL (Relational) Imports:
- pg

> #### Optional Imports: (if you choose to upload publicly)
- axios (Promise-Based HTTP Client)
- express (tool for HTTP servers)
- dblappi.js (for top.gg API handles)
- -g madge (to trace dependencies. Run `madge --circular ./path-to-your-project` to setup manually)

## Installation Guide For JSON:
### Step 1: Importing
Install the `Absolutely Needed Imports`. Using `dotenv` will keep your bot token secure in a `.env` file. Remember to add this file to the .gitignore file so you don't share your token by accident.

Your `.env` should look similar to this:
```js
# Needed Variables
TOKEN= # bot token
TEST_TOKEN= # test bot token if you want to test before pushing to live
CLIENT_ID= # bot client id
OWNER= # your user id

# Optional if you publish the bot to Top.gg
TOPGG_API_KEY= # your webhook key on topgg
TOPGG_TOKEN= # secret token on topgg
HARDCODED= # bot client id
```

> Optional:

If you want to enable vote tracking for the vote command, install the `optional imports` and in your `.env` put your webhook key in the variables above. 

If you don't want voting, delete or comment out the `vote` command - it WILL throw errors at you.

---

### Step 2: File Management Setup
If you have choosen to use the JSON file type, you'll need to make sure you have a `json` folder with achievements, badges, owner, serverConfigs, and users json files.

The current code base is setup for sqlite3 but to convert it to json just change `utils.js` file with your json file logic. For example, if you wanted to insert data into the serverConfigsData json file, you would do:
```json
// Initialize server config data if it's not present
if (!serverConfigsData[serverId]) {
  serverConfigsData[serverId] = {
      serverId: serverId,
      name: guild.name,
      blacklistedChannels: [],
      allowedChannel: null,
      loggingChannelId: null,
      prefix: "!", // Default prefix
      requireConfirm: false
  };
}
```

I've left this commented out in the admin_commands.js file in the `setlevels` command. Simply refactor the functions with that logic and you'll be set for json data management.

---

### Step 3:
Go to the discord dev portal, make a bot and get the bot token. Location: `Bot -> Token`. Copy the token and put it in your `.env` file.

---

### Step 4:
Go back to the portal and go to `Bot -> Privileged Gateway Intents` and enable all. Then go to `Installation -> Installation Contexts` and enable `Guild Install`. Below that will be `Install Link`, use `Discord Provided Link`. Before copying to link, scroll down to `Default Install Settings`, you want to add
- Scopes: `application.commands` and `bot`
- Permissions: `Embed Links`, `Manage Messages`, `Manage Roles`, `Read Message History`, and `Send Messages` or `Administrator` for no conflict.

### General Permissions:
- **Administrator** (if you want the bot to have full control) or alternatively, you can selectively choose:
  - **Manage Server** (if the bot needs to modify server settings)
  - **Manage Roles** (for commands that set roles for users)
  - **Manage Channels** (if the bot will create/manage channels)
  - **View Audit Log** (if your bot will log server activities)

### Text Permissions:
- **Send Messages** (this is essential for sending commands/responses)
- **Embed Links** (for sending rich embeds with detailed information)
- **Manage Messages** (if you want the bot to delete or edit messages)
- **Read Message History** (to respond to older messages)
- **Use Slash Commands** (for enabling your bot to use slash commands)
- **Mention Everyone** (if the bot needs to ping @everyone or specific roles)
- **Add Reactions** (if your bot interacts via emoji reactions)

### Voice Permissions:
If your bot needs to interact with voice channels, you might consider:
- **Connect** (if the bot will join voice channels)
- **Speak** (if the bot will speak in voice channels)

---

### Step 6:
If you run the bot, the data will generate into the files (json files in the json folder) except `serverConfigs.json` - This is a personal bug I kept coming across, my fix was to trigger the save in the `messageCreate` function in the `bot.js`.

`owner.json` will hold all your debugging info. For example, mine tells me when a server receieves a bug and to push an update to the servers. I also have a `servercall` which allows me to use the server id to "call" the server and look at the data which is causing the error.

---

### Step 7:
After all that, run `bot.js`. If you recieve errors, idk use ChatGPT 👁👄👁

---

## Installation Guide For SQLite3:
### Step 1: Importing
Install the `Absolutely Needed Imports`. Using `dotenv` will keep your bot token secure in a `.env` file. Remember to add this file to the .gitignore file so you don't share your token by accident.

Your `.env` should look similar to this:
```js
# Needed Variables
TOKEN= # bot token
TEST_TOKEN= # test bot token if you want to test before pushing to live
CLIENT_ID= # bot client id
OWNER= # your user id

# Optional if you publish the bot to Top.gg
TOPGG_API_KEY= # your webhook key on topgg
TOPGG_TOKEN= # secret token on topgg
HARDCODED= # bot client id
```

> Optional:

If you want to enable vote tracking for the vote command, install the `optional imports` and in your `.env` put your webhook key in the variables above. 

If you don't want voting, delete or comment out the `vote` command - it WILL throw errors at you.

---

### Step 2: File Management Setup
If you've choosen SQLite3, you'll need to install the `SQLite Data Management Imports`. Run the `setupDatabase.js` to setup the Database. If you're migrating data from JSON files, use the `migrateDataToDB.js` to push the data over to the tables. 

Once you've setup the database, install a database viewer. There are two options:
| Program Location | Recommended Program |
|------------------|---------------------|
| PC (Local View)  | [SQLite Browser](https://sqlitebrowser.org/dl/) |
| Server (Remote View) | [SQLite Web](https://github.com/coleifer/sqlite-web) |

For the PC Local View, you can load the database and edit the data using a program on your pc. 

For the Server Remote View, you need to:
1. Open command prompt (or a terminal) and `ssh` into your server.
1. Run `pip install sqlite-web` on your server _(make sure to also have python installed on the server)_.
2. `cd` into your root folder of your bot and run `sqlite_web --port 8080 nameOfYourDatabase.db`.
3. Open another command prompt (or terminal) and run `ssh -L 8000:localhost:8080 user@your-server-ip` so you can SSH Tunnel the connection to your machine. 
4. Go to your browser and enter `http://localhost:8000` into the URL bar and you'll be able to see your database.

To exit the database, just go back to the first command prompt and do `Crtl+C` to disconnect. If you encounter an error with connecting or the page not opening, try a different port or use ChatGPT to debug idk.

---

## Installation Guide For MongoDB and Mongoose or PostgreSQL:
Similar to the SQLite steps but uses the MongoDB and Mongoose or PostgreSQL framework. I don't provide steps for migrating the code for that but it's roughly the same and doesn't require _that_ much work.

---

## Modification Guide:
Commands are split into 4 different files: Admin, Community, Configuration, and Owner. Owner is not in this file as it's for bot debugging, but the other 3 are. In there you can customize anything you want. 

## Commands:
To see the commands in discord, run the `help` command using `!` or your custom prefix. All the community comands have slash command support as well.
<code align=center>
| Command             | Description                          |
|---------------------|--------------------------------------|
| `setrankchannel`    | Set the rank check channel.          |
| `unsetrankchannel`  | Unset the rank check channel.        |
| `setlogchannel`     | Set the log channel.                 |
| `viewsettings`      | View current settings.               |
| `blacklist`         | Blacklist channels.                  |
| `unblacklist`       | Unblacklist channels.                |
| `rank`              | View your rank.                      |
| `checkrole`         | Check your roles.                    |
| `setlevels`         | Set milestone levels.                |
| `setroles`          | Set milestone roles.                 |
| `help`              | Display help.                        |
| `profile`           | Displays users server profile        |
| `setbio`            | Set bio for profile                  |
| `leaderboard`       | Displays server leaderboard          |
| `setprefix`         | Set server prefix                    |
| `toggleconfirm`     | Set to confirm when adding xp        |
| `addachievement/rmachievement/setachievement`  | Add, remove, or set achievements for server          |
| `addbadge/rmbadge/setbadge/viewbadge`          | Add, remove, or set badges for server              |
</code>
