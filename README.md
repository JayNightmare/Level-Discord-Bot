<div align="center">
    <img src="./image.png" height="128" >
</div>
<h1 align="center">Levelling Discord Bot</h1>
<p align="center">
    <a href="https://github.com/JayNightmare/Level-Discord-Bot/graphs/contributors">
      <img alt="GitHub Contributors" src="https://img.shields.io/github/contributors/JayNightmare/Level-Discord-Bot?color=2db94d" />
    </a>
    <a href="https://github.com/JayNightmare/github-readme-stats/issues">
      <img alt="Issues" src="https://img.shields.io/github/issues/JayNightmare/Level-Discord-Bot?color=0088ff" />
    </a>
    <a href="https://github.com/anuraghazra/github-readme-stats/pulls">
      <img alt="GitHub pull requests" src="https://img.shields.io/github/issues-pr/JayNightmare/Level-Discord-Bot?color=0088ff" />
    </a>
    <br />
    <br />
  </p>

<p align="center">This bot will keep track of user levels. Has anti spam measures and has commands for QOL</p>

## Have a bug?
Submit an `Issue` and tell me what's wrong.

## Installation Guide:
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

## Modification Guide:
To modify the code to fit your needs, here is what you need to change.
1. Line 343 -> `manageRoles` function. Change `const roles` to roles you want users to gain when they level up. Leave blank if you want to (`const roles = {}`).

2. Line 75 -> change `milestoneLevels` to the level you want to give roles. If you don't want milestone levels, leave blank (`const milestoneLevels = []`).

3. Line 353 -> `try` section, change if statement if you want a specific role to do something. For example, level 15 removes all previous roles. Remove if you don't want it.

4. Optionally changes:
    - Line 93 -> `cooldownAmount` - change if you want the cooldown to be longer or shorter. Default is set to 60 seconds.
    - Line 123 -> `x` is the base multiplier and `y` is the scaling factor. Change the `x` to increase/decrease the `user.level` multiplication xp. Change the `y` for the increase of xp after each level.