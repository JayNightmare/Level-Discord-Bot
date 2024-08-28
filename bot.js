const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const { EmbedBuilder } = require('@discordjs/builders');
require('dotenv').config();
const fs = require('fs');
const { log } = require('console');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const usersFilePath = 'users.json';

// ? Load data from the file
let data;
if (fs.existsSync(usersFilePath)) {
    data = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
} else {
    data = {}; // * Initialize an empty data object if file doesn't exist
    saveData(); // * Save the initial structure to the file
}

// * Helper function to save data
function saveData() {
    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 4));
}

// * Ensure data structure exists for the specific server
function ensureServerData(serverId) {
    if (!data[serverId]) {
        data[serverId] = {
            users: {},
            blacklistedChannels: [],
            allowedChannel: null,
            milestoneLevels: [],
            roles: {},
            loggingChannelId: null
        };
        saveData(); // Save the data structure to the file
    }

    if (!data[serverId].blacklistedChannels) {
        data[serverId].blacklistedChannels = [];
    }
}

// * Reusable function for logging serverId
function sendLogMessage(serverId, messageText) {
    const logChannelId = data[serverId]?.loggingChannelId;
    if (logChannelId) {
        const logChannel = client.channels.cache.get(logChannelId);
        if (logChannel) {
            logChannel.send(messageText);
        } else {
            console.log(`Log channel not found or bot lacks access to the specified channel for server ${serverId}.`);
        }
    } else {
        console.log(`No logging channel set for server ${serverId}.`);
    }
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
client.on('ready', () => {
    console.log('Bot is online!');
    // Example: Send status update to all servers
    Object.keys(data).forEach(serverId => {
        sendStatusMessage(serverId, 'online');
    });
});

client.on('shutdown', () => {
    console.log('Bot is shutting down...');
    Object.keys(data).forEach(serverId => {
        sendStatusMessage(serverId, 'offline');
    });
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

const cooldowns = new Map();

// TODO: Message handling
client.on('messageCreate', async message => {
    try {
        if (message.author.bot) return;

        const prefix = "!";
        const serverId = message.guild.id;
        const userId = message.author.id;

        ensureServerData(serverId);

        const guild = message.guild;
        const member = guild.members.cache.get(userId);

        if (!message.content.startsWith(prefix)) {
            const now = Date.now();
            const cooldownAmount = 60 * 1000; // ! 60 seconds

            if (cooldowns.has(userId)) {
                const expirationTime = cooldowns.get(userId) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    console.log(`User ${message.author.username} is on cooldown. ${timeLeft.toFixed(1)} seconds remaining.`);
                    return; // User is on cooldown, so do not award XP
                }
            }

            cooldowns.set(userId, now);

            // * Check if the channel is blacklisted
            if (data[serverId].blacklistedChannels.includes(message.channel.id)) {
                console.log(`Message in blacklisted channel (${message.channel.name}) ignored.`);
                return;
            }

            // * Handle XP addition
            if (!data[serverId].users[userId]) {
                data[serverId].users[userId] = { xp: 0, level: 1 };
            }

            let user = data[serverId].users[userId];
            const xpGain = Math.floor(Math.random() * 5) + 5; // Gain 5-10 XP per message
            user.xp += xpGain;

            const level = user.level;
            const x = 100; // * base multiplier
            const y = 1.1; // * scaling factor

            const xpNeededForCurrentLevel = Math.floor(level * x * Math.pow(y, level));
            const xpNeededForNextLevel = Math.floor((level + 1) * x * Math.pow(y, level + 1));

            // To calculate the XP needed to go from the current level to the next level:
            const xpForNextLevel = xpNeededForNextLevel - xpNeededForCurrentLevel;

            console.log(`XP needed to level up from ${level} to ${level + 1}: ${xpForNextLevel}`);


            if (user.xp >= xpForNextLevel) {
                user.level++;
                user.xp -= xpForNextLevel;

                if (data[serverId].milestoneLevels.includes(level)) {
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

        if (command === "help") {
            try {
                const helpEmbed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle("Bot Commands")
                    .addFields(
                        {
                            name: "Commands",
                            value: `
                            • **!setrankchannel**\n
                            • **!unsetrankchannel**\n
                            • **!setlogchannel**\n
                            • **!viewsettings**\n
                            • **!blacklist**\n
                            • **!unblacklist**\n
                            • **!rank**\n
                            • **!checkrole**\n
                            • **!setlevels**\n
                            • **!setroles**\n
                            • **!help**
                            `,
                            inline: true
                        },
                        {
                            name: "Descriptions",
                            value: `
                            Set the rank check channel.\n
                            Unset the rank check channel.\n
                            Set the log channel.\n
                            View current settings.\n
                            Blacklist channels.\n
                            Unblacklist channels.\n
                            View your rank.\n
                            Check your roles.\n
                            Set milestone levels.\n
                            Set milestone roles.\n
                            Display help.
                            `,
                            inline: true
                        }
                    )
                    .setFooter({ text: "Use the commands correctly to manage the bot's functions.", iconURL: client.user.displayAvatarURL() });
        
                return message.channel.send({ embeds: [helpEmbed] });
            } catch (error) {
                console.error('An error occurred while creating the help embed:', error);
                message.channel.send('An error occurred while generating the help message. Please contact the admin. **Error code: 0hb**');
            }
        }

        // ? View blacklist and rank channel
        if (command === "viewsettings") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const blacklistedChannels = data[serverId].blacklistedChannels.map(id => `<#${id}>`).join("\n") || "No blacklisted channels.";
            const rankChannel = data[serverId].allowedChannel ? `<#${data[serverId].allowedChannel}>` : "No rank channel set.";
            const setlogchannel = data[serverId].loggingChannelId ? `<#${data[serverId].loggingChannelId}>` : "No log channel set."

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Server Settings")
                .addFields(
                    { name: "Blacklisted Channels", value: blacklistedChannels, inline: true },
                    { name: "Rank Channel", value: rankChannel, inline: true },
                    { name: "Log Channel", value: setlogchannel, inline: true }
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

            let addedChannel = [];
            for (const channelId of channelIds) {
                if (!data[serverId].blacklistedChannels.includes(channelId)) {
                    data[serverId].blacklistedChannels.push(channelId);
                    addedChannel.push(channelId);
                }
            }
            saveData();

            const addedChannelMention = addedChannel.map(id => `<#${id}>`).join(", ");
            return message.channel.send(addedChannel.length > 0 ? `Blacklisted channels: ${addedChannelMention}` : "No new channels were blacklisted.");
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
            data[serverId].blacklistedChannels = data[serverId].blacklistedChannels.filter(id => {
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

        // ! Command to set the logging channel
        if (command === "setlogchannel") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const channelId = args[0];
            if (!channelId) {
                return message.channel.send("Please provide a channel ID to set a log channel.");
            }

            data[serverId].loggingChannelId = channelId;
            saveData();

            const logChannel = client.channels.cache.get(channelId);
            const channelName = logChannel ? logChannel.name : "Unknown Channel";

            await message.channel.send(`Log channel has been set to <#${channelId}>.`);

            // ? Can remove later -> Sends a message to the new logging channel 
            if (logChannel) {
                await logChannel.send(`This channel has been set to the Leveling Bot Logging channel`)
            }
        }

        // ! Command to unset the logging channel
        if (command === "unsetlogchannel") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            data[serverId].loggingChannelId = null;
            saveData();

            sendLogMessage(serverId, "Logging channel has been unset.");
            return message.channel.send("Logging channel has been unset.");
        }

        // ? Skip leveling in blacklisted channels
        if (data[serverId].blacklistedChannels.includes(message.channel.id)) {
            console.log(`Message in blacklisted channel (${message.channel.name}) ignored.`);
            return;
        }

        function getRank(userId) {
            const serverData = data[serverId];
            if (!serverData || !serverData.users) {
                return null; // Handle case where server data doesn't exist
            }

            const sortedUsers = Object.entries(serverData.users).sort((a, b) => {
                if (b[1].level === a[1].level) {
                    return b[1].xp - a[1].xp;
                }
                return b[1].level - a[1].level;
            });

            const rank = sortedUsers.findIndex(([id]) => id === userId) + 1;
            return rank;
        }

        // * Rank command
        if (command === "rank") {
            try {
                const userId = message.author.id;
                const user = data[serverId].users[userId];

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
        if (command === "checkroles") {
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

        // ! Lock command to set the allowed channel
        if (command === "setrankchannel") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const channelId = args[0];
            if (!channelId) {
                return message.channel.send("Please provide a channel ID to set the rank check channel");
            }

            if (!data[serverId].allowedChannel) {
                data[serverId].allowedChannel = [];
            }

            data[serverId].allowedChannel = channelId;
            saveData();

            return message.channel.send(`Commands !checkrole and !rank are now restricted to <#${channelId}>.`);
        }

        // ! Unset rank channel command
        if (command === "unsetrankchannel") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            data[serverId].allowedChannel = null;
            saveData();

            return message.channel.send(`Commands !checkrole and !rank are no longer restricted to a specific channel.`);
        }

        // ! Command to set milestone levels
        if (command === "setlevels") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const levels = args.map(level => parseInt(level)).filter(level => !isNaN(level)).sort((a, b) => a - b);
            if (levels.length === 0) {
                return message.channel.send("Please provide valid levels, e.g., `!setlevels 5 10 15`.");
            }

            data[serverId].milestoneLevels = levels;
            saveData();
            return message.channel.send(`Milestone levels updated to: ${levels.join(', ')}`);
        }

        // ! Command to set roles for milestone levels
        if (command === "setroles") {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            // ! DO NOT DELETE
            if (!data[serverId].milestoneLevels || data[serverId].milestoneLevels.length === 0) {
                return message.channel.send("No milestone levels have been set. Please set milestone levels before assigning roles.");
            }

            // Create an embed to display current milestone levels and associated roles
            const initialEmbed  = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Set Roles for Milestone Levels")
                .setDescription("Respond with the level and role ID you want to update, separated by a space. You can set multiple levels at once by separating them with commas.\n\n**Example:** `5 123456789012345678, 10 123456789012345678, 15 123456789012345678`")
                .addFields(
                    {
                        name: "Current Milestone Levels",
                        value: data[serverId].milestoneLevels.join(', ') || "no levels set. Run !setlevels to set levels",
                        inline: true
                    },
                    {
                        name: "Current Roles",
                        value: data[serverId].milestoneLevels.map(level => {
                            const roleId = data[serverId].roles[level];
                            const roleMention = roleId ? `<@&${roleId}>` : "Not set";
                            return `${level}: ${roleMention}`;
                        }).join('\n'),
                        inline: true
                    }
                )
                .setFooter({ text: "Use the correct format to update roles.", iconURL: client.user.displayAvatarURL() });

            await message.channel.send({ embeds: [initialEmbed ] });

            // * Collect user data response
            const filter = response => response.author.id === message.author.id;
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);

            if (!collected || collected.size === 0) return message.channel.send("You did not respond in time. Run command again to update roles.");

            const response = collected.first().content.trim();

            const updates = response.split(',').map(entry => entry.trim().split(' '));
            let updatedLevels = [];

            // * Parse the response
            for (const [levelStr, roleId] of updates) {
                const level = parseInt(levelStr, 10);
                if (isNaN(level) || !roleId) {
                    return message.channel.send(`Invalid format for level ${levelStr}. Make sure you provide both the level and hte role ID. For example -> "5 123[...], 10 123[...]"`)
                }

                if (!data[serverId].roles) {
                    data[serverId].roles = {};
                }

                // ? Update the role of a given level 
                data[serverId].roles[level] = roleId;
                updatedLevels.push(level);
            }

            // * Update role for the given level
            saveData();

            const updatedLevelsString = updatedLevels.map(level => `${level}: <@&${data[serverId].roles[level]}>`).join('\n');
            const confirmationEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Roles Updated")
                .setDescription(`The following roles have been updated:\n${updatedLevelsString}`);

            // * Send confirmation
            return message.channel.send({ embeds: [confirmationEmbed] });
        }

        if (!data[serverId].users[userId]) {
            data[serverId].users[userId] = {
                xp: 0,
                level: 1
            };
        }
    }
    catch (error) {
        console.error('An error occurred:', error);

        const serverId = message.guild.id;

        // * Gets logging channel id from specific server
        const loggingChannelId = data[serverId]?.logChannelId;
        // * Retrieve logging channel from client cache
        const logChannel = client.channels.cache.get(loggingChannelId);

        if (message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.SendMessages)) {
            // * Send the message if the bot has the permission
            await message.channel.send('Contact Admin: **Error 28a**').catch(err => console.error('Failed to send message in original channel:', err));
        } else {
            if (logChannel) {
                await logChannel.send(`Error 28a occurred in ${message.channel.name}, but the bot lacks permissions to send messages there.`)
                    .catch(err => console.error('Failed to send message in log channel:', err));
            } else {
                console.error('Bot lacks permission to send messages and no log channel is set.');
            }
        }

        throw error;
    }
});

async function manageRoles(member, level, guild, message) {
    const serverId = guild.id;
    ensureServerData(serverId); // * Ensure the server data structure exists

    const roles = data[serverId].roles; // Fetch the roles for this server
    const milestoneLevels = data[serverId].milestoneLevels; // Fetch milestone levels for this server

    try {
        // Remove previous roles if the user reaches level 15
        if (serverId === 1274891590992920628 && level === 15) {
            for (let lvl of milestoneLevels) {
                const roleId = roles[lvl];
                if (roleId && member.roles.cache.has(roleId)) {
                    await member.roles.remove(roleId);
                    console.log(`Removed role with ID ${roleId} from ${member.user.username}`);
                }
            }
        }

        // Add the new role for the current level if it exists
        const roleId = roles[level];
        if (roleId) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
                await member.roles.add(role);
                console.log(`Assigned role ${role.name} to ${member.user.username}`);
            } else {
                console.error(`Role with ID ${roleId} not found in the server.`);
            }
        } else {
            console.log(`No role configured for level ${level}`);
        }
    } catch (error) {
        console.error(`Failed to manage roles for ${member.user.username}:`, error);
        await message.channel.send(`Contact Admin: **Error 71a**`);
    }
}

// * Send status to logging channel
async function sendStatusMessage(serverId, status) {
    // * Retrieve the logging channel ID for the specific server
    const loggingChannelId = data[serverId]?.loggingChannelId;

    // * Check if the logging channel ID is set and valid
    if (!loggingChannelId) {
        console.error(`Logging channel not found for server: ${serverId}.`);
        return;
    }

    // * Get the logging channel from the client's cache
    const logChannel = client.channels.cache.get(loggingChannelId);
    if (!logChannel) {
        console.error(`Logging channel not found in the client's cache for server: ${serverId}.`);
        return;
    }

    // * Create the embed message
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`Bot Status Update`)
        .setDescription(`The bot is now **${status}**.`)
        .setTimestamp();

    try {
        // * Send the embed message to the logging channel
        await logChannel.send({ embeds: [embed] });
        console.log(`Sent status update: ${status} to ${logChannel.name} in server ${serverId}`);
    } catch (error) {
        console.error(`Failed to send status update to ${logChannel.name} in server ${serverId}:`, error);
    }
}


client.login(process.env.TOKEN);