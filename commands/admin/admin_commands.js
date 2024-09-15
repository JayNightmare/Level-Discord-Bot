const { PermissionsBitField } = require('discord.js');
const { EmbedBuilder } = require('@discordjs/builders');
const { ensureUserData,
        ensureServerData,
        saveData,
        saveBadgesData,
        saveServerConfigsData,
        saveOwnerData,
        addBadge,
        sendLogMessage,
        sendStatusMessage,
        notifyUpdate,
        getUserData,
        getBadgesData,
        getServerConfigsData,
        getOwnerData,
        getUserBadges,
        updateUserBio,
        isMilestoneLevel,
        getRolesForLevel,
        getMilestoneLevels,
        saveMilestoneLevels,
        saveRoleForLevel,
        getMilestoneLevelsFromDB,
        getRolesFromDB,
        getBadgesFromDB } = require('../utils');
        

// ! REMOVE
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
        execute: async (message, args, data, serverConfigsData, badgesData, saveData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }

            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Set Milestone Levels")
                .setDescription("Please provide the levels you want to set as milestones, separated by spaces (e.g., `5 10 15`).")
                .setFooter({ text: "You have 60 seconds to respond." });

            await message.channel.send({ embeds: [embed] });

            const filter = response => response.author.id === message.author.id;
            const collectedLevels = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);

            if (!collectedLevels || collectedLevels.size === 0) {
                return message.channel.send("You did not respond in time. Please run the command again.");
            }

            const levelInput = collectedLevels.first().content;
            const levels = levelInput.split(' ').map(level => parseInt(level)).filter(level => !isNaN(level)).sort((a, b) => a - b);

            if (levels.length === 0) {
                return message.channel.send("Invalid input. Please provide valid levels, e.g., `5 10 15`.");
            }

            // Save the levels to the database
            await saveMilestoneLevels(message.guild.id, levels);

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
        execute: async (message, args, data, serverConfigsData, badgesData, saveData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            // Get current milestone levels from the database
            const milestoneLevels = await getMilestoneLevels(message.guild.id);
    
            if (!milestoneLevels || milestoneLevels.length === 0) {
                return message.channel.send("No milestone levels have been set. Please set milestone levels before assigning roles.");
            }
    
            const initialEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Set Roles for Milestone Levels")
                .setDescription("Respond with the level and role ID you want to update, separated by a space. You can set multiple levels at once by separating them with commas.\n\n**Example:** `5 123456789012345678, 10 123456789012345678, 15 123456789012345678`")
                .addFields(
                    {
                        name: "Current Milestone Levels",
                        value: milestoneLevels.join(', ') || "No levels set. Run !setlevels to set levels.",
                        inline: true
                    }
                )
                .setFooter({ text: "Use the correct format to update roles.", iconURL: message.client.user.displayAvatarURL() });
    
            await message.channel.send({ embeds: [initialEmbed] });
    
            const filter = response => response.author.id === message.author.id;
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
            if (!collected || collected.size === 0) return message.channel.send("You did not respond in time. Run the command again to update roles.");
    
            const response = collected.first().content.trim();
            const updates = response.split(',').map(entry => entry.trim().split(' '));
            let updatedLevels = [];
    
            for (const [levelStr, roleId] of updates) {
                const level = parseInt(levelStr, 10);
                if (isNaN(level) || !roleId) {
                    return message.channel.send(`Invalid format for level ${levelStr}. Make sure you provide both the level and the role ID. For example -> "5 123[...], 10 123[...]"`);
                }
    
                // Save the role for the milestone level to the database
                await saveRoleForLevel(message.guild.id, level, roleId);
                updatedLevels.push({ level, roleId }); // Store both level and roleId
            }
    
            // Create the confirmation message showing all updated roles
            const updatedLevelsString = updatedLevels.map(({ level, roleId }) => `${level}: <@&${roleId}>`).join('\n');
            const confirmationEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Roles Updated")
                .setDescription(`The following roles have been updated:\n${updatedLevelsString}`);
    
            return message.channel.send({ embeds: [confirmationEmbed] });
        },
    },    

    // * FIXED
    viewsettings: {
        execute: async (message, args, serverConfigsData, badgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
    
            // Fetch server configuration from the database
            const serverConfig = serverConfigsData[serverId] || {};
    
            // Prefix
            const setPrefix = serverConfig.prefix || "!";  // If not set, fallback to default '!'
    
            // Fetch blacklisted channels from the database
            const blacklistedChannels = serverConfig.blacklistedChannels && serverConfig.blacklistedChannels.length > 0
                ? serverConfig.blacklistedChannels.map(id => `<#${id}>`).join("\n")
                : "No blacklisted channels.";
    
            // Rank Channel
            const rankChannel = serverConfig.allowedChannel
                ? `<#${serverConfig.allowedChannel}>`
                : "No rank channel set.";
    
            // Log Channel
            const setlogchannel = serverConfig.loggingChannelId
                ? `<#${serverConfig.loggingChannelId}>`
                : "No log channel set.";
    
            // Fetch milestone levels from the database
            const milestoneLevels = await getMilestoneLevelsFromDB(serverId);  
            const levelsDisplay = milestoneLevels && milestoneLevels.length > 0
                ? milestoneLevels.join(", ")
                : "No levels set.";
    
            // Fetch roles from the database
            const roles = await getRolesFromDB(serverId);  
            const rolesDisplay = roles && roles.length > 0
                ? roles.map(role => `<@&${role.roleId}>`).join(", ")
                : "No roles set.";
    
            // Fetch badges from the database
            const badges = await getBadgesFromDB(serverId);
            const badgesDisplay = badges && badges.length > 0 
                ? badges
                    .filter(badge => badge.badgeName && badge.badgeEmoji)  // Only display badges that have both a name and an emoji set
                    .map(badge => `${badge.badgeEmoji} ${badge.badgeName}`)
                    .join(', ') 
                : "No badges set.";  // If badges is null, undefined, or empty, show "No badges set."
    
            // Prepare embed fields safely, avoiding any undefined values
            const embedFields = [
                { name: "Blacklisted Channels", value: blacklistedChannels, inline: true },
                { name: "Rank Channel", value: rankChannel, inline: true },
                { name: "Log Channel", value: setlogchannel, inline: true },
                { name: "Set Levels", value: levelsDisplay, inline: true },
                { name: "Set Roles", value: rolesDisplay, inline: true },
                { name: "Badges", value: badgesDisplay, inline: true },
                { name: "Prefix", value: `\`${setPrefix}\``, inline: true }
            ];
    
            // Ensure no undefined or null values are in the embed fields
            const sanitizedFields = embedFields.map(field => {
                return {
                    name: field.name,
                    value: field.value || 'Not set', // If any field value is falsy, set a default message
                    inline: field.inline || false
                };
            });
    
            // Create and send the embed with all settings
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`Server Settings for ${message.guild.name}`)
                .addFields(sanitizedFields)
                .setFooter({
                    text: "Use the appropriate commands to manage these settings.",
                    iconURL: message.client.user.displayAvatarURL()
                });
    
            return message.channel.send({ embeds: [embed] });
        },
    },

    // * FIXED
    blacklist: {
        execute: (message, args, data, serverConfigsData, badgesData, saveData, saveBadgesData) => {
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
        execute: (message, args, data, serverConfigsData, badgesData, saveData, saveBadgesData) => {
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
        execute: async (message, args, data, serverConfigsData, badgesData, saveData, saveBadgesData) => {
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
        execute: (message, args, data, serverConfigsData, badgesData, saveData, saveBadgesData) => {
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
        execute: (message, args, data, serverConfigsData, badgesData, saveData, saveBadgesData) => {
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
        execute: (message, args, data, serverConfigsData, badgesData, saveData, saveBadgesData) => {
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
