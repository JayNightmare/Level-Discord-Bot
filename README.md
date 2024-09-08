<div align="center">
    <img src="./image.png" height="128" >
</div>
<h1 align="center">Levelling Discord Bot</h1>
<p align="center">
    <a href="https://github.com/JayNightmare/Level-Discord-Bot/graphs/contributors">
      <img alt="GitHub Contributors" src="https://img.shields.io/github/contributors/JayNightmare/Level-Discord-Bot?color=2db94d" />
    </a>
    <a href="https://github.com/JayNightmare/Level-Discord-Bot/issues">
      <img alt="Issues" src="https://img.shields.io/github/issues/JayNightmare/Level-Discord-Bot?color=0088ff" />
    </a>
    <a href="https://github.com/JayNightmare/Level-Discord-Bot/pulls">
      <img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/JayNightmare/Level-Discord-Bot?color=0088ff" />
    </a>
    <br />
    <br />
    <div align="center">
        <p>Top.gg Stats</p>
        <a href="https://top.gg/bot/1278098225353719869">
          <img src="https://top.gg/api/widget/upvotes/1278098225353719869.svg">
        </a>
    </div>
    
</p>
<p align="center">This bot will keep track of user levels. Has anti spam measures and has commands for QOL</p>

## Have a bug?
Submit an `Issue` and tell me what's wrong.

## Installation Guide:
### Step 1:
Use `npm init -y` `npm install discord.js` to install discord.js.

---

### Step 2:
Use `npm install dotenv` to install the dotenv package. This will keep your bot token secure. In your folder, make a file and name it `.env`. Make another file called `users.json`.

> Optional:

If you want to enable voting on, install `npm install axios` and in your `.env` put your webhook key in a var. If you don't want voting, delete or comment out the vote command - it WILL throw errors at you.

---

### Step 3:
Go to the discord dev portal, make a bot and get the bot token. Location: `Bot -> Token`. Copy the token and put it in your `.env` file. For example, `TOKEN=your token`

---

### Step 4:
Go back to the portal and go to `Bot -> Privileged Gateway Intents` and enable all. Then go to `Installation -> Installation Contexts` and enable `Guild Install`. Below that will be `Install Link`, use `Discord Provided Link`. Before copying to link, scroll down to `Default Install Settings`, you want to add
- Scopes: `application.commands` and `bot`
- Permissions: `Embed Links`, `Manage Messages`, `Manage Roles`, `Read Message History`, and `Send Messages` or `Administrator` for no conflict.

---

### Step 6:
Make 5 files: `achievements.json`, `badges.json`, `serverConfigs.json`, `users.json`, and `owner.json`.

These will hold you data when you run the bot. If you run the bot, they will generate themselves expect `serverConfigs.json` (i don't care to find out why tbh).

`owner.json` will will hold all your debugging info. For example, mine tells me when a server receieves a bug and to push an update to all the servers.

---

### Step 6:
After all that, run `bot.js`.

---

## Modification Guide:
Commands are split into 4 different files: Admin, Community, Configuration, and Owner. Owner is not in this file as it's for bot debugging debugging, but the other 3 are. In there you can customize anything you want. 

## Commands:
To see the commands in discord, run the `help` command using `!` or your custom prefix.
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
