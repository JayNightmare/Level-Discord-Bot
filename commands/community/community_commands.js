const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const DBL = require('dblapi.js');
const axios = require('axios');
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bot.db');

const { // User DB:
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
    notifyUpdate } = require("../utils.js");

async function executeProfile(user, guild, channel) {
    const serverId = guild.id;
    const userId = user.id;
    const userData = await getUserData(serverId, userId);
    const member = guild.members.cache.get(userId) || await guild.members.fetch(userId);
    const userBadges = await getUserBadgesFromDB(serverId, userId);

    const bio = userData.bio || "This user hasn't set a bio yet";

    // Display roles the user has (filtering out @everyone)
    const roles = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => `<@&${role.id}>`)
        .join(", ") || "No roles";

    // If no badges, show default message
    const badgeDisplay = userBadges.length > 0
    ? userBadges.map(badge => `${badge.badgeEmoji}`).join('\u200B \u200B \u200B')
    : "No badges";

    const level = userData.level;
    const baseMultiplier = 100;
    const scalingFactor = 1.1;

    const xpNeededForCurrentLevel = Math.floor(level * baseMultiplier * Math.pow(scalingFactor, level));
    const xpNeededForNextLevel = Math.floor((level + 1) * baseMultiplier * Math.pow(scalingFactor, level + 1));

    const xpToNextLevel = xpNeededForNextLevel - xpNeededForCurrentLevel;

    const xpProgress = Math.floor((userData.xp / xpToNextLevel) * 10);
    const progressBar = '█'.repeat(xpProgress) + '░'.repeat(10 - xpProgress); 

    let embedColor;
    if (userData.level >= 50) {
        embedColor = 0xFFD700; // ? Gold for level 50+
    } else if (userData.level >= 41) {
        embedColor = 0xE74C3C; // ? Ruby Red for level 41-49
    } else if (userData.level >= 31) {
        embedColor = 0xFF69B4; // ? Bright Pink for level 31-40
    } else if (userData.level >= 21) {
        embedColor = 0xF1C40F; // ? Bright Yellow for level 21-30
    } else if (userData.level >= 16) {
        embedColor = 0x9B59B6; // ? Purple for level 16-20
    } else if (userData.level >= 11) {
        embedColor = 0xE67E22; // ? Deep Orange for level 11-15
    } else if (userData.level >= 6) {
        embedColor = 0x2ECC71; // ? Emerald Green for level 6-10
    } else {
        embedColor = 0x3498DB; // ? Sky Blue for level 1-5
    }


    // Create an embed with the user's profile data
    const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setTitle(`${member.displayName}'s Profile`)
        .setDescription(bio)
        .addFields(
            { name: 'Level', value: `${userData.level}`, inline: true },
            { name: 'XP', value: `${userData.xp}`, inline: true },
            { name: 'Progress', value: `${progressBar} (${userData.xp}/${xpToNextLevel} XP)`, inline: true },
            // { name: '\u200B', value: '\u200B', inline: true },
            { name: 'Roles', value: roles, inline: true },
            { name: 'Badges', value: badgeDisplay, inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: `*Tip: Use the /setbio or !setbio command to update your bio*` });

    // Send the profile embed to the channel
    await channel.send({ embeds: [embed] });
}

// Shared function for setting bio logic
async function executeSetBio(user, bio, guild, channel) {
    const serverId = guild.id;
    const userId = user.id;

    // Update the bio in the database
    await updateUserBio(serverId, userId, bio);

    // Confirmation message
    const confirmEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle("Bio Updated")
        .setDescription(`Your bio has been successfully updated!`)
        .addFields({ name: "Your new bio", value: bio })
        .setFooter({ text: `Updated by ${user.username}`, iconURL: user.displayAvatarURL() });

    // Send the confirmation message to the user
    await channel.send({ embeds: [confirmEmbed] });
}

