const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { EmbedBuilder } = require('@discordjs/builders');
require('dotenv').config();
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const usersFilePath = 'users.json';
const loggingChannelId = process.env.LOGGING_CHANNEL;

// * Ensure the file exists and load data
if (!fs.existsSync(usersFilePath)) {
    fs.writeFileSync(usersFilePath, JSON.stringify({ users: {}, blacklistedChannels: [], allowedChannel: null }, null, 4));
}
let data = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));

// * Ensure blacklistedChannels array and allowedChannel are initialized
if (!data.blacklistedChannels) { data.blacklistedChannels = []; }
if (!data.allowedChannel) { data.allowedChannel = null; }
if (!data.users) { data.users = {}; }
saveData();

// * Helper function to save data
function saveData() {
    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 4));
}

// * Send status to logging channel
async function sendStatusMessage(status) {
    const logChannel = client.channels.cache.get(loggingChannelId);
    if (!logChannel) {
        console.error('Logging channel not found.');
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`Bot Status Update`)
        .setDescription(`The bot is now **${status}**.`)
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [embed] });
        console.log(`Sent status update: ${status}`);
    } catch (error) {
        console.error(`Failed to send status update to ${logChannel.name}:`, error);
    }
}

// * Event listener when bot goes online
client.once('ready', () => {
    console.log('Bot is online!');
    sendStatusMessage('Online');
});

// * Event listener when bot disconnects
client.on('shardDisconnect', (event, shardId) => {
    console.warn(`Shard ${shardId} has disconnected.`);
    sendStatusMessage(`Shard ${shardId} is offline.`);
});

// * Event listener when bot reconnects
client.on('shardReconnecting', (shardId) => {
    console.warn(`Shard ${shardId} is reconnecting...`);
    sendStatusMessage(`Shard ${shardId} is reconnecting...`);
});

// * Event listener when bot resumes
client.on('shardResume', (shardId) => {
    console.log(`Shard ${shardId} has resumed connection.`);
    sendStatusMessage(`Shard ${shardId} is back online.`);
});

const milestoneLevels = [3, 5, 9, 14, 15];
const cooldowns = new Map();

