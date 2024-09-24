const { PermissionsBitField, resolveBase64 } = require('discord.js');
const { EmbedBuilder } = require('@discordjs/builders');
const {     
        // User DB:
        getUserData,
        getUserDataFromDB,
        updateUserBio,
        saveData,

        // Server DB:
        getServerConfigsData,
        saveServerConfigsData,
        saveServerConfig,
        saveServerConfigsPrefix,
        updateBlacklistToServerConfigsData,

        // Owner DB:
        getOwnerData,
        saveOwnerData,

        // Badges DB:
        getServerBadgesFromDB,
        getUserBadgesFromDB,
        getAllBadges,
        saveServerBadgesData,
        saveUserBadgesData,
        addUserBadge,
        addServerBadge,
        assignServerBadgeToUser,

        // Roles DB:
        getRolesData,
        getRolesFromDB,
        getRolesForLevel,
        saveRoleForLevel,
        saveRoles,

        // Milestone DB:
        isMilestoneLevel,
        getMilestoneLevels,
        getMilestoneLevelsFromDB,
        saveMilestoneLevels,
        saveMilestoneLevelServerId,

        // Ensure Data:
        ensureServerData,
        ensureUserData,

        // Other Functions:
        sendLogMessage,
        sendStatusMessage,
        notifyUpdate
} = require('../utils');