async function executeLeaderboard(guild, channel) {
    const serverId = guild.id;

    // Fetch user data from the database
    db.all(`
        SELECT userId, xp, level
        FROM users
        WHERE serverId = ?
    `, [serverId], async (err, rows) => {
        if (err) {
            console.error("Error fetching leaderboard:", err.message);
            return channel.send("There was an error retrieving the leaderboard.");
        }

        if (!rows || rows.length === 0) {
            return channel.send("No one has earned any XP yet!");
        }

        // Fetch members and prepare leaderboard data
        const leaderboard = await Promise.all(rows.map(async row => {
            let member = guild.members.cache.get(row.userId);
            if (!member) {
                try {
                    member = await guild.members.fetch(row.userId); // Fetch member if not cached
                } catch (error) {
                    console.error(`Failed to fetch member with ID: ${row.userId}`);
                    return null; // Skip users who can't be fetched
                }
            }

            return {
                displayName: member ? member.displayName : "Unknown User",
                level: row.level,
                xp: row.xp
            };
        }));

        const validLeaderboard = leaderboard.filter(user => user !== null); // Remove null entries

        // Sort by level and xp
        const sortedLeaderboard = validLeaderboard.sort((a, b) => {
            if (b.level === a.level) {
                return b.xp - a.xp;
            }
            return b.level - a.level;
        }).slice(0, 10); // Limit to top 10

        // Prepare fields for leaderboard
        const usersField = sortedLeaderboard.map((user, index) => `${index + 1}. ${user.displayName}`).join('\n');
        const levelsField = sortedLeaderboard.map(user => `${user.level}`).join('\n');

        // Create leaderboard embed
        const leaderboardEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("Server Leaderboard")
            .addFields(
                { name: "Top 10", value: usersField, inline: true },
                { name: "Level", value: levelsField, inline: true }
            )
            .setTimestamp();

        await channel.send({ embeds: [leaderboardEmbed] });
    });
}

async function executeVote(userId, guild, channel, client, hardcodedBotId) {
    const serverId = guild.id;

    // Ensure user data is initialized in the database
    await ensureUserData(serverId, userId);

    try {
        const response = await axios.get(`https://top.gg/api/bots/${hardcodedBotId}/check?userId=${userId}`, {
            headers: { Authorization: process.env.TOPGG_API_KEY }
        });

        const voted = response.data.voted;

        const voteEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("Vote for Level Bot to Earn Rewards")
            .setDescription("Vote for the bot to help it grow and earn extra XP as a reward!")
            .addFields({
                name: 'Vote on top.gg to earn 100 XP',
                value: voted
                    ? '🔴 You have already voted. You can vote again in 12 hours.'
                    : `🟢 You can vote now. [Vote here!](https://top.gg/bot/${hardcodedBotId}/vote)`,
                inline: false
            })
            .setFooter({
                text: "Thank you for your support!",
                iconURL: client.user.displayAvatarURL()
            });

        await channel.send({ embeds: [voteEmbed] });

        if (voted) {
            return channel.send("It looks like you have already voted. You can vote again in 12 hours.");
        } else {
            // Update XP and lastVote in the database
            await updateUserVoteData(serverId, userId, 100);  // Add 100 XP
            return channel.send(`Thank you for voting! You have earned 100 XP.`);
        }
    } catch (error) {
        console.error("Error in executeVote:", error);
    }
}

function updateUserVoteData(serverId, userId, xpReward) {
    return new Promise((resolve, reject) => {
        const now = Date.now();
        db.run(`
            UPDATE users 
            SET xp = xp + ?, lastVote = ?
            WHERE serverId = ? AND userId = ?
        `, [xpReward, now, serverId, userId], (err) => {
            if (err) {
                console.error("Error updating vote data:", err.message);
                return reject(err);
            }
            resolve();
        });
    });
}

async function executeCheckRoles(user, guild, channel) {
    const member = guild.members.cache.get(user.id);
    const roles = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => role.id)
        .join(", ");

    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`${user.username}'s Roles`)
        .setDescription(`<@&${roles}>` || "You don't have any special roles.")
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: "Role Checker", iconURL: guild.client.user.displayAvatarURL() });

    await channel.send({ embeds: [embed] });
}