// * Message handling
client.on('messageCreate', async message => {
    try {
        if (message.author.bot) return;

        const prefix = "!";

        // Declare userId, guild, and member only once
        const userId = message.author.id;
        const guild = message.guild;
        const member = guild.members.cache.get(userId);

        if (!message.content.startsWith(prefix)) {
            const now = Date.now();
            const cooldownAmount = 60 * 1000; // 60 seconds

            if (cooldowns.has(userId)) {
                const expirationTime = cooldowns.get(userId) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    console.log(`User ${message.author.username} is on cooldown. ${timeLeft.toFixed(1)} seconds remaining.`);
                    return; // User is on cooldown, so do not award XP
                }
            }

            cooldowns.set(userId, now);

            // Check if the channel is blacklisted
            if (data.blacklistedChannels.includes(message.channel.id)) {
                console.log(`Message in blacklisted channel (${message.channel.name}) ignored.`);
                return;
            }

            // Handle XP addition
            if (!data.users[userId]) {
                data.users[userId] = { xp: 0, level: 1 };
            }

            let user = data.users[userId];
            const xpGain = Math.floor(Math.random() * 5) + 5; // Gain 5-10 XP per message
            user.xp += xpGain;

            const level = user.level;
            const x = 100; // base multiplier
            const y = 1.1; // scaling factor

            const xpNeededForCurrentLevel = Math.floor(level * x * Math.pow(y, level));
            const xpNeededForNextLevel = Math.floor((level + 1) * x * Math.pow(y, level + 1));

            // To calculate the XP needed to go from the current level to the next level:
            const xpForNextLevel = xpNeededForNextLevel - xpNeededForCurrentLevel;

            console.log(`XP needed to level up from ${level} to ${level + 1}: ${xpForNextLevel}`);


            if (user.xp >= xpForNextLevel) {
                user.level++;
                user.xp -= xpForNextLevel;

                if (milestoneLevels.includes(user.level)) {
                    message.channel.send(`🎉 Congrats <@${message.author.id}>! You've reached level ${user.level}! This is a milestone level!`);
                } else {
                    message.channel.send(`${message.author.username} leveled up to level ${user.level}!`);
                }

                await manageRoles(member, user.level, guild, message);
            }

            saveData();
            return;
        }

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        // ! Lock command to set the allowed channel
        if (command === "setrankchannel") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const channel = message.mentions.channels.first() || message.channel;
            data.allowedChannel = channel.id;
            saveData();

            return message.channel.send(`Commands !checkrole and !rank are now restricted to ${channel.name}.`);
        }

        // ! Unset rank channel command
        if (command === "unsetrankchannel") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            data.allowedChannel = null;
            saveData();

            return message.channel.send(`Commands !checkrole and !rank are no longer restricted to a specific channel.`);
        }

        // ? View blacklist and rank channel
        if (command === "viewsettings") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const blacklistedChannels = data.blacklistedChannels.map(id => `<#${id}>`).join("\n") || "No blacklisted channels.";
            const rankChannel = data.allowedChannel ? `<#${data.allowedChannel}>` : "No rank channel set.";

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Server Settings")
                .addFields(
                    { name: "Blacklisted Channels", value: blacklistedChannels, inline: true },
                    { name: "Rank Channel", value: rankChannel, inline: true }
                )
                .setFooter({ text: "Use the appropriate commands to manage these settings.", iconURL: client.user.displayAvatarURL() });

            return message.channel.send({ embeds: [embed] });
        }

        // ! Blacklist command accepting channel IDs
        if (command === "blacklist") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const channelIds = args;
            if (channelIds.length === 0) {
                return message.channel.send("Please provide at least one channel ID to blacklist.");
            }

            let addedChannels = [];
            for (const channelId of channelIds) {
                if (!data.blacklistedChannels.includes(channelId)) {
                    data.blacklistedChannels.push(channelId);
                    addedChannels.push(channelId);
                }
            }
            saveData();

            const addedChannelsMention = addedChannels.map(id => `<#${id}>`).join(", ");
            return message.channel.send(addedChannels.length > 0 ? `Blacklisted channels: ${addedChannelsMention}` : "No new channels were blacklisted.");
        }

        // ! Unblacklist command accepting channel IDs
        if (command === "unblacklist") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const channelIds = args;
            if (channelIds.length === 0) {
                return message.channel.send("Please provide at least one channel ID to unblacklist.");
            }

            let removedChannels = [];
            data.blacklistedChannels = data.blacklistedChannels.filter(id => {
                if (channelIds.includes(id)) {
                    removedChannels.push(id);
                    return false;
                }
                return true;
            });
            saveData();

            const removedChannelsMention = removedChannels.map(id => `<#${id}>`).join(", ");
            return message.channel.send(removedChannels.length > 0 ? `Unblacklisted channels: ${removedChannelsMention}` : "No channels were removed from the blacklist.");
        }

        // ? Skip leveling in blacklisted channels
        if (data.blacklistedChannels.includes(message.channel.id)) {
            console.log(`Message in blacklisted channel (${message.channel.name}) ignored.`);
            return;
        }

        // * Rank command
        if (command === "rank") {
            try {
                const userId = message.author.id;
                const user = data.users[userId];

                if (!user) {
                    message.channel.send("You haven't earned any XP yet!");
                    return;
                }

                const level = user.level;
                const xp = user.xp;
                const xpForNextLevel = level * 250;

                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(`${message.author.username}'s Rank`)
                    .setDescription(`Level: ${level}`)
                    .addFields(
                        { name: 'XP', value: `${xp}/${xpForNextLevel} XP`, inline: true },
                        { name: 'Rank', value: `#${getRank(userId)}`, inline: true }
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setFooter({ text: `Keep chatting to level up!`, iconURL: client.user.displayAvatarURL() });

                await message.channel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Error in rank command:', error);
                message.channel.send("There was an error retrieving your rank.");
            }
        }

        // ? Check role command
        if (command === "checkrole") {
            try {
                const member = message.guild.members.cache.get(message.author.id);
                const roles = member.roles.cache
                    .filter(role => role.name !== '@everyone')
                    .map(role => role.name)
                    .join(", ");

                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(`${message.author.username}'s Roles`)
                    .setDescription(roles || "You don't have any special roles.")
                    .setThumbnail(message.author.displayAvatarURL())
                    .setFooter({ text: "Role Checker", iconURL: client.user.displayAvatarURL() });

                await message.channel.send({ embeds: [embed] });
            } catch (error) {
                console.error('Error in checkrole command:', error);
                message.channel.send("There was an error retrieving your roles.");
            }
        }

        if (!data.users[userId]) {
            data.users[userId] = {
                xp: 0,
                level: 1
            };
        }
    }
    catch (error) {
        console.error('An error occurred:', error);

        // Debugging and fallback mechanism
        const logChannel = client.channels.cache.get(loggingChannelId); // Replace with the ID of your designated log channel
        console.log('Attempting to send error message to log channel:', logChannel ? logChannel.name : 'Log channel not found');

        if (message.channel.permissionsFor(client.user).has('SEND_MESSAGES')) {
            // If the bot has permission to send messages in the current channel
            await message.channel.send('Contact Admin: **Error 28a**').catch(err => console.error('Failed to send message in original channel:', err));
        } else if (logChannel) {
            // If the bot doesn't have permission, send the error message to a designated log channel
            await logChannel.send(`Error 28a occurred in ${message.channel.name}, but the bot lacks permissions to send messages there.`)
                .catch(err => console.error('Failed to send message in log channel:', err));
        } else {
            // If no fallback channel is available, just log the error
            console.error('Bot lacks permission to send messages and no log channel is set.');
        }

        // Optionally rethrow the error if you want the bot to crash after this
        throw error;
    }
});

