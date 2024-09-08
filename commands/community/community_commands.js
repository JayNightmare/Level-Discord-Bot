const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { ensureUserData, ensureServerData, saveData } = require('../utils');
const fs = require('fs');
const DBL = require('dblapi.js');
const axios = require('axios');
require('dotenv').config();

const serverConfigsData = JSON.parse(fs.readFileSync('./json/serverConfigs.json', 'utf8'));
const hardcodedBotId = '1278098225353719869';

function getRank(userId, serverId, data) {
    const serverData = data[serverId];
    if (!serverData || !serverData.users) {
        return null;
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

module.exports = {
    // * FIXED
    rank: {
        execute: async (message, client, args, saveData) => {
            try {
                const serverConfigsData = JSON.parse(fs.readFileSync('./json/serverConfigs.json', 'utf8'));
                const data = JSON.parse(fs.readFileSync('./json/users.json', 'utf8'));

                const serverId = message.guild.id;
                const userId = message.author.id;
    
                // Ensure the user data is initialized before accessing it
                ensureUserData(serverId, userId, data, saveData);
    
                const user = data[serverId].users[userId];
    
                if (!user) {
                    return message.channel.send("You haven't earned any XP yet!");
                }
    
                const level = user.level;
                const xp = user.xp;
                const x = 100;  // Base multiplier
                const y = 1.1;  // Scaling factor

                const xpNeededForCurrentLevel = Math.floor(level * x * Math.pow(y, level));
                const xpNeededForNextLevel = Math.floor((level + 1) * x * Math.pow(y, level + 1));

                // XP required for the next level
                const xpForNextLevel = xpNeededForNextLevel - xpNeededForCurrentLevel;
    
                // Check if an allowed channel is set in the server configuration
                const allowedChannelId = serverConfigsData[serverId].allowedChannel;
    
                if (allowedChannelId === message.channel.id) {
                    let allowedChannel = message.client.channels.cache.get(allowedChannelId);
    
                    // If the channel is not cached, fetch it from the API
                    if (!allowedChannel) {
                        try {
                            allowedChannel = await message.client.channels.fetch(allowedChannelId);
                        } catch (error) {
                            return message.channel.send("The allowed channel could not be found or fetched.");
                        }
                    }
    
                    const embed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle(`${message.author.displayName}'s Rank`)
                        .setDescription(`Level: ${level}`)
                        .addFields(
                            { name: 'XP', value: `${xp}/${xpForNextLevel} XP`, inline: true },
                            { name: 'Rank', value: `#${getRank(userId, serverId, data)}`, inline: true }
                        )
                        .setThumbnail(message.author.displayAvatarURL())
                        .setFooter({ text: `Keep chatting to level up!`, iconURL: message.client.user.displayAvatarURL() });
    
                    // Send the embed to the allowed channel
                    await allowedChannel.send({ embeds: [embed] });
                }
    
            } catch (error) {
                console.error('Error in rank command:', error);
                message.channel.send("There was an error retrieving your rank.");
            }
        },
    },

    // * FIXED
    checkroles: {
        execute: async (message) => {
            try {

                const serverId = message.guild.id;

                const allowedChannelId = serverConfigsData[serverId].allowedChannel;

                if (allowedChannelId === message.channel.id) {
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
                        .setFooter({ text: "Role Checker", iconURL: message.client.user.displayAvatarURL() });

                    await message.channel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error in checkroles command:', error);
                message.channel.send("There was an error retrieving your roles.");
            }
        },
    },

    // * FIXED
    profile: {
        execute: async (message, args, data, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            try {
                const serverId = message.guild.id;
                const userId = message.mentions.users.first()?.id || message.author.id;

                const allowedChannelId = serverConfigsData[serverId].allowedChannel;

                if (allowedChannelId === message.channel.id) {    
                    // Ensure the user data is initialized before accessing it
                    ensureUserData(serverId, userId, data, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData);
        
                    const user = data[serverId].users[userId];
                    const member = message.guild.members.cache.get(userId);
        
                    // Check if achievements exist, if not, default to an empty array
                    const userAchievements = achievementsData[serverId]?.users[userId]?.achievements || [];
        
                    // Join achievements into a string or show "No achievements yet" if none exist
                    const achievements = userAchievements.length > 0
                        ? userAchievements.join(', ') 
                        : "No achievements yet";
        
                    const bio = user.bio || "This user hasn't set a bio yet";
        
                    const userBadges = badgesData[serverId][userId] || [];
        
                    const roles = member.roles.cache
                        .filter(role => role.name !== '@everyone')
                        .map(role => `<@&${role.id}>`)
                        .join(", ") || "No roles";
        
                    const badgeDisplay = userBadges.map(badgeName => {
                        // Find the badge in the server badges
                        const badgeEntry = Object.values(badgesData[serverId].badges).find(b => b.name === badgeName);
                        
                        // If the badge is found, display its emoji and name, otherwise show "Unknown Badge"
                        return badgeEntry ? `${badgeEntry.emoji} ${badgeEntry.name}` : "Unknown Badge";
                    }).join(', ') || "No badges";
        
                    const embed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle(`${member.displayName}'s Profile`)
                        .setDescription(bio)
                        .addFields(
                            { name: 'Level', value: `${user.level}`, inline: true },
                            { name: 'XP', value: `${user.xp}`, inline: true },
                            { name: 'Roles', value: roles, inline: true },
                            { name: 'Achievements', value: achievements, inline: true },
                            { name: 'Badges', value: badgeDisplay, inline: true }
                        )
                        .setThumbnail(member.user.displayAvatarURL())
                        .setFooter({ text: `*Tip: Use the !setbio command to update bio*` });
        
                    await message.channel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error in profile command: ', error);
                message.channel.send("There was an error generating this user's profile.");
            }
        },
    },
    
    // * FIXED
    setbio: {
        execute: async (message, args, data, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            const serverId = message.guild.id;
            const userId = message.author.id;

            const allowedChannelId = serverConfigsData[serverId].allowedChannel;

            if (allowedChannelId === message.channel.id) {
                // Step 1: Ask for the user's bio
                const embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle("Set Bio")
                    .setDescription("Please provide the bio you want to set. Type your bio below:")
                    .setFooter({ text: "Set your bio", iconURL: message.author.displayAvatarURL() });

                await message.channel.send({ embeds: [embed] });

                const filter = response => response.author.id === message.author.id;
                const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);

                if (!collected || collected.size === 0) {
                    return message.channel.send("You did not provide a bio. Please try again.");
                }

                const bio = collected.first().content.trim();
                if (!bio) return message.channel.send("Please provide a valid bio.");

                // Ensure the user data is initialized before accessing it
                ensureUserData(serverId, userId, data, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData);

                // Step 2: Save the bio
                data[serverId].users[userId].bio = bio;
                await fs.writeFileSync('./json/users.json', JSON.stringify(data, null, 4));

                // Step 3: Confirmation message
                const confirmEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle("Bio Updated")
                    .setDescription(`Your bio has been successfully updated!`)
                    .addFields({ name: "Your new bio", value: bio })
                    .setFooter({ text: `Updated by ${message.author.username}`, iconURL: message.client.user.displayAvatarURL() });

                return message.channel.send({ embeds: [confirmEmbed] });
            }
        },
    },

    // * FIXED
    leaderboard: {
        execute: async (message, args, data, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            try {
                const serverId = message.guild.id;
                const serverData = data[serverId];

                const allowedChannelId = serverConfigsData[serverId].allowedChannel;

                if (allowedChannelId === message.channel.id) {
                    if (!serverData || !serverData.users) {
                        return message.channel.send("No data found for this server.");
                    }

                    const leaderboard = Object.entries(serverData.users)
                        .map(([id, userData]) => {
                            const member = message.guild.members.cache.get(id);
                            return {
                                displayName: member ? member.displayName : "Unknown User",
                                level: userData.level,
                                xp: userData.xp
                            };
                        })
                        .filter(user => user.displayName !== "Unknown User")
                        .sort((a, b) => {
                            if (b.level === a.level) {
                                return b.xp - a.xp;
                            }
                            return b.level - a.level;
                        })
                        .slice(0, 10);

                    if (leaderboard.length === 0) {
                        return message.channel.send("No one has earned any XP yet!");
                    }

                    const usersField = leaderboard.map((user, index) => `${index + 1}. ${user.displayName}`).join(`\n`);
                    const levelsField = leaderboard.map(user => `${user.level}`).join(`\n`);

                    const leaderboardEmbed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle("Server Leaderboard")
                        .addFields(
                            { name: "Top 10", value: usersField, inline: true },
                            { name: "Level", value: levelsField, inline: true }
                        )
                        .setTimestamp();

                    await message.channel.send({ embeds: [leaderboardEmbed] });
                }
            } catch (error) {
                console.error('Error in leaderboard command:', error);
                message.channel.send("There was an error retrieving the leaderboard.");
            }
        },
    },

    // * FIXED
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

    // * Check if it works via the bot 
    vote: {
        execute: async (message, args, client, data, saveData) => {
            const userId = message.author.id;
            const serverId = message.guild.id;
    
            const allowedChannelId = serverConfigsData[serverId].allowedChannel;
    
            if (allowedChannelId === message.channel.id) {
                try {
                    const response = await axios.get(`https://top.gg/api/bots/hardcodedBotId/check?userId=${userId}`, {
                        headers: {
                            Authorization: process.env.TOPGG_API_KEY
                        }
                    });
                
                    const voted = response.data.voted;  // Boolean: true if voted in last 12 hours, false if not
                
                    const voteEmbed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle("Vote for Level Bot to Earn Rewards")
                        .setDescription("Vote for the bot to help it grow and earn extra XP as a reward!")
                        .addFields(
                            {
                                name: 'Vote on top.gg to earn 100 XP',
                                value: voted
                                    ? '🔴 You have already voted. You can vote again in 12 hours.'
                                    : '🟢 You can vote now. [Vote here!](https://top.gg/bot/hardcodedBotId/vote)',
                                inline: false
                            }
                        )
                        .setFooter({
                            text: "Thank you for your support!",
                            iconURL: message.client.user.displayAvatarURL()
                        });
                
                    await message.channel.send({ embeds: [voteEmbed] });
                
                    if (voted) {
                        return message.channel.send("It looks like you have already voted. You can vote again in 12 hours.");
                    } else {
                        // Reward XP
                        const xpReward = 100;
                        ensureUserData(serverId, userId, data, saveData);
                        data[serverId].users[userId].xp += xpReward;
                        saveData();
                
                        return message.channel.send(`Thank you for voting! You have earned ${xpReward} XP.`);
                    }
                } catch (error) {
                    console.error("Error checking top.gg vote status:", error);
                    return message.channel.send("There was an error checking your vote status. Please try again later.");
                }
            }
        },
    }
};