module.exports = {
    // * NEW
    rank: {
        execute: async (message) => {
            try {
                const user = message.author;
    
                const serverId = message.guild.id;
                const guild = message.guild;
                const serverConfigsData = await getServerConfigsData(serverId);
                const allowedChannelId = serverConfigsData?.allowedChannel;
                const allowedChannel = allowedChannelId ? message.guild.channels.cache.get(allowedChannelId) || message.channel : message.channel;
                
                if (!allowedChannel) { 
                    return;
                }
                else {
                    const userId = user.id;
                    const userData = await getUserData(serverId, userId);
                    const member = guild.members.cache.get(userId) || await guild.members.fetch(userId);

                    const level = userData.level;
                    const baseMultiplier = 100;
                    const scalingFactor = 1.1;

                    const xpNeededForCurrentLevel = Math.floor(level * baseMultiplier * Math.pow(scalingFactor, level));
                    const xpNeededForNextLevel = Math.floor((level + 1) * baseMultiplier * Math.pow(scalingFactor, level + 1));

                    const xpToNextLevel = xpNeededForNextLevel - xpNeededForCurrentLevel;

                    const xpProgress = Math.floor((userData.xp / xpToNextLevel) * 10);
                    const progressBar = '█'.repeat(xpProgress) + '░'.repeat(10 - xpProgress); 

                    let embedColor;
                    if (userData.level >= 50) {
                        embedColor = 0xFFD700; // ? Gold for level 50+
                    } else if (userData.level >= 41) {
                        embedColor = 0xE74C3C; // ? Ruby Red for level 41-49
                    } else if (userData.level >= 31) {
                        embedColor = 0xFF69B4; // ? Bright Pink for level 31-40
                    } else if (userData.level >= 21) {
                        embedColor = 0xF1C40F; // ? Bright Yellow for level 21-30
                    } else if (userData.level >= 16) {
                        embedColor = 0x9B59B6; // ? Purple for level 16-20
                    } else if (userData.level >= 11) {
                        embedColor = 0xE67E22; // ? Deep Orange for level 11-15
                    } else if (userData.level >= 6) {
                        embedColor = 0x2ECC71; // ? Emerald Green for level 6-10
                    } else {
                        embedColor = 0x3498DB; // ? Sky Blue for level 1-5
                    }


                    // Create an embed with the user's profile data
                    const embed = new EmbedBuilder()
                        .setColor(embedColor)
                        .setTitle(`${member.displayName}'s Profile`)
                        .addFields(
                            { name: 'Level', value: `${userData.level}`, inline: true },
                            { name: 'XP', value: `${userData.xp}`, inline: true },
                            { name: 'Progress', value: `${progressBar} (${userData.xp}/${xpToNextLevel} XP)`, inline: false }
                        )
                        .setThumbnail(user.displayAvatarURL())
                        .setFooter({ text: `*Tip: Use the /profile or profile command to see your server profile*` });

                    // Send the profile embed to the channel
                    await message.channel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error in rank command (prefix):', error);
                message.channel.send("There was an error retrieving your rank.");
            }
        }
    },    

    // ? Slash
    slashRank: {
        execute: async (interaction) => {
            try {
                const user = interaction.user;
    
                const serverId = interaction.guild.id;
                const guild = interaction.guild;
                const serverConfigsData = await getServerConfigsData(serverId);
                const allowedChannelId = serverConfigsData?.allowedChannel;
                const allowedChannel = allowedChannelId ? interaction.guild.channels.cache.get(allowedChannelId) || interaction.channel : interaction.channel;
                
                if (!allowedChannel) { 
                    return;
                }
                else {
                    const userId = user.id;
                    const userData = await getUserData(serverId, userId);
                    const member = guild.members.cache.get(userId) || await guild.members.fetch(userId);

                    const level = userData.level;
                    const baseMultiplier = 100;
                    const scalingFactor = 1.1;

                    const xpNeededForCurrentLevel = Math.floor(level * baseMultiplier * Math.pow(scalingFactor, level));
                    const xpNeededForNextLevel = Math.floor((level + 1) * baseMultiplier * Math.pow(scalingFactor, level + 1));

                    const xpToNextLevel = xpNeededForNextLevel - xpNeededForCurrentLevel;

                    const xpProgress = Math.floor((userData.xp / xpToNextLevel) * 10);
                    const progressBar = '█'.repeat(xpProgress) + '░'.repeat(10 - xpProgress); 

                    let embedColor;
                    if (userData.level >= 50) {
                        embedColor = 0xFFD700; // ? Gold for level 50+
                    } else if (userData.level >= 41) {
                        embedColor = 0xE74C3C; // ? Ruby Red for level 41-49
                    } else if (userData.level >= 31) {
                        embedColor = 0xFF69B4; // ? Bright Pink for level 31-40
                    } else if (userData.level >= 21) {
                        embedColor = 0xF1C40F; // ? Bright Yellow for level 21-30
                    } else if (userData.level >= 16) {
                        embedColor = 0x9B59B6; // ? Purple for level 16-20
                    } else if (userData.level >= 11) {
                        embedColor = 0xE67E22; // ? Deep Orange for level 11-15
                    } else if (userData.level >= 6) {
                        embedColor = 0x2ECC71; // ? Emerald Green for level 6-10
                    } else {
                        embedColor = 0x3498DB; // ? Sky Blue for level 1-5
                    }


                    // Create an embed with the user's profile data
                    const embed = new EmbedBuilder()
                        .setColor(embedColor)
                        .setTitle(`${member.displayName}'s Profile`)
                        .addFields(
                            { name: 'Level', value: `${userData.level}`, inline: true },
                            { name: 'XP', value: `${userData.xp}`, inline: true },
                            { name: 'Progress', value: `${progressBar} (${userData.xp}/${xpToNextLevel} XP)`, inline: false }
                        )
                        .setThumbnail(user.displayAvatarURL())
                        .setFooter({ text: `*Tip: Use the /profile or profile command to see your server profile*` });

                    // Send the profile embed to the channel
                    await interaction.reply({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error in rank command (slash):', error);
    
                // Fallback error message if something goes wrong
                try {
                    await interaction.editReply("There was an error retrieving your rank.");
                } catch (editError) {
                    console.error("Failed to edit the reply:", editError);
                }
            }
        }
    },             

// //

    // * NEW
    checkroles: {
        execute: async (message) => {
            try {
                const serverId = message.guild.id;

                // Fetch server configuration from the database
                const serverConfigsData = await getServerConfigsData(serverId);
                if (!serverConfigsData) {
                    return message.channel.send("Server configuration not found.");
                }

                const allowedChannelId = serverConfigsData.allowedChannel;
                let allowedChannel = message.channel;
                if (allowedChannelId && allowedChannelId !== message.channel.id) {
                    allowedChannel = message.guild.channels.cache.get(allowedChannelId) || await message.guild.channels.fetch(allowedChannelId).catch(() => null);
                    if (!allowedChannel) {
                        return message.channel.send("The allowed channel could not be found or fetched.");
                    }
                }

                // Call shared checkroles logic
                await executeCheckRoles(message.author, message.guild, allowedChannel);
            } catch (error) {
                console.error('Error in checkroles command (prefix):', error);
                message.channel.send("There was an error retrieving your roles.");
            }
        }
    },

    // ? Slash
    slashCheckRoles: {
        execute: async (interaction) => {
            try {
                const serverId = interaction.guild.id;
                const guild = interaction.guild;
                const user = interaction.user;
    
                // Fetch server configuration from the database
                const serverConfigsData = await getServerConfigsData(serverId);
                if (!serverConfigsData) {
                    return interaction.reply("Server configuration not found.");
                }
    
                const allowedChannelId = serverConfigsData.allowedChannel;
                let allowedChannel = interaction.channel;
                if (allowedChannelId && allowedChannelId !== interaction.channel.id) {
                    allowedChannel = interaction.guild.channels.cache.get(allowedChannelId) || await interaction.guild.channels.fetch(allowedChannelId).catch(() => null);
                    if (!allowedChannel) {
                        return interaction.reply("The allowed channel could not be found or fetched.");
                    }
                }
    
                const member = guild.members.cache.get(user.id);
                const roles = member.roles.cache
                    .filter(role => role.name !== '@everyone')
                    .map(role => role.id)
                    .join(", ");

                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(`${user.username}'s Roles`)
                    .setDescription(`<@&${roles}>` || "You don't have any special roles.")
                    .setThumbnail(user.displayAvatarURL())
                    .setFooter({ text: "Role Checker", iconURL: guild.client.user.displayAvatarURL() });

                await interaction.reply({ embeds: [embed] });
            } catch (error) {
                console.error('Error in checkroles command (slash):', error);
                interaction.reply("There was an error retrieving your roles.");
            }
        }
    },

// //

    // * NEW 
    profile: {
        execute: async (message, data, badgesData, saveData) => {
            try {
                // Use mentioned user or message author for prefix commands
                const user = message.mentions.users.first() || message.author;
    
                const serverId = message.guild.id;
                const serverConfigsData = await getServerConfigsData(serverId);
                const allowedChannelId = serverConfigsData?.allowedChannel;
                const allowedChannel = allowedChannelId ? message.guild.channels.cache.get(allowedChannelId) || message.channel : message.channel;
    
                await executeProfile(user, message.guild, allowedChannel, data, badgesData, saveData);
            } catch (error) {
                
                console.error('Error in profile command (prefix): ', error);
                message.channel.send("There was an error generating this profile. Try again in 1 minute");
            }
        },
    },

    // ? Slash
    slashProfile: {
        execute: async (interaction) => {
            try {
                const user = interaction.options.getUser('user') || interaction.user;
    
                const serverId = interaction.guild.id;
                const guild = interaction.guild;
                const serverConfigsData = await getServerConfigsData(serverId);
                const allowedChannelId = serverConfigsData?.allowedChannel;
                const allowedChannel = allowedChannelId ? interaction.guild.channels.cache.get(allowedChannelId) || interaction.channel : interaction.channel;
                
                if (!allowedChannel) { 
                    return;
                }
                else {
                    const userId = user.id;
                    const userData = await getUserData(serverId, userId);
                    const member = guild.members.cache.get(userId) || await guild.members.fetch(userId);
                    const userBadges = await getUserBadgesFromDB(serverId, userId);

                    const bio = userData.bio || "This user hasn't set a bio yet";

                    // Display roles the user has (filtering out @everyone)
                    const roles = member.roles.cache
                        .filter(role => role.name !== '@everyone')
                        .map(role => `<@&${role.id}>`)
                        .join(", ") || "No roles";

                    // If no badges, show default message
                    const badgeDisplay = userBadges.length > 0
                    ? userBadges.map(badge => `${badge.badgeEmoji}`).join('\u200B \u200B \u200B')
                    : "No badges";

                    const level = userData.level;
                    const baseMultiplier = 100;
                    const scalingFactor = 1.1;

                    const xpNeededForCurrentLevel = Math.floor(level * baseMultiplier * Math.pow(scalingFactor, level));
                    const xpNeededForNextLevel = Math.floor((level + 1) * baseMultiplier * Math.pow(scalingFactor, level + 1));

                    const xpToNextLevel = xpNeededForNextLevel - xpNeededForCurrentLevel;

                    const xpProgress = Math.floor((userData.xp / xpToNextLevel) * 10);
                    const progressBar = '█'.repeat(xpProgress) + '░'.repeat(10 - xpProgress); 

                    let embedColor;
                    if (userData.level >= 50) {
                        embedColor = 0xFFD700; // ? Gold for level 50+
                    } else if (userData.level >= 41) {
                        embedColor = 0xE74C3C; // ? Ruby Red for level 41-49
                    } else if (userData.level >= 31) {
                        embedColor = 0xFF69B4; // ? Bright Pink for level 31-40
                    } else if (userData.level >= 21) {
                        embedColor = 0xF1C40F; // ? Bright Yellow for level 21-30
                    } else if (userData.level >= 16) {
                        embedColor = 0x9B59B6; // ? Purple for level 16-20
                    } else if (userData.level >= 11) {
                        embedColor = 0xE67E22; // ? Deep Orange for level 11-15
                    } else if (userData.level >= 6) {
                        embedColor = 0x2ECC71; // ? Emerald Green for level 6-10
                    } else {
                        embedColor = 0x3498DB; // ? Sky Blue for level 1-5
                    }


                    // Create an embed with the user's profile data
                    const embed = new EmbedBuilder()
                        .setColor(embedColor)
                        .setTitle(`${member.displayName}'s Profile`)
                        .setDescription(bio)
                        .addFields(
                            { name: 'Level', value: `${userData.level}`, inline: true },
                            { name: 'XP', value: `${userData.xp}`, inline: true },
                            { name: 'Progress', value: `${progressBar} (${userData.xp}/${xpToNextLevel} XP)`, inline: true },
                            // { name: '\u200B', value: '\u200B', inline: true },
                            { name: 'Roles', value: roles, inline: true },
                            { name: 'Badges', value: badgeDisplay, inline: true }
                        )
                        .setThumbnail(user.displayAvatarURL())
                        .setFooter({ text: `*Tip: Use the /setbio or !setbio command to update your bio*` });

                    // Send the profile embed to the channel
                    await interaction.reply({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error in profile command (slash): ', error);
                interaction.reply("There was an error generating this user's profile. There was an error generating this profile. Try again in 1 minute");
            }
        }
    },

// //
    
    // * NEW
    setbio: {
        execute: async (message, data, saveData) => {
            try {
                const serverId = message.guild.id;
                const userId = message.author.id;
    
                const serverConfigsData = await getServerConfigsData(serverId);
                const allowedChannelId = serverConfigsData?.allowedChannel;
    
                if (!allowedChannelId || allowedChannelId === message.channel.id) {
                    let allowedChannel = message.channel;
    
                    if (allowedChannelId) {
                        allowedChannel = message.guild.channels.cache.get(allowedChannelId) || await message.guild.channels.fetch(allowedChannelId).catch(() => null);
                        if (!allowedChannel) {
                            return message.channel.send("The allowed channel could not be found or fetched.");
                        }
                    }
    
                    // Step 1: Ask for the user's bio
                    const embed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle("Set Bio")
                        .setDescription("Please provide the bio you want to set. Type your bio below:")
                        .setFooter({ text: "Set your bio", iconURL: message.author.displayAvatarURL() });
    
                    await allowedChannel.send({ embeds: [embed] });
    
                    // Wait for the user's response
                    const filter = response => response.author.id === message.author.id;
                    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    
                    if (!collected || collected.size === 0) {
                        return message.channel.send("You did not provide a bio. Please try again.");
                    }
    
                    const bio = collected.first().content.trim();
                    if (!bio) return message.channel.send("Please provide a valid bio.");
    
                    // Step 2: Save the bio using the shared logic
                    await executeSetBio(message.author, bio, message.guild, allowedChannel, data, saveData);
                }
            } catch (error) {
                console.error('Error in setbio command (prefix): ', error);
                message.channel.send("There was an error updating your bio.");
            }
        }
    },

    // ? Slash
    slashSetBio: {
        execute: async (interaction) => {
            try {
                const bio = interaction.options.getString('bio');
                const user = interaction.user;
                
                const serverId = interaction.guild.id;
                const serverConfigsData = await getServerConfigsData(serverId);
                const allowedChannelId = serverConfigsData?.allowedChannel;
                let allowedChannel = interaction.channel;
    
                if (allowedChannelId) {
                    allowedChannel = interaction.guild.channels.cache.get(allowedChannelId) || interaction.channel;
                }
    
                const userId = user.id;

                // Update the bio in the database
                await updateUserBio(serverId, userId, bio);

                // Confirmation message
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle("Bio Updated")
                    .setDescription(`Your bio has been successfully updated!`)
                    .addFields({ name: "Your new bio", value: bio })
                    .setFooter({ text: `Updated by ${user.username}`, iconURL: user.displayAvatarURL() });

                // Send the confirmation message to the user
                await interaction.reply({ embeds: [confirmEmbed] });
            } catch (error) {
                console.error('Error in setbio command (slash): ', error);
                interaction.reply("There was an error updating your bio.");
            }
        }
    },

// //

    // * NEW
    leaderboard: {
        execute: async (message, data) => {
            try {
                const serverId = message.guild.id;
                const serverConfigsData = await getServerConfigsData(serverId);
    
                const allowedChannelId = serverConfigsData?.allowedChannel;
                let allowedChannel = message.channel;
                if (allowedChannelId && allowedChannelId !== message.channel.id) {
                    allowedChannel = message.guild.channels.cache.get(allowedChannelId) || await message.guild.channels.fetch(allowedChannelId).catch(() => null);
                    if (!allowedChannel) {
                        return message.channel.send("The allowed channel could not be found or fetched.");
                    }
                }
    
                // Use shared logic to generate leaderboard
                await executeLeaderboard(message.guild, allowedChannel, data);
            } catch (error) {
                console.error('Error in leaderboard command (prefix):', error);
                message.channel.send("There was an error retrieving the leaderboard.");
            }
        }
    },

    // ? Slash
    slashLeaderboard: {
        execute: async (interaction) => {
            try {
                const serverId = interaction.guild.id;
                const guild = interaction.guild;
                const serverConfigsData = await getServerConfigsData(serverId);
    
                const allowedChannelId = serverConfigsData?.allowedChannel;
                let allowedChannel = interaction.channel;
                if (allowedChannelId && allowedChannelId !== interaction.channel.id) {
                    allowedChannel = interaction.guild.channels.cache.get(allowedChannelId) || await interaction.guild.channels.fetch(allowedChannelId).catch(() => null);
                    if (!allowedChannel) {
                        return interaction.reply("The allowed channel could not be found or fetched.");
                    }
                }
    
                // Fetch user data from the database
                db.all(`
                    SELECT userId, xp, level
                    FROM users
                    WHERE serverId = ?
                `, [serverId], async (err, rows) => {
                    if (err) {
                        console.error("Error fetching leaderboard:", err.message);
                        return interaction.reply("There was an error retrieving the leaderboard.");
                    }

                    if (!rows || rows.length === 0) {
                        return interaction.reply("No one has earned any XP yet!");
                    }

                    // Fetch members and prepare leaderboard data
                    const leaderboard = await Promise.all(rows.map(async row => {
                        let member = guild.members.cache.get(row.userId);
                        if (!member) {
                            try {
                                member = await guild.members.fetch(row.userId); // Fetch member if not cached
                            } catch (error) {
                                console.error(`Failed to fetch member with ID: ${row.userId}`);
                                return null; // Skip users who can't be fetched
                            }
                        }

                        return {
                            displayName: member ? member.displayName : "Unknown User",
                            level: row.level,
                            xp: row.xp
                        };
                    }));

                    const validLeaderboard = leaderboard.filter(user => user !== null); // Remove null entries

                    // Sort by level and xp
                    const sortedLeaderboard = validLeaderboard.sort((a, b) => {
                        if (b.level === a.level) {
                            return b.xp - a.xp;
                        }
                        return b.level - a.level;
                    }).slice(0, 10); // Limit to top 10

                    // Prepare fields for leaderboard
                    const usersField = sortedLeaderboard.map((user, index) => `${index + 1}. ${user.displayName}`).join('\n');
                    const levelsField = sortedLeaderboard.map(user => `${user.level}`).join('\n');

                    // Create leaderboard embed
                    const leaderboardEmbed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle("Server Leaderboard")
                        .addFields(
                            { name: "Top 10", value: usersField, inline: true },
                            { name: "Level", value: levelsField, inline: true }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [leaderboardEmbed] });
                });
            } catch (error) {
                console.error('Error in leaderboard command (slash):', error);
                interaction.reply("There was an error retrieving the leaderboard.");
            }
        }
    },

// //

    // * NEW
    // TODO: Add new commands
    help: {
        execute: async (message) => {
            try {
                const options = [
                    {
                        label: 'Admin Commands',
                        description: 'Commands for managing server settings',
                        value: 'admin_commands',
                    },
                    {
                        label: 'Community Commands',
                        description: 'Commands for community interactions',
                        value: 'community_commands',
                    },
                    {
                        label: 'Configuration Commands',
                        description: 'Commands for configuring the bot',
                        value: 'configuration_commands',
                    },
                    {
                        label: 'Help With Commands',
                        description: 'Help with commands for the bot',
                        value: 'command_help',
                    }
                ];
        
                if (message.author.id === process.env.OWNER) {
                    options.push({
                        label: 'Owner Commands',
                        description: 'Commands only available to the bot owner',
                        value: 'owner_commands',
                    });
                }

                const row = new ActionRowBuilder()
                    .addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('help_menu')
                            .setPlaceholder('Select a category')
                            .addOptions(options),
                    );

                const optionEmbed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle("Help")
                    .setDescription("Choose an option below to see commands")
        
                await message.channel.send({ embeds: [optionEmbed], components: [row] });
            } catch (error) {
                console.error('An error occurred while creating the help embed:', error);
                message.channel.send('An error occurred while generating the help message. Please contact the admin. **Error code: 0hb**');
            }
        },
    },

// //

    // * Check if it works via the bot 
    vote: {
        execute: async (message, client) => {
            try {
                const userId = message.author.id;
                const serverId = message.guild.id;
    
                // Fetch server configuration from the database
                const serverConfigsData = await getServerConfigsData(serverId);
                if (!serverConfigsData) {
                    return message.channel.send("Server configuration not found.");
                }
    
                // Ensure user data is initialized in the database
                await ensureUserData(serverId, userId);
    
                const allowedChannelId = serverConfigsData.allowedChannel;
                let allowedChannel = message.channel;
                if (allowedChannelId && allowedChannelId !== message.channel.id) {
                    allowedChannel = message.guild.channels.cache.get(allowedChannelId) || await message.guild.channels.fetch(allowedChannelId).catch(() => null);
                    if (!allowedChannel) {
                        return message.channel.send("The allowed channel could not be found or fetched.");
                    }
                }
    
                // Call shared vote logic
                await executeVote(userId, message.guild, allowedChannel, client, serverId, process.env.BOT_ID);
            } catch (error) {
                console.error("Error in vote command (prefix):", error);
                message.channel.send("There was an error processing your vote.");
            }
        }
    },

    // ? Slash
    slashVote: {
        execute: async (interaction, client) => {
            try {
                const userId = interaction.user.id;
                const serverId = interaction.guild.id;
    
                // Fetch server configuration from the database
                const serverConfigsData = await getServerConfigsData(serverId);
                if (!serverConfigsData) {
                    return interaction.reply("Server configuration not found.");
                }
    
                // Ensure user data is initialized in the database
                await ensureUserData(serverId, userId);
    
                const allowedChannelId = serverConfigsData.allowedChannel;
                let allowedChannel = interaction.channel;
                if (allowedChannelId && allowedChannelId !== interaction.channel.id) {
                    allowedChannel = interaction.guild.channels.cache.get(allowedChannelId) || await interaction.guild.channels.fetch(allowedChannelId).catch(() => null);
                    if (!allowedChannel) {
                        return interaction.reply("The allowed channel could not be found or fetched.");
                    }
                }
    
                // Call shared vote logic
                await executeVote(userId, interaction.guild, allowedChannel, client, serverId, process.env.BOT_ID);
    
                // Acknowledge the interaction
                await interaction.reply({ content: "Vote processed!", ephemeral: true });
            } catch (error) {
                console.error("Error in slashVote command (slash):", error);
                interaction.reply("There was an error processing your vote.");
            }
        }
    }    

// //
};
