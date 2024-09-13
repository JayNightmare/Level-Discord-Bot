const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType, InteractionCollector } = require('discord.js');
const { EmbedBuilder, SelectMenuBuilder, ActionRowBuilder } = require('@discordjs/builders');
const { 
        handleTemplateOptions,
        trackMessageAchievements,
        handleCustomOptions,
        handleCustomLevelAchievements,
        testWriteToAchievementsFile,
        saveData,
        saveServerConfigsData } = require('../utils');

const fs = require('fs');

const usersFilePath = 'json/users.json';

module.exports = {    
    // * FIXED
    addxp: {
        execute: async (message, args, client, data, serverConfigsData, achievementsData, badgesData, saveAchievementsData, saveBadgesData, saveServerConfigsData) => {
            // Step 1: Check if the user has permission
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                const logChannelId = serverConfigsData[message.guild.id]?.loggingChannelId;
                const logChannel = message.client.channels.cache.get(logChannelId);
    
                if (logChannel) {
                    logChannel.send(`<@${message.author.id}> tried to use the addxp command but lacks permissions.`);
                } else {
                    console.log(`No logging channel set for ${message.guild.id}`);
                }
                return;
            }
    
            const filter = response => response.author.id === message.author.id;
    
            // Step 1: Ask for user mention and XP amount
            await message.channel.send("Please mention the user you want to add XP to and the amount of XP. Example: `@user 100`");
    
            const collectedMessage = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
    
            if (!collectedMessage) {
                return message.channel.send("You did not provide the required information. Command cancelled.");
            }
    
            // Step 2: Process the response and extract user mention and XP amount
            const argsInput = collectedMessage.first().content.split(" ");
            const userMention = argsInput[0];
            const xpAmount = parseInt(argsInput[1], 10);
    
            // Validate user mention and XP amount
            if (!userMention || isNaN(xpAmount)) {
                return message.channel.send("Invalid format. Please provide a valid user mention and XP amount.");
            }
    
            const userId = userMention.replace(/[<@!>]/g, '');
    
            // Ensure the user's data exists
            if (!data[message.guild.id].users[userId]) {
                data[message.guild.id].users[userId] = { xp: 0, level: 1 };
            }
    
            // Step 3: Check if confirmation is required
            if (serverConfigsData[message.guild.id]?.requireConfirm === true) {
                await message.channel.send(`You are about to add ${xpAmount} XP to <@${userId}>. Type \`confirm\` to proceed or \`cancel\` to abort.`);
    
                const confirmMessage = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
    
                if (!confirmMessage || confirmMessage.first().content.toLowerCase() !== 'confirm') {
                    return message.channel.send("Operation cancelled.");
                }
            }
    
            // Add XP and calculate the level
            const user = data[message.guild.id].users[userId];
            user.xp += xpAmount;
            user.totalXp += xpAmount;

            let level = user.level;
            const x = 100;
            const y = 1.1;
    
            while (user.xp >= Math.floor(level * x * Math.pow(y, level + 1))) {
                level++;
            }
    
            user.level = level;
            fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 4));
    
            // Final confirmation message
            return message.channel.send(`<@${userId}> now has ${user.xp} XP and is at level ${user.level}!`);
        },
    },   

    // TODO: Add Feature in future patch
    rmxp: {
        execute: async (message, args, client, data, serverConfigsData, achievementsData, badgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                const logChannelId = serverConfigsData[message.guild.id]?.loggingChannelId;
                const logChannel = message.client.channels.cache.get(logChannelId);
    
                if (logChannel) {
                    logChannel.send(`<@${message.author.id}> tried to use the rmxp command but lacks permissions.`);
                } else {
                    console.log(`No logging channel set for ${message.guild.id}`);
                }
                return;
            }
    
            const embed = new EmbedBuilder()
                .setColor([255, 0, 255])
                .setTitle("Command Comming Soon")

            await message.reply({ embeds: [embed] });
        },
    },  

    // * FIXED
    addachievement: {
        execute: async (message, args, client, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData, saveServerConfigsData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
    
            // Step 1: Ask for the user mention
            await message.channel.send("Please mention the user you want to add an achievement to:");
            const filter = response => response.author.id === message.author.id;
            const collectedUser = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);
    
            if (!collectedUser || collectedUser.size === 0) {
                return message.channel.send("You did not respond in time. Run the command again to add an achievement.");
            }
    
            const userId = collectedUser.first().mentions.users.first()?.id;
    
            if (!userId) {
                return message.channel.send("Invalid user. Please run the command again and mention a valid user.");
            }
    
            // Step 2: Display available achievements or allow user to create a new one
            const availableAchievements = achievementsData[serverId]?.availableAchievements || [];
    
            if (availableAchievements.length > 0) {
                // Create an embed to show available achievements
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle("Available Achievements")
                    .setDescription("Here are the available achievements you can add. If you don't find a suitable achievement, you can create a new one.")
                    .addFields(availableAchievements.map((achievement, index) => ({
                        name: `Achievement ${index + 1}`,
                        value: achievement,
                    })))
                    .setFooter({ text: "Type the name of the achievement you want to assign or type 'new' to create one." });
    
                await message.channel.send({ embeds: [embed] });
            } else {
                await message.channel.send("No achievements are available. Would you like to make one? [y/n]");
            }
    
            // Step 3: Collect achievement input
            const collectedAchievement = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);
    
            if (!collectedAchievement || collectedAchievement.size === 0) {
                return message.channel.send("You did not respond in time. Run the command again to add an achievement.");
            }
    
            const achievementInput = collectedAchievement.first().content.trim();
    
            let achievementName;
            if (achievementInput.toLowerCase() === 'y' || achievementInput.toLowerCase() === 'yes') {
                await message.channel.send("Please provide the name of the new achievement:");
                const collectedNewAchievement = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);
                if (!collectedNewAchievement || collectedNewAchievement.size === 0) {
                    return message.channel.send("You did not respond in time. Command cancelled.");
                }
                achievementName = collectedNewAchievement.first().content.trim();
                achievementsData[serverId].availableAchievements = achievementsData[serverId].availableAchievements || [];
                achievementsData[serverId].availableAchievements.push(achievementName);
                saveAchievementsData(); // Save the new achievement
            } else {
                achievementName = achievementInput;
                if (!availableAchievements.includes(achievementName)) {
                    return message.channel.send("Invalid achievement. Please run the command again and choose a valid achievement.");
                }
            }
    
            // Step 4: Assign the achievement to the user within the 'users' tag
            if (!achievementsData[serverId].users) {
                achievementsData[serverId].users = {};
            }
            if (!achievementsData[serverId].users[userId]) {
                achievementsData[serverId].users[userId] = [];
            }
    
            const userAchievements = achievementsData[serverId].users[userId].achievements;
    
            // Check if the user already has this achievement
            if (!userAchievements.includes(achievementName)) {
                userAchievements.push(achievementName); // Add the achievement
                fs.writeFileSync('json/achievements.json', JSON.stringify(achievementsData, null, 4));
                return message.channel.send(`Achievement "${achievementName}" added to <@${userId}>'s profile!`);
            } else {
                return message.channel.send(`<@${userId}> already has the "${achievementName}" achievement.`);
            }
        },
    },

    // * FIXED
    rmachievement: {
        execute: async (message, args, client, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData, saveServerConfigsData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
    
            // Step 1: Ask for the user mention
            await message.channel.send("Please mention the user you want to remove an achievement from:");
            const filter = response => response.author.id === message.author.id;
            const collectedUser = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);
    
            if (!collectedUser || collectedUser.size === 0) {
                return message.channel.send("You did not respond in time. Run the command again to remove an achievement.");
            }
    
            const userId = collectedUser.first().mentions.users.first()?.id;
    
            if (!userId) {
                return message.channel.send("Invalid user. Please run the command again and mention a valid user.");
            }
    
            // Ensure the user has achievements data
            if (!achievementsData[serverId] || !achievementsData[serverId].users || !achievementsData[serverId].users[userId]) {
                return message.channel.send(`<@${userId}> does not have any achievements.`);
            }
    
            const userAchievements = achievementsData[serverId].users[userId].achievements;
    
            if (userAchievements.length === 0) {
                return message.channel.send(`<@${userId}> does not have any achievements to remove.`);
            }
    
            // Step 2: Display the achievements in an embed
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`${message.guild.members.cache.get(userId).displayName}'s Achievements`)
                .setDescription("Here are the achievements you can remove:")
                .addFields(
                    userAchievements.map((achievement, index) => ({
                        name: `Achievement ${index + 1}`,
                        value: achievement,
                        inline: true,
                    }))
                )
                .setFooter({ text: "Type the name of the achievement you want to remove." });
    
            await message.channel.send({ embeds: [embed] });
    
            // Step 3: Collect the achievement to remove
            const collectedAchievement = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] }).catch(() => null);
    
            if (!collectedAchievement || collectedAchievement.size === 0) {
                return message.channel.send("You did not respond in time. Run the command again to remove an achievement.");
            }
    
            const achievementName = collectedAchievement.first().content.trim();
    
            const index = userAchievements.indexOf(achievementName);
            if (index > -1) {
                userAchievements.splice(index, 1); // Remove the achievement
                fs.writeFileSync('json/achievements.json', JSON.stringify(achievementsData, null, 4)); // Save the updated data
                return message.channel.send(`Achievement "${achievementName}" removed from <@${userId}>'s profile!`);
            } else {
                return message.channel.send(`<@${userId}> does not have the "${achievementName}" achievement.`);
            }
        },
    },    

    // * FIXED
    setachievements: {
        execute: async (message, interaction, args, client, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData, saveServerConfigsData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
    
            // Embed for initial choice
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Set Achievements")
                .setDescription("Choose to use Template Achievements or create Custom Achievements")
                .setFooter({ text: "Choose an option below:", iconURL: message.client.user.displayAvatarURL() });
    
            const row = new ActionRowBuilder()
                .addComponents(
                    new SelectMenuBuilder()
                        .setCustomId('achievements_menu')
                        .setPlaceholder('Select an option')
                        .addOptions([
                            { label: 'Template Options', value: 'template' },
                            { label: 'Custom Options (Coming Soon)', value: 'custom' }
                        ])
                );
    
            await message.channel.send({ embeds: [embed], components: [row] });
    
            // Collect user selection
            const collected = interaction.values[0];

            if (collected === 'template') {
                // Handle template options (message-based achievements)
                await handleTemplateOptions(message, interaction, achievementsData, saveAchievementsData);
            } else if (collected === 'custom') {
                // Handle custom options
                const customEmbed = new EmbedBuilder()
                    .setColor(0xffcc00)
                    .setTitle("Custom Achievements")
                    .setDescription("Custom achievements options are currently under development! Stay tuned.")
                    .setFooter({ text: "Coming Soon", iconURL: message.client.user.displayAvatarURL() });
                
                return message.channel.send({ embeds: [customEmbed] });
            }
        }
    },

    // * FIXED
    addbadge: {
        execute: async (message, args, client, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const filter = response => response.author.id === message.author.id;
    
            // Step 1: Ask for the user
            await message.channel.send("Please mention the user you want to give a badge to.");
    
            const userMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
            if (!userMsg) return message.channel.send("No user mentioned. Command cancelled.");
    
            const userId = userMsg.first().mentions.users.first()?.id;
            if (!userId) return message.channel.send("Invalid user. Command cancelled.");
    
            // Step 2: Display available badges
            const serverBadges = badgesData[message.guild.id]?.badges || {};
            const availableBadges = Object.values(serverBadges).map(badge => badge.name);
            
            if (availableBadges.length === 0) return message.channel.send("No badges available to assign.");
    
            const badgeEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Available Badges")
                .setDescription(availableBadges.map((badge, index) => `${index + 1}. ${badge}`).join("\n"))
                .setFooter({ text: "Please type the name of the badge you want to assign." });
    
            await message.channel.send({ embeds: [badgeEmbed] });
    
            // Step 3: Ask for the badge name
            const badgeMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
            if (!badgeMsg) return message.channel.send("No badge name provided. Command cancelled.");
    
            const badgeName = badgeMsg.first().content.trim();
            const badgeEntry = Object.values(serverBadges).find(badge => badge.name === badgeName);
    
            if (!badgeEntry) return message.channel.send("Invalid badge name. Command cancelled.");
    
            // Initialize the badgesData if not present
            if (!badgesData[message.guild.id]) {
                badgesData[message.guild.id] = {};
            }
    
            if (!badgesData[message.guild.id][userId]) {
                badgesData[message.guild.id][userId] = [];
            }
    
            const userBadges = badgesData[message.guild.id][userId];
    
            // Add the badge if the user doesn't already have it
            if (!userBadges.includes(badgeName)) {
                userBadges.push(badgeName);
                // Save the updated badges data
                try {
                    fs.writeFileSync('json/badges.json', JSON.stringify(badgesData, null, 4));
                    console.log("Badge data successfully saved.");
                } catch (err) {
                    console.error("Error saving badges data:", err);
                    return message.channel.send("Failed to save badges data. Please try again.");
                }  
                return message.channel.send(`Badge "${badgeName}" added to <@${userId}>'s profile!`);
            } else {
                return message.channel.send(`<@${userId}> already has the "${badgeName}" badge.`);
            }
        },
    },     

    // * FIXED
    rmbadge: {
        execute: async (message, args, client, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const filter = response => response.author.id === message.author.id;
    
            // Step 1: Ask for the user
            await message.channel.send("Please mention the user you want to remove a badge from.");
    
            const userMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
            if (!userMsg) return message.channel.send("No user mentioned. Command cancelled.");
    
            const userId = userMsg.first().mentions.users.first()?.id;
            if (!userId) return message.channel.send("Invalid user. Command cancelled.");
    
            // Ensure badges data exists
            const userBadges = badgesData[message.guild.id]?.[userId];
            if (!userBadges || userBadges.length === 0) return message.channel.send(`<@${userId}> does not have any badges.`);
    
            // Step 2: Display user's badges
            const badgeEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`${message.guild.members.cache.get(userId).displayName}'s Badges`)
                .setDescription(userBadges.map((badge, index) => `${index + 1}. ${badge}`).join("\n"))
                .setFooter({ text: "Please type the name of the badge you want to remove." });
    
            await message.channel.send({ embeds: [badgeEmbed] });
    
            // Step 3: Ask for the badge name
            const badgeMsg = await message.channel.awaitMessages({ filter, max: 1, time: 30000, errors: ['time'] }).catch(() => null);
            if (!badgeMsg) return message.channel.send("No badge name provided. Command cancelled.");
    
            const badgeName = badgeMsg.first().content.trim();
            if (!userBadges.includes(badgeName)) return message.channel.send("Invalid badge name. Command cancelled.");
    
            // Remove the badge if it exists
            const index = userBadges.indexOf(badgeName);
            if (index > -1) {
                userBadges.splice(index, 1);
                saveBadgesData();
                return message.channel.send(`Badge "${badgeName}" removed from <@${userId}>'s profile!`);
            } else {
                return message.channel.send(`<@${userId}> does not have the "${badgeName}" badge.`);
            }
        },
    },

    // * FIXED
    viewbadges: {
        execute: async (message, args, client, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData, saveServerConfigsData) => {
            const serverId = message.guild.id;
            const mentionedUser = message.mentions.users.first() || message.author;
            const userId = mentionedUser.id;
    
            // Ensure the badges structure exists in badgesData
            if (!badgesData[serverId] || !badgesData[serverId].badges) {
                return message.channel.send("No badges have been set on this server.");
            }
    
            const serverBadges = badgesData[serverId].badges; // All badges for the server
            const userBadges = badgesData[serverId][userId] || []; // Badges earned by the user
    
            // Display User's Badges
            const userBadgesDisplay = userBadges.length > 0
                ? userBadges.map(badgeName => {
                    // Find the badge in the server badges
                    const badgeEntry = Object.values(serverBadges).find(b => b.name === badgeName);
    
                    // If the badge is found, display its emoji and name, otherwise show "Unknown Badge"
                    return badgeEntry ? `${badgeEntry.emoji} ${badgeEntry.name}` : "Unknown Badge";
                }).join(', ') || "No badges"
                : "This user has not earned any badges.";
    
            // Display All Server Badges
            const serverBadgesDisplay = Object.keys(serverBadges).length > 0
                ? Object.keys(serverBadges).map(badgeId => {
                    const badge = serverBadges[badgeId];
                    return `${badge.emoji} ${badge.name} (Level ${badgeId.split('_')[1]})`;
                }).join('\n')
                : "No badges have been set on this server.";
    
            // Create and send the embed
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`${mentionedUser.username}'s Badges`)
                .addFields(
                    { name: "User's Badges", value: userBadgesDisplay || "No badges earned yet.", inline: true },
                    { name: "All Server Badges", value: serverBadgesDisplay || "No badges set for this server.", inline: true }
                )
                .setFooter({ text: `Badge overview for ${mentionedUser.username}`, iconURL: mentionedUser.displayAvatarURL() });
    
            return message.channel.send({ embeds: [embed] });
        }
    },
    
    // * FIXED
    setbadges: {
        execute: async (message, args, client, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData, saveServerConfigsData) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
            const mentionedUser = message.mentions.users.first() || message.author;
            const userId = mentionedUser.id;
    
            if (!data[serverId].milestoneLevels || data[serverId].milestoneLevels.length === 0) {
                return message.channel.send("No milestone levels have been set. Please set milestone levels before assigning badges.");
            }
    
            const badges = badgesData[serverId].badges;
            const serverUsers = badgesData[serverId];
    
            try {
                if (badges) {
                    const initialEmbed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle("Set Badges for Milestone Levels")
                        .setDescription("You can type `remove [level]` to remove a badge for a specific level, or select a level to set a badge.")
                        .addFields(
                            {
                                name: "Current Milestone Levels",
                                value: data[serverId].milestoneLevels.join(', ') || "No levels set. Run !setlevels to set levels",
                                inline: true
                            },
                            {
                                name: "Current Badges",
                                value: data[serverId].milestoneLevels.map(level => {
                                    const badgeId = `level_${level}`;
                                    const badge = badges[badgeId];
                                    const badgeDisplay = badge ? `${badge.emoji} ${badge.name}` : "Not set";
                                    return `${level}: ${badgeDisplay}`;
                                }).join('\n'),
                                inline: true
                            }
                        )
                        .setFooter({ text: "Use the correct format to update badges.", iconURL: message.client.user.displayAvatarURL() });
    
                    await message.channel.send({ embeds: [initialEmbed] });
                } else {
                    return message.channel.send("No badges set.");
                }
            } catch (err) {
                console.error("Error occurred generating the badge display:", err);
            }
    
            const filter = response => response.author.id === message.author.id;
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
            if (!collected || collected.size === 0) {
                return message.channel.send("You did not respond in time. Run the command again to update badges.");
            }
    
            const input = collected.first().content.trim().toLowerCase();
    
            // Check if the user wants to remove a badge
            if (input.startsWith("remove")) {
                const levelToRemove = parseInt(input.split(" ")[1], 10);

                if (isNaN(levelToRemove) || !data[serverId].milestoneLevels.includes(levelToRemove)) {
                    return message.channel.send(`Invalid level. Please select a valid milestone level from: ${data[serverId].milestoneLevels.join(', ')}`);
                }

                const badgeId = `level_${levelToRemove}`;

                if (badges[badgeId]) {
                    const badgeName = badges[badgeId].name;  // Get the badge name from the server badge list

                    // Remove the badge from the server's badge list
                    delete badges[badgeId];

                    // Remove the badge from any user who has it by its name
                    for (const userId in serverUsers) {
                        const userBadges = serverUsers[userId];

                        // Ensure userBadges is an array before proceeding
                        if (Array.isArray(userBadges)) {
                            const badgeIndex = userBadges.indexOf(badgeName);  // Match by badge name

                            if (badgeIndex > -1) {
                                userBadges.splice(badgeIndex, 1); // Remove the badge from the user's list
                            }
                        }
                    }

                    // Save the updated badge data
                    try {
                        fs.writeFileSync('json/badges.json', JSON.stringify(badgesData, null, 4));
                        return message.channel.send(`Badge for level ${levelToRemove} has been removed from the server and all users.`);
                    } catch (err) {
                        console.error("Error saving badges data:", err);
                        return message.channel.send("Failed to save badges data. Please try again.");
                    }
                } else {
                    return message.channel.send(`There is no badge set for level ${levelToRemove}.`);
                }
            }


    
            // If the user doesn't want to remove a badge, proceed with setting one
            const levelStr = input;
            const level = parseInt(levelStr, 10);
    
            if (isNaN(level) || !data[serverId].milestoneLevels.includes(level)) {
                return message.channel.send(`Invalid level. Please select a valid milestone level from: ${data[serverId].milestoneLevels.join(', ')}`);
            }
    
            await message.channel.send("Please provide the emoji you want to set for this badge:");
            const collectedEmoji = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
            if (!collectedEmoji || collectedEmoji.size === 0) {
                return message.channel.send("You did not respond in time. Run the command again to update badges.");
            }
    
            const emoji = collectedEmoji.first().content.trim();
    
            await message.channel.send("Please provide a name for this badge:");
            const collectedName = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
            if (!collectedName || collectedName.size === 0) {
                return message.channel.send("You did not respond in time. Run the command again to update badges.");
            }
    
            const badgeName = collectedName.first().content.trim();
    
            const badgeId = `level_${level}`;
            badges[badgeId] = { name: badgeName, emoji: emoji };
    
            // Save the updated badges data
            try {
                fs.writeFileSync('json/badges.json', JSON.stringify(badgesData, null, 4));
                console.log("Badge data successfully saved.");
            } catch (err) {
                console.error("Error saving badges data:", err);
                return message.channel.send("Failed to save badges data. Please try again.");
            }
    
            const confirmationEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Badge Set")
                .setDescription(`Badge for level ${level} has been set to: ${emoji} ${badgeName}`);
    
            return message.channel.send({ embeds: [confirmationEmbed] });
        }
    },
};