module.exports = {
    // * FIXED
    setprefix: {
        execute: async (message, args, serverConfigsData) => {
            const serverId = message.guild.id;
            const guild = message.guild;
    
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                const logChannelId = serverConfigsData.loggingChannelId;
                const logChannel = message.client.channel.cache.get(logChannelId);

                if (logChannel) { logChannel.send(`<@${message.author.id}> tried to change the bot prefix but lacks permissions.`); }
                return;
            }

            const newPrefix = args[0];

            if (!newPrefix) { return message.channel.send("Please provide a new prefix"); }
            if (typeof newPrefix !== 'string') { return message.channel.send("Invalid prefix. Please provide a valid string"); }

            await ensureServerData(serverId, guild);

            // ! JSON File Setup
            // if (!serverConfigsData[serverId]) {
            //     // Initialize server config data if it's not present
            //     serverConfigsData[serverId] = {
            //         serverId: serverId,
            //         name: guild.name,
            //         blacklistedChannels: [],
            //         allowedChannel: null,
            //         loggingChannelId: null,
            //         prefix: "!", // Default prefix
            //         requireConfirm: false
            //     };
            // }

            try {
                await saveServerConfigsPrefix(serverId, newPrefix);

                serverConfigsData[serverId].prefix = newPrefix;

                return message.channel.send(`Prefix has been updated to \`${newPrefix}\``);
            } catch (error) {
                console.error("Error while updating the prefix:", error);
                return message.channel.send("An error occurred while saving the new prefix.");
            }
        }
    },

    // * FIXED
    setlevels: {
        execute: async (message, args, milestoneLevelsData) => {
            if (!message.member.permissions.has('ADMINISTRATOR')) {
                return message.reply("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
    
            // Ensure milestoneLevelsData exists for the server
            if (!milestoneLevelsData[serverId]) {
                await ensureServerData(serverId, message.guild);  // Initialize server data if it doesn't exist
                milestoneLevelsData[serverId] = await getMilestoneLevels(serverId);  // Fetch the newly created server config
            }
    
            // Ensure levels is initialized and parsed correctly
            let levels = milestoneLevelsData[serverId].level;
            if (typeof levels === 'string') {
                levels = JSON.parse(levels || '[]');  // Parse levels if stored as a string
            }
            if (!Array.isArray(levels)) {
                levels = [];  // Initialize as an empty array if levels is undefined or not an array
            }
    
            // Parse the levels from the args (user input) and filter out invalid entries
            const newLevels = args.map(arg => parseInt(arg, 10)).filter(lvl => !isNaN(lvl));
    
            let addedLevel = [];
        
            // Add new levels that are not already in the list
            for (const level of newLevels) {
                if (!levels.includes(`${level}`)) {
                    let num = level.toString();
                    levels.push(num);
                    addedLevel.push(num);
                } else if (levels.includes(`${level}`)) {
                    let num = level.toString();
                    message.channel.send(`Level ${num} already in levels.`);
                }
            }
    
            if (addedLevel.length > 0) {
                // Save the levels to the database as a JSON string
                await saveMilestoneLevelServerId(serverId, levels);
    
                milestoneLevelsData[serverId].level = JSON.stringify(levels);  // Save the levels as a string in the cache
    
                const addedLevelData = addedLevel.join(", ");
    
                // Create and send an embed with the added levels
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle("Levels")
                    .setDescription(`The following levels have been added:`)
                    .addFields({ name: "Levels", value: addedLevelData })
                    .setFooter({ text: `Tip: Use /profile to see your server profile.` });
    
                return message.channel.send({ embeds: [embed] });
            } else {
                // Send an embed if no new levels were added
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle("Levels")
                    .setDescription(`All mentioned levels are already added.`)
                    .setFooter({ text: `Tip: Use /profile to see your server profile.` });
    
                return message.channel.send({ embeds: [embed] });
            }
        }
    },                      
        
    // * FIXED
    setroles: {
        execute: async (message) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
            
            const initialEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Set Roles for Milestone Levels")
                .setDescription("Respond with the level and role you want to update, separated by a space. You can set multiple levels at once by separating them with commas.\n\n**Example:** `5 @role, 10 @role, 15 @role`")
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
                await saveRoleForLevel(serverId, level, roleId);
                updatedLevels.push({ level, roleId }); // Store both level and roleId
            }
    
            // Create the confirmation message showing all updated roles
            const updatedLevelsString = updatedLevels.map(({ level, roleId }) => `${level}: ${roleId}`).join('\n');
            const confirmationEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Roles Updated")
                .setDescription(`The following roles have been updated:\n${updatedLevelsString}`);
    
            return message.channel.send({ embeds: [confirmationEmbed] });
        },
    },

    // * FIXED
    viewsettings: {
        execute: async (message) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
    
            // Fetch server configuration from the database
            const serverConfig = await getServerConfigsData(serverId) || {};

            // Prefix
            const setPrefix = serverConfig.prefix || "!";  // Fallback to default '!' if not set
    
            // Parse blacklisted channels since it is stored as a string
            let blacklistedChannelsArray;
            try {
                blacklistedChannelsArray = JSON.parse(serverConfig.blacklistedChannels);
            } catch (error) {
                blacklistedChannelsArray = [];
            }

            // Blacklisted Channels
            const blacklistedChannels = blacklistedChannelsArray && blacklistedChannelsArray.length > 0
                ? blacklistedChannelsArray.map(id => `<#${id}>`).join(", ")
                : "No blacklisted channels.";
    
            // Rank Channel
            const rankChannel = serverConfig.allowedChannel
                ? `<#${serverConfig.allowedChannel}>`
                : "No rank channel set.";
    
            // Log Channel
            const logChannel = serverConfig.loggingChannelId
                ? `<#${serverConfig.loggingChannelId}>`
                : "No log channel set.";
    
            // //

            // Level Display
            // Get the milestone levels from the database
            const milestoneLevels = await getMilestoneLevelsFromDB(serverId);  

            // Initialize an empty array for displaying levels
            const levelsString = [];

            // Ensure milestoneLevels is an object and contains the 'level' field
            if (milestoneLevels && milestoneLevels[0]) {
                // Parse the 'level' field from the object, as it should be a stringified JSON array
                const parsedLevels = JSON.parse(milestoneLevels[0].level);
                
                // Add the parsed levels to the levelsString array
                levelsString.push(...parsedLevels);  // Use spread to add multiple elements to the array
            } else {
                console.log("No levels found in the database");
            }

            const levelsDisplay = levelsString.join(', ') || "No levels set";

            // Now levelsDisplay will contain the levels
            console.log("Levels Display Array:", levelsDisplay);

            // //

            // Fetch roles from the database
            const roles = await getRolesFromDB(serverId);  
            const rolesDisplay = roles && roles.length > 0
                ? roles.map(role => `[${role.levelRequired}] ${role.roleId}`).join("\n")
                : "No roles set";
    
            // Fetch badges from the database
            const badges = await getServerBadgesFromDB(serverId);
            let badgesDisplay;
            if (badges && badges[0]) {
                badgesDisplay = badges.map(badge => `[${badge.level}] ${badge.badgeEmoji} ${badge.badgeName}`).join('\n');
            }
            else {
                badgesDisplay = 'No badges set'
            }

            // Prepare embed fields
            const embedFields = [
                { name: "Blacklisted Channels", value: blacklistedChannels, inline: true },
                { name: "Rank Channel", value: rankChannel, inline: true },
                { name: "Log Channel", value: logChannel, inline: true },
                { name: "Set Levels", value: levelsDisplay, inline: true },
                { name: "Set Roles", value: rolesDisplay, inline: true },
                { name: "Badges", value: badgesDisplay, inline: true },
                { name: "Prefix", value: `\`${setPrefix}\``, inline: true }
            ];
    
            // Ensure no undefined or null values are in the embed fields
            const sanitizedFields = embedFields.map(field => {
                return {
                    name: field.name,
                    value: field.value || 'Not Set', // If any field value is falsy, set a default message
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
        execute: async (message, args, serverConfigsData,) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const mentionedChannel = message.mentions.channels.first();
            const channelIds = mentionedChannel ? [mentionedChannel.id] : args;
    
            if (channelIds.length === 0) {
                return message.channel.send("Please provide at least one channel ID to blacklist.");
            }
    
            const serverId = message.guild.id;
    
            // Ensure the server configuration exists
            if (!serverConfigsData[serverId]) {
                await ensureServerData(serverId, message.guild);  // Initialize server data if it doesn't exist
                serverConfigsData[serverId] = await getServerConfigsData(serverId);  // Fetch the newly created server config
            }
    
            // Ensure blacklistedChannels is initialized and properly parsed
            let blacklistedChannels = serverConfigsData[serverId].blacklistedChannels;
            if (typeof blacklistedChannels === 'string') {
                blacklistedChannels = JSON.parse(blacklistedChannels || '[]');  // Parse the string into an array
            }
    
            let addedChannel = [];
    
            console.log("Initial blacklistedChannels:", blacklistedChannels);
    
            for (const channelId of channelIds) {
                console.log(`Processing channel ID: ${channelId}`);
    
                if (!blacklistedChannels.includes(channelId)) {
                    blacklistedChannels.push(channelId);
                    addedChannel.push(channelId);
                    console.log(`Channel ID ${channelId} added to blacklist`);
                } else {
                    console.log(`Channel ID ${channelId} already blacklisted`);
                }
            }
    
            if (addedChannel.length > 0) {
                // Update the server's blacklisted channels in the database
                await updateBlacklistToServerConfigsData(serverId, blacklistedChannels);
    
                // Update the local cache (serverConfigsData)
                serverConfigsData[serverId].blacklistedChannels = blacklistedChannels;
    
                const addedChannelMention = addedChannel.map(id => `<#${id}>`).join(", ");
    
                // Create and send the embed message
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle("Channels Blacklisted")
                    .setDescription(`The following channels were blacklisted:`)
                    .addFields({ name: "Blacklisted Channels", value: addedChannelMention })
                    .setFooter({ text: `Use the command again to add more channels to the blacklist.` });
    
                return message.channel.send({ embeds: [embed] });
            } else {
                // Create and send an embed if no new channels were blacklisted
                const embed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle("No New Channels Blacklisted")
                    .setDescription(`All mentioned channels are already blacklisted.`)
                    .setFooter({ text: `Use the command again with different channels.` });
    
                return message.channel.send({ embeds: [embed] });
            }
        }
    },

    // * FIXED
    unblacklist: {
        execute: async (message, args, serverConfigsData, saveServerConfigsData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000) // Red for error
                    .setTitle("Permission Denied")
                    .setDescription("You don't have permission to use this command.")
                    .setFooter({ text: `Attempted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
                return message.channel.send({ embeds: [embed] });
            }
    
            const mentionedChannel = message.mentions.channels.first();
            const channelId = mentionedChannel ? mentionedChannel.id : args[0];
    
            if (!channelId) {
                const embed = new EmbedBuilder()
                    .setColor(0xffcc00) // Yellow for warning
                    .setTitle("No Channel Provided")
                    .setDescription("Please provide a valid channel ID to unblacklist.")
                    .setFooter({ text: `Attempted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
                return message.channel.send({ embeds: [embed] });
            }
    
            const serverId = message.guild.id;
    
            // Ensure the server config exists, if not initialize it
            if (!serverConfigsData[serverId]) {
                const embed = new EmbedBuilder()
                    .setColor(0xffcc00) // Yellow for warning
                    .setTitle("Configuration Not Found")
                    .setDescription("No configuration found for this server.")
                    .setFooter({ text: `Attempted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
                return message.channel.send({ embeds: [embed] });
            }
    
            const blacklistedChannels = serverConfigsData[serverId].blacklistedChannels || [];
    
            // Check if the channel is in the blacklist
            if (!blacklistedChannels.includes(channelId)) {
                const embed = new EmbedBuilder()
                    .setColor(0xffcc00) // Yellow for warning
                    .setTitle("Channel Not Blacklisted")
                    .setDescription(`The channel <#${channelId}> is not blacklisted.`)
                    .setFooter({ text: `Attempted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
                return message.channel.send({ embeds: [embed] });
            }
    
            // Remove the channel from the blacklist
            serverConfigsData[serverId].blacklistedChannels = blacklistedChannels.filter(id => id !== channelId);
    
            // Save the updated configuration
            await saveServerConfigsData(serverId, serverConfigsData[serverId]);
    
            // Send success embed
            const embed = new EmbedBuilder()
                .setColor(0x00ff00) // Green for success
                .setTitle("Channel Unblacklisted")
                .setDescription(`Successfully removed <#${channelId}> from the blacklist.`)
                .setFooter({ text: `Unblacklisted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
            return message.channel.send({ embeds: [embed] });
        },
    },

    // * FIXED
    setlogchannel: {
        execute: async (message, args, client, serverConfigsData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) { return message.channel.send("You don't have permission to use this command."); }
            
            const serverId = message.guild.id;
            const mentionedChannel = message.mentions.channels.first();
            const channelId = mentionedChannel ? mentionedChannel.id : args[0];

            if (!channelId) { return message.channel.send("Please provide a channel ID to set a log channel."); }

            if (!serverConfigsData[serverId]) {
                await ensureServerData(serverId, message.guild);
                serverConfigsData[serverId] = await getServerConfigsData(serverId);
            }

            serverConfigsData[serverId].loggingChannelId = channelId;

            await saveServerConfigsData(serverId, serverConfigsData[serverId]);

            const logChannel = client.channels.cache.get(channelId);

            const successEmbed = new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle("Log Channel Set")
                .setDescription(`Log Channel has been set to <#${channelId}>`)
                .setFooter({ text: `Command issued by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

            await message.channel.send({ embeds: [successEmbed] });

            if (logChannel) {
                try {
                    const logChannelEmbed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle("Log Channel Set")
                        .setDescription(`This channel has been set as the Leveling Bot Logging channel.`)
                        .setFooter({ text: `Log Channel Update`, iconURL: client.user.displayAvatarURL() });
    
                    await logChannel.send({ embeds: [logChannelEmbed] });
                } catch (err) {
                    console.error("Error sending message to the log channel:", err);
    
                    const errorEmbed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle("Error")
                        .setDescription("I was unable to send a message to the new log channel. Please ensure I have permission to send messages.")
                        .setFooter({ text: `Command issued by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
                    return message.channel.send({ embeds: [errorEmbed] });
                }
            } else {
                const channelNotFoundEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)
                    .setTitle("Channel Not Found")
                    .setDescription("I can't find the channel you have mentioned. Please make sure that it exists and that I have the permissions to see it")
                    .setFooter({ text: `Command issued by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

                await message.channel.send({ embeds: [channelNotFoundEmbed] });
            }
        }
    },

    // * FIXED
    unsetlogchannel: {
        execute: async (message, serverConfigsData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) { return message.channel.send("You don't have permission to use this command."); }

            const serverId = message.guild.id;

            if (!serverConfigsData[serverId]) {
                await ensureServerData(serverId, message.guild);
                serverConfigsData[serverId] = await getServerConfigsData(serverId);
            }

            serverConfigsData[serverId].loggingChannelId = null;

            await saveServerConfigsData(serverId, serverConfigsData[serverId]);

            const embed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle("Logging Channel Unset")
                .setDescription("The logging channel has been successfully unset.")
                .setFooter({ text: `Server: ${message.guild.name}`, iconURL: message.guild.iconURL() });

            await message.channel.send({ embeds: [embed] });
        }
    },

    // * 
    setrankchannel: {
        execute: async (message, args, serverConfigsData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000) // Red color for error
                    .setTitle("Permission Denied")
                    .setDescription("You don't have permission to use this command.")
                    .setFooter({ text: `Attempted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
                return message.channel.send({ embeds: [embed] });
            }
    
            const mentionedChannel = message.mentions.channels.first();
            const channelId = mentionedChannel ? mentionedChannel.id : args[0];
    
            if (!channelId) {
                const embed = new EmbedBuilder()
                    .setColor(0xffcc00) // Yellow color for warning
                    .setTitle("Invalid Input")
                    .setDescription("Please provide a valid channel ID to set the rank check channel.")
                    .setFooter({ text: `Attempted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
                return message.channel.send({ embeds: [embed] });
            }
    
            const serverId = message.guild.id;
    
            // Ensure the server config exists, if not initialize it
            if (!serverConfigsData[serverId]) {
                await ensureServerData(serverId, message.guild);
                serverConfigsData[serverId] = await getServerConfigsData(serverId);
            }
    
            // Set the rank allowed channel
            serverConfigsData[serverId].allowedChannel = channelId;
    
            // Save the updated server configuration
            await saveServerConfigsData(serverId, serverConfigsData[serverId]);
    
            // Send a confirmation as an embed message
            const embed = new EmbedBuilder()
                .setColor(0x00ff00) // Green color for success
                .setTitle("Rank Channel Set")
                .setDescription(`Community commands (like \`rank\` and \`profile\`) are now restricted to <#${channelId}>.`)
                .setFooter({ text: `Configured by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
            return message.channel.send({ embeds: [embed] });
        }
    },    

    // * FIXED
    unsetrankchannel: {
        execute: async (message, args, serverConfigsData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                const embed = new EmbedBuilder()
                    .setColor(0xff0000) // Red color for error
                    .setTitle("Permission Denied")
                    .setDescription("You don't have permission to use this command.")
                    .setFooter({ text: `Attempted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
                return message.channel.send({ embeds: [embed] });
            }
    
            const serverId = message.guild.id;
            const mentionedChannel = message.mentions.channels.first();
            const channelId = mentionedChannel ? mentionedChannel.id : args[0];
    
            // Ensure the server config exists, if not initialize it
            if (!serverConfigsData[serverId]) {              
                await ensureServerData(serverId, message.guild);
                serverConfigsData[serverId] = await getServerConfigsData(serverId);
            }

            if (!channelId) {
                const embed = new EmbedBuilder()
                    .setColor(0xffcc00) // Yellow color for warning
                    .setTitle("Invalid Input")
                    .setDescription("Please provide a valid channel ID to set the rank check channel.")
                    .setFooter({ text: `Attempted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
                return message.channel.send({ embeds: [embed] });
            }
    
            // Unset the allowed channel
            serverConfigsData[serverId].allowedChannel = null;
    
            // Save the updated server configuration
            await saveServerConfigsData(serverId, serverConfigsData[serverId]);
    
            // Send a confirmation as an embed message
            const embed = new EmbedBuilder()
                .setColor(0x00ff00) // Green color for success
                .setTitle("Rank Channel Unset")
                .setDescription("Community Commands are no longer restricted to a specific channel.")
                .setFooter({ text: `Unset by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
            return message.channel.send({ embeds: [embed] });
        }
    },    

    // * 
    toggleconfirm: {
        execute: async (message, serverConfigsData) => {
            // Step 1: Check if the user has permission
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                const permissionEmbed = new EmbedBuilder()
                    .setColor(0xff0000) // Red for error
                    .setTitle("Permission Denied")
                    .setDescription("You don't have permission to use this command.")
                    .setFooter({ text: `Attempted by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
                
                return message.channel.send({ embeds: [permissionEmbed] });
            }
    
            const serverId = message.guild.id;
    
            // Ensure the server's data exists
            if (!serverConfigsData[serverId]) {              
                await ensureServerData(serverId, message.guild);
                serverConfigsData[serverId] = await getServerConfigsData(serverId);
            }
    
            // Toggle the `requireConfirm` setting
            serverConfigsData[serverId].requireConfirm = !serverConfigsData[serverId].requireConfirm;
    
            // Save the updated configuration
            await saveServerConfigsData(serverId, serverConfigsData[serverId]);
    
            // Create an embedded message to confirm the action
            const embed = new EmbedBuilder()
                .setColor(0x3498db) // Blue for information
                .setTitle("Confirmation Setting Toggled")
                .setDescription(`The confirmation setting has been **${serverConfigsData[serverId].requireConfirm ? "enabled" : "disabled"}**.`)
                .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });
    
            // Send the embedded message
            await message.channel.send({ embeds: [embed] });
        },
    }    
}