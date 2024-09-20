const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType, InteractionCollector } = require('discord.js');
const { EmbedBuilder, SelectMenuBuilder, ActionRowBuilder } = require('@discordjs/builders');
const {// User DB:
        getUserData,
        getUserDataFromDB,
        updateUserBio,
        saveData,

        // Server DB:
        getServerConfigsData,
        saveServerConfigsData,
        saveServerConfig,

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

        // Ensure Data:
        ensureServerData,
        ensureUserData,

        // Other Functions:
        sendLogMessage,
        sendStatusMessage,
        notifyUpdate
} = require('../utils.js');

module.exports = {    
    // * NEW
    addxp: {
        execute: async (message, args) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
            const mentionedUser = message.mentions.users.first();  // Get the mentioned user
            if (!mentionedUser) {
                return message.channel.send("Please mention a user to add XP to.");
            }
    
            const userId = mentionedUser.id;
            const xpAmount = parseInt(args[1], 10);  // Get the XP amount from args
            if (isNaN(xpAmount)) {
                return message.channel.send("Please provide a valid number of XP to add.");
            }
    
            try {
                // Get the user's current data from the database
                let userData = await getUserData(serverId, userId);
                let { xp, level, totalXp } = userData;
    
                // Initialize XP and level if not present in userData
                xp = xp || 0;
                level = level || 1;
                totalXp = totalXp || 0;
    
                // Calculate new XP and total XP
                let newXP = xp + xpAmount;
                let newTotalXP = totalXp + xpAmount;
                let currentLevel = level;
    
                // Base XP formula parameters
                const baseMultiplier = 100;
                const scalingFactor = 1.1;
    
                // Function to calculate XP needed for a specific level
                const xpNeededForLevel = (level) => Math.floor(level * baseMultiplier * Math.pow(scalingFactor, level));
    
                // Loop through and level up until newXP is less than the required XP for the next level
                while (newXP >= xpNeededForLevel(currentLevel)) {
                    newXP -= xpNeededForLevel(currentLevel);  // Deduct XP needed for the current level
                    currentLevel++;  // Increment the level
                }
    
                // If we reach here, newXP contains the remaining XP after all level-ups
                // Now save this correct XP and level to the database
                const updatedUserData = {
                    ...userData,
                    xp: newXP,  // This is the XP for the current level
                    totalXp: newTotalXP,  // Total XP across all levels
                    level: currentLevel  // The updated level after all level-ups
                };
    
                // Save the updated data back to the database
                await saveData(serverId, userId, updatedUserData);
    
                // Send a success embed message
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)  // Green for success
                    .setTitle("XP Added Successfully")
                    .setDescription(`Added **${xpAmount} XP** to <@${userId}>. They now have **${newXP} XP** towards level ${currentLevel} and are at **level ${currentLevel}**.`);
    
                return message.channel.send({ embeds: [successEmbed] });
            } catch (err) {
                console.error("Error adding XP:", err);
                
                // Send a failure embed message
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Error Adding XP")
                    .setDescription("There was an error adding XP to the user. Please try again.");
    
                return message.channel.send({ embeds: [errorEmbed] });
            }
        }
    },       

    // * NEW
    rmxp: {
        execute: async (message, args) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
            const mentionedUser = message.mentions.users.first();  // Get the mentioned user
            if (!mentionedUser) {
                return message.channel.send("Please mention a user to remove XP from.");
            }
    
            const userId = mentionedUser.id;
            const xpAmount = parseInt(args[1], 10);  // Get the XP amount to remove
            if (isNaN(xpAmount)) {
                return message.channel.send("Please provide a valid number of XP to remove.");
            }
    
            try {
                // Get the user's current data from the database
                let userData = await getUserData(serverId, userId);
                let { xp, level, totalXp } = userData;
    
                // Deduct XP and check for negative results
                let newXP = xp - xpAmount;
                let newTotalXP = (totalXp || 0) - xpAmount;
                let currentLevel = level || 1;
    
                // Function to calculate the required XP for the next level
                const xpToNextLevel = (level) => 100 * Math.pow(level, 2);
    
                // Loop to handle XP deduction and de-leveling
                while (newXP < 0 && currentLevel > 1) {
                    currentLevel--;  // Decrease the level
                    newXP += xpToNextLevel(currentLevel);  // Add XP required for the previous level
                }
    
                // Ensure the XP doesn't go below zero at level 1
                if (currentLevel === 1 && newXP < 0) {
                    newXP = 0;  // Set XP to 0 if below level 1
                }
    
                // If we reach here, newXP contains the correct XP for the current level
                const updatedUserData = {
                    ...userData,
                    xp: newXP,  // XP for the current level
                    totalXp: Math.max(newTotalXP, 0),  // Ensure total XP doesn't go below zero
                    level: currentLevel  // The updated level after de-leveling
                };
    
                // Save the updated data back to the database
                await saveData(serverId, userId, updatedUserData);
    
                // Send a success embed message
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)  // Green for success
                    .setTitle("XP Removed Successfully")
                    .setDescription(`Removed **${xpAmount} XP** from <@${userId}>. They now have **${newXP} XP** towards level ${currentLevel} and are at **level ${currentLevel}**.`);
    
                return message.channel.send({ embeds: [successEmbed] });
            } catch (err) {
                console.error("Error removing XP:", err);
    
                // Send a failure embed message
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Error Removing XP")
                    .setDescription("There was an error removing XP from the user. Please try again.");
    
                return message.channel.send({ embeds: [errorEmbed] });
            }
        }
    },

    // * NEW
    addbadge: {
        execute: async (message, args, client) => {
            const serverId = message.guild.id;
    
            // Step 1: Fetch all badges from the server
            const badgesData = await getServerBadgesFromDB(serverId);  // Make sure this function returns badgeName, badgeEmoji, and level
    
            if (!badgesData || badgesData.length === 0) {
                const noBadgeEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("No Badges Found")
                    .setDescription("There are no badges set for this server.")
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [noBadgeEmbed] });
            }
    
            // Logging badge data to see what is being returned
            console.log("Fetched Badges Data:", badgesData);
    
            // Display badges or "Not set" if no badge is set
            const badgesDisplay = badgesData.map(badge => {
                const level = badge.level !== undefined ? badge.level : 'Unknown Level';  // Check if level exists
                return `${level}: ${badge.badgeEmoji} ${badge.badgeName}`;
            }).join('\n');
    
            // Step 1: Ask for user input
            const step1Embed = new EmbedBuilder()
                .setColor(0x3498db)  // Blue for info
                .setTitle("Available Badges")
                .setDescription("Please mention a user and provide the badge name or level to assign them a badge.")
                .addFields(
                    { name: "Available Badges", value: badgesDisplay || "No badges available.", inline: true },
                    { name: "How to Proceed", value: "Mention a user and provide the badge name or level. Example: `@User 5` or `@User BadgeName`", inline: true }
                )
                .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
            // Send the embed with available badges and instructions
            await message.channel.send({ embeds: [step1Embed] });
    
            // Step 2: Wait for user response with the mentioned user and badge info
            const filter = response => response.author.id === message.author.id && response.mentions.users.size > 0;
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
            if (!collected || collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Timed Out")
                    .setDescription("You did not respond in time. Please run the command again.")
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [timeoutEmbed] });
            }
    
            const userResponse = collected.first();
            const mentionedUser = userResponse.mentions.users.first();
            const badgeInput = userResponse.content.split(' ').slice(1).join(' ').trim();  // The badge name or level
    
            if (!mentionedUser) {
                const invalidUserEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Invalid User")
                    .setDescription("Please mention a valid user to assign the badge to.")
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [invalidUserEmbed] });
            }

            // Try to find the badge by name or level
            const badge = badgesData.find(b => b.badgeName.toLowerCase() === badgeInput.toLowerCase() || b.level.toString() === badgeInput);
    
            // Check if badge is found
            if (!badge) {
                const invalidBadgeEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Invalid Badge")
                    .setDescription(`Badge "${badgeInput}" was not found. Please provide a valid badge name or level from the list.`)
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [invalidBadgeEmbed] });
            }
    
            console.log("Found Badge:", badge);  // Log to see if the badge is found
    
            // Step 3: Assign the badge to the mentioned user
            const userId = mentionedUser.id;
    
            try {
                await assignServerBadgeToUser(serverId, userId, badge.level);  // Assuming this function assigns the badge
    
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)  // Green for success
                    .setTitle("Badge Assigned Successfully")
                    .setDescription(`Badge for level ${badge.level || 'Unknown'} (${badge.badgeEmoji} ${badge.badgeName}) has been assigned to ${mentionedUser.username}.`)
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [successEmbed] });
            } catch (err) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Error Assigning Badge")
                    .setDescription(`Failed to assign badge due to: ${err}`)
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [errorEmbed] });
            }
        }
    },   

    // * NEW
    rmbadge: {
        execute: async (message, args, client) => {
            const serverId = message.guild.id;
    
            // Step 1: Fetch all badges for the server
            const badgesData = await getServerBadgesFromDB(serverId);  // Fetch server badges
            if (!badgesData || badgesData.length === 0) {
                const noBadgeEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("No Badges Found")
                    .setDescription("There are no badges set for this server.")
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [noBadgeEmbed] });
            }
    
            // Step 2: Display badges and ask for the user and badge to remove
            const badgesDisplay = badgesData.map(badge => {
                const level = badge.level !== undefined ? badge.level : 'Unknown Level';  // Handle undefined levels
                return `${level}: ${badge.badgeEmoji} ${badge.badgeName}`;
            }).join('\n');
    
            const step1Embed = new EmbedBuilder()
                .setColor(0x3498db)  // Blue for info
                .setTitle("Available Badges")
                .setDescription("Please mention a user and provide the badge name or level to remove their badge.")
                .addFields(
                    { name: "Available Badges", value: badgesDisplay || "No badges available.", inline: true },
                    { name: "How to Proceed", value: "Mention a user and provide the badge name or level to remove. Example: `@User 5` or `@User BadgeName`", inline: true }
                )
                .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
            await message.channel.send({ embeds: [step1Embed] });
    
            // Step 3: Wait for user response
            const filter = response => response.author.id === message.author.id && response.mentions.users.size > 0;
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
            if (!collected || collected.size === 0) {
                const timeoutEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Timed Out")
                    .setDescription("You did not respond in time. Please run the command again.")
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [timeoutEmbed] });
            }
    
            const userResponse = collected.first();
            const mentionedUser = userResponse.mentions.users.first();
            const badgeInput = userResponse.content.split(' ').slice(1).join(' ').trim();  // The badge name or level
    
            if (!mentionedUser) {
                const invalidUserEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Invalid User")
                    .setDescription("Please mention a valid user to remove the badge from.")
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [invalidUserEmbed] });
            }
    
            // Step 4: Find the badge by name or level
            const badge = badgesData.find(b => b.badgeName.toLowerCase() === badgeInput.toLowerCase() || b.level.toString() === badgeInput);
            if (!badge) {
                const invalidBadgeEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Invalid Badge")
                    .setDescription(`Badge "${badgeInput}" was not found. Please provide a valid badge name or level from the list.`)
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [invalidBadgeEmbed] });
            }
    
            console.log("Found Badge:", badge);  // Log to see if the badge is found
    
            // Step 5: Remove the badge from the user
            const userId = mentionedUser.id;
            const userBadges = await getUserBadgesFromDB(serverId, userId);  // Fetch the user's current badges
    
            const badgeIndex = userBadges.findIndex(b => b.badgeName === badge.badgeName || b.level === badge.level);
            if (badgeIndex === -1) {
                const noBadgeEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Badge Not Found")
                    .setDescription(`The user does not have the badge "${badgeInput}".`)
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [noBadgeEmbed] });
            }
    
            // Remove the badge
            userBadges.splice(badgeIndex, 1);
    
            // Update the database
            try {
                await saveUserBadgesData(serverId, userId, userBadges);  // Save updated badge data
                const successEmbed = new EmbedBuilder()
                    .setColor(0x00ff00)  // Green for success
                    .setTitle("Badge Removed Successfully")
                    .setDescription(`The badge "${badge.badgeEmoji} ${badge.badgeName}" has been removed from ${mentionedUser.username}.`)
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [successEmbed] });
            } catch (err) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("Error Removing Badge")
                    .setDescription(`Failed to remove badge due to: ${err}`)
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [errorEmbed] });
            }
        }
    },

    // * NEW
    viewbadges: {
        execute: async (message) => {
            const serverId = message.guild.id;
            const mentionedUser = message.mentions.users.first() || message.author; // Either get mentioned user or the author themselves
            const userId = mentionedUser.id;
    
            // Step 1: Fetch all server badges
            const serverBadges = await getServerBadgesFromDB(serverId);
            if (!serverBadges || serverBadges.length === 0) {
                const noBadgeEmbed = new EmbedBuilder()
                    .setColor(0xff0000)  // Red for failure
                    .setTitle("No Server Badges")
                    .setDescription("This server currently has no badges set.")
                    .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
                return message.channel.send({ embeds: [noBadgeEmbed] });
            }
    
            // Step 2: Fetch the user's badges
            const userBadges = await getUserBadgesFromDB(serverId, userId);
            const userBadgeNames = userBadges.map(badge => badge.badgeName); // Extract badge names the user has
    
            // Step 3: Compare badges (server vs. user)
            const badgesComparison = serverBadges.map(badge => {
                const hasBadge = userBadgeNames.includes(badge.badgeName);
                const badgeStatus = hasBadge ? `✅ - ${badge.badgeEmoji} ${badge.badgeName} [${badge.level}]` : `❌ - ${badge.badgeEmoji} ${badge.badgeName} [${badge.level}]`;
                return badgeStatus;
            }).join('\n');
    
            // Step 4: Prepare the embed
            const badgeEmbed = new EmbedBuilder()
                .setColor(0x3498db)  // Blue for info
                .setTitle(`${mentionedUser.username}'s Badges`)
                .setDescription("Here is a list of badges set by the server, and whether the user has them.")
                .addFields(
                    { name: "Badges", value: badgesComparison || "No badges set in this server." }
                )
                .setFooter({ text: message.client.user.username, iconURL: message.client.user.displayAvatarURL() });
    
            // Step 5: Send the embed
            return message.channel.send({ embeds: [badgeEmbed] });
        }
    },
    
    // * NEW
    setbadges: {
        execute: async (message, args, client) => {
            if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
                return message.channel.send("You don't have permission to use this command.");
            }
    
            const serverId = message.guild.id;
            const userId = message.author.id;
    
            // Fetch milestone levels and badges data from the database
            const milestoneLevels = await getMilestoneLevelsFromDB(serverId);
            const serverBadgesData = await getServerBadgesFromDB(serverId);  // Server-wide badges
    
            // Check if milestone levels exist
            if (!milestoneLevels || milestoneLevels.length === 0) {
                return message.channel.send("No milestone levels have been set. Please set milestone levels before assigning badges.");
            }
    
            const levelsString = [];
    
            // Parse and push levels from milestoneLevels to levelsString
            if (milestoneLevels && milestoneLevels[0]) {
                let parsedLevels;
                try {
                    parsedLevels = JSON.parse(milestoneLevels[0].level);
                } catch (err) {
                    console.error("Error parsing milestone levels:", err);
                    return message.channel.send("Error occurred while processing milestone levels.");
                }
            
                // Check if parsedLevels is an array before spreading
                if (Array.isArray(parsedLevels)) {
                    levelsString.push(...parsedLevels);  // Spread the parsed levels into the array
                } else {
                    console.error("Parsed levels is not an array:", parsedLevels);
                    return message.channel.send("Milestone levels are in an incorrect format.");
                }
            }
    
            // Display badges or "Not set" if no badge is set
            const badgesDisplay = levelsString.map(level => {
                const badge = serverBadgesData.find(badge => badge.level == level);
                if (badge) {
                    return `${level}: ${badge.badgeEmoji} ${badge.badgeName}`;
                } else {
                    return `${level}: No badge assigned`;
                }
            }).join('\n');
    
            // Prepare the embed for displaying current badges and levels
            const initialEmbed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle("Set Badges for Milestone Levels")
                .setDescription("Select a level to set a badge.")
                .addFields(
                    { name: "Current Milestone Levels", value: levelsString.join(', ') || "No levels set.", inline: true },
                    { name: "Current Badges", value: badgesDisplay || "No badges set.", inline: true }
                )
                .setFooter({ text: "Use the correct format to update badges.", iconURL: message.client.user.displayAvatarURL() });
    
            await message.channel.send({ embeds: [initialEmbed] });
    
            // Wait for the user to respond
            const filter = response => response.author.id === message.author.id;
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
            if (!collected || collected.size === 0) {
                return message.channel.send("You did not respond in time. Run the command again to update badges.");
            }
    
            const input = collected.first().content.trim().toLowerCase();
    
            // Proceed with setting a badge if no removal was triggered
            const level = parseInt(input, 10);
            if (isNaN(level) || !levelsString.includes(level.toString())) {
                return message.channel.send(`Invalid level. Please select a valid milestone level from: ${levelsString.join(', ')}`);
            }
    
            // Ask for emoji
            await message.channel.send("Please provide the emoji you want to set for this badge:");
            const collectedEmoji = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
            if (!collectedEmoji || collectedEmoji.size === 0) {
                return message.channel.send("You did not respond in time. Run the command again to update badges.");
            }
    
            const emoji = collectedEmoji.first().content.trim();
    
            // Ask for name
            await message.channel.send("Please provide a name for this badge:");
            const collectedName = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
            if (!collectedName || collectedName.size === 0) {
                return message.channel.send("You did not respond in time. Run the command again to update badges.");
            }
    
            const badgeName = collectedName.first().content.trim();
    
            // Set the badge and save the data
            const badgeData = { badgeName: badgeName, badgeEmoji: emoji, level: level };
    
            try {
                // Save the server-wide badge
                await saveServerBadgesData(serverId, [badgeData]);
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
    }    
};