async function manageRoles(member, level, guild, message) {
    const roles = {
        3: 'Certified Soldier',
        5: 'Soldier with rizz 😎',
        9: 'Soldier with a noble kid 🧒',
        14: 'Soldier that left for milk🥛',
        15: 'A Disappointment'
    };

    try {
        // Remove previous roles at level 15
        if (level === 15) {
            for (let lvl in roles) {
                if (member.roles.cache.some(role => role.name === roles[lvl])) {
                    const role = guild.roles.cache.find(r => r.name === roles[lvl]);
                    if (role) {
                        await member.roles.remove(role);
                        console.log(`Removed role ${roles[lvl]} from ${member.user.username}`);
                    }
                }
            }
        }

        // Add the new role for the current level
        if (roles[level]) {
            const role = guild.roles.cache.find(r => r.name === roles[level]);
            if (role) {
                await member.roles.add(role);
                console.log(`Assigned role ${roles[level]} to ${member.user.username}`);
            } else {
                console.error(`Role ${roles[level]} not found in the server.`);
            }
        } else {
            console.log(`No role configured for level ${level}`);
        }
    } catch (error) {
        console.error(`Failed to manage roles for ${member.user.username}:`, error);
        message.channel.send(`Contact Admin: **Error 71a**`);
    }
}

function getRank(userId) {
    const sortedUsers = Object.entries(data.users).sort((a, b) => {
        if (b[1].level === a[1].level) {
            return b[1].xp - a[1].xp;
        }
        return b[1].level - a[1].level;
    });

    const rank = sortedUsers.findIndex(([id]) => id === userId) + 1;
    return rank;
}

// * Send status to logging channel
async function sendStatusMessage(status) {
    const logChannel = client.channels.cache.get(loggingChannelId);
    if (!logChannel) {
        console.error('Logging channel not found.');
        return;
    }

    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`Bot Status Update`)
        .setDescription(`The bot is now **${status}**.`)
        .setTimestamp();

    try {
        await logChannel.send({ embeds: [embed] });
        console.log(`Sent status update: ${status}`);
    } catch (error) {
        console.error(`Failed to send status update to ${logChannel.name}:`, error);
    }
}

client.login(process.env.TOKEN);
