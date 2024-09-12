const { PermissionsBitField } = require('discord.js');
const { EmbedBuilder } = require('@discordjs/builders');
const { saveServerConfigsData, ensureServerData, saveData } = require('../utils');

const fs = require('fs');


module.exports = {
    // * FIXED
    setprefix: {
        execute: async (message, args, client, serverConfigsData) => {
            const serverId = message.guild.id;
            const guild = message.guild;
    
            // Check if the user has permission to change the prefix
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                const logChannelId = serverConfigsData[serverId]?.loggingChannelId;
                const logChannel = message.client.channels.cache.get(logChannelId);
    
                if (logChannel) {
                    logChannel.send(`<@${message.author.id}> tried to change the bot prefix but lacks permissions.`);
                } else {
                    console.log(`No logging channel set for ${serverId}`);
                }
                return;
            }
    
            // Get the new prefix from args
            const newPrefix = args[0];
            if (!newPrefix) {
                return message.channel.send("Please provide a new prefix.");
            }
    
            // Ensure the new prefix is a string
            if (typeof newPrefix !== 'string') {
                return message.channel.send("Invalid prefix. Please provide a valid string.");
            }
    
            // Ensure the server configuration data exists
            ensureServerData(serverId, guild);
    
            // Set the new prefix in serverConfigsData
            serverConfigsData[serverId].prefix = newPrefix;
    
            // Save the updated serverConfigsData to the correct file
            try {
                console.log(serverConfigsData);
                fs.writeFileSync("json/serverConfigs.json", JSON.stringify(serverConfigsData, null, 4));
            } catch (error) {
                console.error("Error while saving serverConfigsData:", error);
                return message.channel.send("An error occurred while saving the new prefix.");
            }
    
            return message.channel.send(`Prefix has been updated to \`${newPrefix}\``);
        },
    },

    // * FIXED
    setlevels: {
        execute: async (message, args, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            // Step 1: Send an initial embed asking for levels input
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Set Milestone Levels")
                .setDescription("Please provide the levels you want to set as milestones, separated by spaces (e.g., `5 10 15`).")
                .setFooter({ text: "You have 60 seconds to respond." });
    
            await message.channel.send({ embeds: [embed] });
    
            // Step 2: Await response from the user
            const filter = response => response.author.id === message.author.id;
            const collectedLevels = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
            if (!collectedLevels || collectedLevels.size === 0) {
                return message.channel.send("You did not respond in time. Please run the command again.");
            }
    
            // Step 3: Process the user input
            const levelInput = collectedLevels.first().content;
            const levels = levelInput.split(' ').map(level => parseInt(level)).filter(level => !isNaN(level)).sort((a, b) => a - b);
    
            if (levels.length === 0) {
                return message.channel.send("Invalid input. Please provide valid levels, e.g., `5 10 15`.");
            }
    
            // Step 4: Save the levels to the data and update immediately
            data[message.guild.id].milestoneLevels = levels;
    
            // Save data immediately
            await fs.writeFileSync('./json/users.json', JSON.stringify(data, null, 4));
    
            // Step 5: Send confirmation message
            const confirmationEmbed = new EmbedBuilder()
                .setColor(0x57f287) // Green for success
                .setTitle("Milestone Levels Updated")
                .setDescription(`Milestone levels have been updated to: ${levels.join(', ')}`)
                .setFooter({ text: "Levels successfully set!" });
    
            return message.channel.send({ embeds: [confirmationEmbed] });
        },
    },
        
    // * FIXED
    setroles: {
        execute: async (message, args, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            if (!data[message.guild.id].milestoneLevels || data[message.guild.id].milestoneLevels.length === 0) {
                return message.channel.send("No milestone levels have been set. Please set milestone levels before assigning roles.");
            }

            const initialEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Set Roles for Milestone Levels")
                .setDescription("Respond with the level and role ID you want to update, separated by a space. You can set multiple levels at once by separating them with commas.\n\n**Example:** `5 123456789012345678, 10 123456789012345678, 15 123456789012345678`")
                .addFields(
                    {
                        name: "Current Milestone Levels",
                        value: data[message.guild.id].milestoneLevels.join(', ') || "no levels set. Run !setlevels to set levels",
                        inline: true
                    },
                    {
                        name: "Current Roles",
                        value: data[message.guild.id].milestoneLevels.map(level => {
                            const roleId = data[message.guild.id].roles[level];
                            const roleMention = roleId ? `<@&${roleId}>` : "Not set";
                            return `${level}: ${roleMention}`;
                        }).join('\n'),
                        inline: true
                    }
                )
                .setFooter({ text: "Use the correct format to update roles.", iconURL: message.client.user.displayAvatarURL() });

            await message.channel.send({ embeds: [initialEmbed] });

            const filter = response => response.author.id === message.author.id;
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);

            if (!collected || collected.size === 0) return message.channel.send("You did not respond in time. Run the command again to update roles.");

            const response = collected.first().content.trim();
            const updates = response.split(',').map(entry => entry.trim().split(' '));
            let updatedLevels = [];

            for (const [levelStr, roleId] of updates) {
                const level = parseInt(levelStr, 10);
                if (isNaN(level) || !roleId) {
                    return message.channel.send(`Invalid format for level ${levelStr}. Make sure you provide both the level and the role ID. For example -> "5 123[...], 10 123[...]"`);
                }

                if (!data[message.guild.id].roles) {
                    data[message.guild.id].roles = {};
                }

                data[message.guild.id].roles[level] = roleId;
                updatedLevels.push(level);
            }

            await fs.writeFileSync('./json/users.json', JSON.stringify(data, null, 4));

            const updatedLevelsString = updatedLevels.map(level => `${level}: <@&${data[message.guild.id].roles[level]}>`).join('\n');
            const confirmationEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Roles Updated")
                .setDescription(`The following roles have been updated:\n${updatedLevelsString}`);

            return message.channel.send({ embeds: [confirmationEmbed] });
        },
    },

    // * FIXED
    viewsettings: {
        execute: (message, args, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const serverId = message.guild.id;
            const blacklistedChannels = serverConfigsData[serverId].blacklistedChannels.map(id => `<#${id}>`).join("\n") || "No blacklisted channels.";
            const rankChannel = serverConfigsData[serverId].allowedChannel ? `<#${serverConfigsData[serverId].allowedChannel}>` : "No rank channel set.";
            const setlogchannel = serverConfigsData[serverId].loggingChannelId ? `<#${serverConfigsData[serverId].loggingChannelId}>` : "No log channel set.";
            const guildName = serverConfigsData[serverId].name;
            const setLevels = data[serverId].milestoneLevels.map(id => `${id}`).join(", ") || "No levels set";
            const setRoles = Object.keys(data[serverId].roles).map(roles => `<@&${data[serverId].roles[roles]}>`).join(', ') || "No roles set";
            const setBadges = badgesData[serverId] && badgesData[serverId].badges
            ? Object.keys(badgesData[serverId].badges).map(badgeKey => { 
                const badge = badgesData[serverId].badges[badgeKey]; 
                return `${badge.emoji} ${badge.name}`; 
            }).join(', ') || "No badges set"
            : "No badges set";
            const setPrefix = serverConfigsData[serverId].prefix || "!";
        
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`Server Settings for ${guildName}`)
                .addFields(
                    { name: "Blacklisted Channels", value: blacklistedChannels, inline: true },
                    { name: "Rank Channel", value: rankChannel, inline: true },
                    { name: "Log Channel", value: setlogchannel, inline: true },
                    { name: "Set Levels", value: setLevels, inline: true },
                    { name: "Set Roles", value: setRoles, inline: true },
                    { name: "Badges", value: setBadges, inline: true },
                    { name: "Prefix", value: `\`${setPrefix}\``, inline: true }
                )
                .setFooter({ text: "Use the appropriate commands to manage these settings.", iconURL: message.client.user.displayAvatarURL() });

            return message.channel.send({ embeds: [embed] });
        },
    },

    // * FIXED
    blacklist: {
        execute: (message, args, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const mentionedChannel = message.mentions.channels.first();
            const channelIds = mentionedChannel ? mentionedChannel.id : args;
            if (channelIds.length === 0) {
                return message.channel.send("Please provide at least one channel ID to blacklist.");
            }
    
            const serverId = message.guild.id;
            let addedChannel = [];
    
            console.log("Initial blacklistedChannels:", serverConfigsData[serverId].blacklistedChannels);
    
            for (const channelId of channelIds) {
                console.log(`Processing channel ID: ${channelId}`);
    
                if (!serverConfigsData[serverId].blacklistedChannels.includes(channelId)) {
                    serverConfigsData[serverId].blacklistedChannels.push(channelId);
                    addedChannel.push(channelId);
                    console.log(`Channel ID ${channelId} added to blacklist`);
                } else {
                    console.log(`Channel ID ${channelId} already blacklisted`);
                }
            }
    
            // Pass serverConfigsData when saving
            saveServerConfigsData(serverConfigsData);
    
            const addedChannelMention = addedChannel.map(id => `<#${id}>`).join(", ");
            return message.channel.send(addedChannel.length > 0 ? `Blacklisted channels: ${addedChannelMention}` : "No new channels were blacklisted.");
        },
    },       

    // * FIXED
    unblacklist: {
        execute: (message, args, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const mentionedChannel = message.mentions.channels.first();
            const channelIds = mentionedChannel ? mentionedChannel.id : args[0];
            if (channelIds.length === 0) {
                return message.channel.send("Please provide at least one channel ID to unblacklist.");
            }

            const serverId = message.guild.id;
            let removedChannels = [];
            serverConfigsData[serverId].blacklistedChannels = serverConfigsData[serverId].blacklistedChannels.filter(id => {
                if (channelIds.includes(id)) {
                    removedChannels.push(id);
                    return false;
                }
                return true;
            });
            saveServerConfigsData(serverConfigsData);

            const removedChannelsMention = removedChannels.map(id => `<#${id}>`).join(", ");
            return message.channel.send(removedChannels.length > 0 ? `Unblacklisted channels: ${removedChannelsMention}` : "No channels were removed from the blacklist.");
        },
    },

    // * FIXED
    setlogchannel: {
        execute: async (message, args, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            const client = message.client;
            
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const mentionedChannel = message.mentions.channels.first();
            const channelId = mentionedChannel ? mentionedChannel.id : args[0];

            if (!channelId) {
                return message.channel.send("Please provide a channel ID to set a log channel.");
            }

            const serverId = message.guild.id;
            serverConfigsData[serverId].loggingChannelId = channelId;
            saveServerConfigsData(serverConfigsData);

            const logChannel = client.channels.cache.get(channelId);

            await message.channel.send(`Log channel has been set to <#${channelId}>.`);

            if (logChannel) {
                await logChannel.send(`This channel has been set to the Leveling Bot Logging channel`)
            }
        },
    },

    // * FIXED
    unsetlogchannel: {
        execute: (message, args, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const serverId = message.guild.id;
            serverConfigsData[serverId].loggingChannelId = null;
            saveServerConfigsData(serverConfigsData);

            return message.channel.send("Logging channel has been unset.");
        },
    },

    // * FIXED
    setrankchannel: {
        execute: (message, args, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const mentionedChannel = message.mentions.channels.first();
            const channelId = mentionedChannel ? mentionedChannel.id : args[0];

            if (!channelId) {
                return message.channel.send("Please provide a channel ID to set the rank check channel.");
            }

            const serverId = message.guild.id;

            serverConfigsData[serverId].allowedChannel = channelId;
            saveServerConfigsData(serverConfigsData);

            return message.channel.send(`Community commands (like \`rank\` and \`profile\`) are now restricted to <#${channelId}>.`);
        },
    },

    // * FIXED
    unsetrankchannel: {
        execute: (message, args, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const serverId = message.guild.id;
            serverConfigsData[serverId].allowedChannel = null;
            saveServerConfigsData(serverConfigsData);

            return message.channel.send(`Commands \`!checkrole\` and \`!rank\` are no longer restricted to a specific channel.`);
        },
    },

    // * FIXED
    toggleconfirm: {
        execute: async (message, args, client, serverConfigsData) => {
            // Step 1: Check if the user has permission
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
    
            // Ensure the server's data exists
            if (!serverConfigsData[serverId]) {
                serverConfigsData[serverId] = {
                    name: message.guild.name,
                    blacklistedChannels: [],
                    allowedChannel: null,
                    loggingChannelId: null,
                    prefix: "!",
                    requireConfirm: false // Default setting for confirmation
                };
            }
    
            // Toggle the `requireConfirm` setting
            serverConfigsData[serverId].requireConfirm = !serverConfigsData[serverId].requireConfirm;
            saveServerConfigsData(serverConfigsData);
    
            // Create an embedded message to confirm the action
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Confirmation Setting Toggled")
                .setDescription(`The confirmation setting has been **${serverConfigsData[serverId].requireConfirm ? "enabled" : "disabled"}**.`)
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
            // Send the embedded message
            await message.channel.send({ embeds: [embed] });
        },
    },
};
