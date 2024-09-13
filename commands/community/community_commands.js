const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { ensureUserData, ensureServerData } = require('../utils');
const fs = require('fs');
const DBL = require('dblapi.js');
const axios = require('axios');
require('dotenv').config();

const usersFilePath = 'json/users.json';
const achievementsFilePath = 'json/achievements.json';
const badgesFilePath = 'json/badges.json';
const serverConfigsFilePath = 'json/serverConfigs.json';
const ownerFilePath = 'json/owner.json';

const serverConfigsData = JSON.parse(fs.readFileSync(serverConfigsFilePath, 'utf8'));

const hardcodedBotId = process.env.HARDCODED;

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

async function executeProfile(user, guild, channel, data, achievementsData, badgesData, saveData) {
    const serverId = guild.id;
    const userId = user.id;

    // Ensure the user data is initialized before accessing it
    if (!data[serverId]) {
        data[serverId] = { users: {} };
    }

    if (!data[serverId].users[userId]) {
        // Initialize user data if the user doesn't exist in users.json
        data[serverId].users[userId] = {
            xp: 0,
            level: 1,
            bio: "",
            roles: [],
            totalXp: 0,
        };
        fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 4));
    }

    const userData = data[serverId].users[userId];
    const member = guild.members.cache.get(userId) || await guild.members.fetch(userId);

    // Check if achievements exist, if not, default to an empty array
    const userAchievements = achievementsData[serverId]?.users[userId]?.achievements || [];

    // Join achievements into a string or show "No achievements yet" if none exist
    const achievements = userAchievements.length > 0
        ? userAchievements.join(', ') 
        : "No achievements yet";

    const bio = userData.bio || "This user hasn't set a bio yet";

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
            { name: 'Level', value: `${userData.level}`, inline: true },
            { name: 'XP', value: `${userData.xp}`, inline: true },
            { name: 'Roles', value: roles, inline: true },
            { name: 'Achievements', value: achievements, inline: true },
            { name: 'Badges', value: badgeDisplay, inline: true }
        )
        .setThumbnail(user.displayAvatarURL())
        .setFooter({ text: `*Tip: Use the /setbio or !setbio command to update your bio*` });

    await channel.send({ embeds: [embed] });
}

// Shared function for setting bio logic
async function executeSetBio(user, bio, guild, channel, data, saveData) {
    const serverId = guild.id;
    const userId = user.id;

    // Ensure the user data is initialized before accessing it
    if (!data[serverId]) {
        data[serverId] = { users: {} };
    }

    if (!data[serverId].users[userId]) {
        data[serverId].users[userId] = { xp: 0, level: 1, bio: "", roles: [], totalXp: 0 };
    }

    // Save the new bio
    data[serverId].users[userId].bio = bio;
    saveData();

    // Confirmation message
    const confirmEmbed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle("Bio Updated")
        .setDescription(`Your bio has been successfully updated!`)
        .addFields({ name: "Your new bio", value: bio })
        .setFooter({ text: `Updated by ${user.username}`, iconURL: user.displayAvatarURL() });

    await channel.send({ embeds: [confirmEmbed] });
}

async function executeLeaderboard(guild, channel, data) {
    const serverId = guild.id;
    const serverData = data[serverId];

    if (!serverData || !serverData.users) {
        return channel.send("No data found for this server.");
    }

    // Fetch members and prepare leaderboard data
    const leaderboard = await Promise.all(Object.entries(serverData.users).map(async ([id, userData]) => {
        let member = guild.members.cache.get(id);
        if (!member) {
            try {
                member = await guild.members.fetch(id); // Fetch member if not cached
            } catch (error) {
                console.error(`Failed to fetch member with ID: ${id}`);
                return null; // Skip users who can't be fetched
            }
        }

        return {
            displayName: member ? member.displayName : "Unknown User",
            level: userData.level,
            xp: userData.xp
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

    if (sortedLeaderboard.length === 0) {
        return channel.send("No one has earned any XP yet!");
    }

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
    
                if (!allowedChannelId || allowedChannelId === message.channel.id) {
                    let allowedChannel = message.channel;

                    if (allowedChannelId) {
                        allowedChannel = message.client.channels.cache.get(allowedChannelId) || await message.client.channels.fetch(allowedChannelId).catch(() => null);
                        
                        if (!allowedChannel) {
                            return message.channel.send("The allowed channel could not be found or fetched.");
                        }
                    }
    
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

// //

    // * FIXED
    checkroles: {
        execute: async (message) => {
            try {

                const serverId = message.guild.id;

                const allowedChannelId = serverConfigsData[serverId].allowedChannel;

                if (!allowedChannelId || allowedChannelId === message.channel.id) {
                    let allowedChannel = message.channel;

                    if (allowedChannelId) {
                        allowedChannel = message.client.channels.cache.get(allowedChannelId) || await message.client.channels.fetch(allowedChannelId).catch(() => null);
                        
                        if (!allowedChannel) {
                            return message.channel.send("The allowed channel could not be found or fetched.");
                        }
                    }
                    const member = message.guild.members.cache.get(message.author.id);
                    const roles = member.roles.cache
                        .filter(role => role.name !== '@everyone')
                        .map(role => role.id)
                        .join(", ");

                    const embed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle(`${message.author.username}'s Roles`)
                        .setDescription(`<@&${roles}>` || "You don't have any special roles.")
                        .setThumbnail(message.author.displayAvatarURL())
                        .setFooter({ text: "Role Checker", iconURL: message.client.user.displayAvatarURL() });

                    await message.channel.send({ embeds: [embed] });
                }
            } catch (error) {
                console.error('Error in checkroles command:', error);
                allowedChannel.send("There was an error retrieving your roles.");
            }
        },
    },

// //

    // * FIXED
    profile: {
        execute: async (message, args, data, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            try {
                // Use mentioned user or message author for prefix commands
                const user = message.mentions.users.first() || message.author;

                const allowedChannelId = serverConfigsData[message.guild.id].allowedChannel;
                const allowedChannel = allowedChannelId ? message.guild.channels.cache.get(allowedChannelId) || message.channel : message.channel;

                await executeProfile(user, message.guild, allowedChannel, data, achievementsData, badgesData, saveData);
            } catch (error) {
                console.error('Error in profile command (prefix): ', error);
                message.channel.send("There was an error generating this user's profile.");
            }
        },
    },

    // ? Slash
    slashProfile: {
        execute: async (interaction, data, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData) => {
            try {
                // Use the user option or fallback to interaction user for slash commands
                const user = interaction.options.getUser('user') || interaction.user;

                const allowedChannelId = serverConfigsData[interaction.guild.id].allowedChannel;
                const allowedChannel = allowedChannelId ? interaction.guild.channels.cache.get(allowedChannelId) || interaction.channel : interaction.channel;

                await executeProfile(user, interaction.guild, allowedChannel, data, achievementsData, badgesData, saveData);

                // Reply to the interaction
                await interaction.reply({ content: "Profile sent!", ephemeral: true });
            } catch (error) {
                console.error('Error in profile command (slash): ', error);
                interaction.reply("There was an error generating this user's profile.");
            }
        }
    },

// //
    
    // * FIXED
    setbio: {
        execute: async (message, args, data, achievementsData, badgesData, saveData) => {
            try {
                const serverId = message.guild.id;
                const userId = message.author.id;

                const allowedChannelId = serverConfigsData[serverId].allowedChannel;

                if (!allowedChannelId || allowedChannelId === message.channel.id) {
                    let allowedChannel = message.channel;

                    if (allowedChannelId) {
                        allowedChannel = message.client.channels.cache.get(allowedChannelId) || await message.client.channels.fetch(allowedChannelId).catch(() => null);
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
        execute: async (interaction, data, achievementsData, badgesData, saveData) => {
            try {
                const bio = interaction.options.getString('bio');
                const user = interaction.user;
                const allowedChannelId = serverConfigsData[interaction.guild.id].allowedChannel;
                let allowedChannel = interaction.channel;

                if (allowedChannelId) {
                    allowedChannel = interaction.guild.channels.cache.get(allowedChannelId) || interaction.channel;
                }

                // Step 2: Save the bio using the shared logic
                await executeSetBio(user, bio, interaction.guild, allowedChannel, data, saveData);
                fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 4));

                // Acknowledge the interaction
                await interaction.reply({ content: `Bio updated to: "${bio}"`, ephemeral: true });
            } catch (error) {
                console.error('Error in setbio command (slash): ', error);
                interaction.reply("There was an error updating your bio.");
            }
        }
    },

// //

    // * FIXED
    leaderboard: {
        execute: async (message, args, data, serverConfigsData, saveData) => {
            try {
                const serverId = message.guild.id;
                const allowedChannelId = serverConfigsData[serverId].allowedChannel;

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
                console.error('Error in leaderboard command (prefix): ', error);
                message.channel.send("There was an error retrieving the leaderboard.");
            }
        }
    },

    // ? Slash
    slashLeaderboard: {
        execute: async (interaction, data, serverConfigsData, saveData) => {
            try {
                const serverId = interaction.guild.id;
                const allowedChannelId = serverConfigsData[serverId].allowedChannel;

                let allowedChannel = interaction.channel;
                if (allowedChannelId && allowedChannelId !== interaction.channel.id) {
                    allowedChannel = interaction.guild.channels.cache.get(allowedChannelId) || await interaction.guild.channels.fetch(allowedChannelId).catch(() => null);
                    if (!allowedChannel) {
                        return interaction.reply("The allowed channel could not be found or fetched.");
                    }
                }

                // Use shared logic to generate leaderboard
                await executeLeaderboard(interaction.guild, allowedChannel, data);

                // Acknowledge the interaction
                await interaction.reply({ content: "Leaderboard retrieved!", ephemeral: true });
            } catch (error) {
                console.error('Error in leaderboard command (slash): ', error);
                interaction.reply("There was an error retrieving the leaderboard.");
            }
        }
    },

// //

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

// //

    // * Check if it works via the bot 
    vote: {
        execute: async (message, args, client) => {
            const userId = message.author.id;
            const serverId = message.guild.id;
            const data = JSON.parse(fs.readFileSync('./json/users.json', 'utf8'));
            const saveData = fs.writeFileSync('./json/users.json', JSON.stringify(data, null, 4));
    
            const allowedChannelId = serverConfigsData[serverId].allowedChannel;
    
            if (!allowedChannelId || allowedChannelId === message.channel.id) {
                let allowedChannel = message.channel;

                if (allowedChannelId) {
                    allowedChannel = message.client.channels.cache.get(allowedChannelId) || await message.client.channels.fetch(allowedChannelId).catch(() => null);
                    
                    if (!allowedChannel) {
                        return message.channel.send("The allowed channel could not be found or fetched.");
                    }
                }
                try {
                    const response = await axios.get(`https://top.gg/api/bots/${hardcodedBotId}/check?userId=${userId}`, {
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
                                    : `🟢 You can vote now. [Vote here!](https://top.gg/bot/${hardcodedBotId}/vote)`,
                                inline: false
                            }
                        )
                        .setFooter({
                            text: "Thank you for your support!",
                            iconURL: message.client.user.displayAvatarURL()
                        });
                
                    await allowedChannel.send({ embeds: [voteEmbed] });
                
                    if (voted) {
                        return message.channel.send("It looks like you have already voted. You can vote again in 12 hours.");
                    } else {
                        // Reward XP
                        const xpReward = 100;
                        ensureUserData(serverId, userId, data, saveData);
                        data[serverId].users[userId].xp += xpReward;
                        saveData;
                
                        return allowedChannel.send(`Thank you for voting! You have earned ${xpReward} XP.`);
                    }
                } catch (error) {

                    // cool down of 12 hours
                    const coolDown = 12 * 60 * 60 * 1000;
                    const now = Date.now();
                    const lastVote = data[serverId].users[userId].lastVote || 0;


                    if (now - lastVote > coolDown) {
                        const xpReward = 100;
                            ensureUserData(serverId, userId, data, saveData);
                            data[serverId].users[userId].xp += xpReward;
                            data[serverId].users[userId].lastVote = now;
                            saveData;
    
                        const voteEmbed = new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle("Vote for Level Bot to Earn Rewards")
                            .setDescription("Vote for the bot to help it grow! XP Bonus coming soon")
                            .addFields(
                                {
                                    name: 'Vote on top.gg to earn 100 XP',
                                    value: `🟢 You can vote now. [Vote here!](https://top.gg/bot/${hardcodedBotId}/vote)`,
                                    inline: false
                                }
                            )
                            .setFooter({
                                text: "Thank you for your support!",
                                iconURL: message.client.user.displayAvatarURL()
                            });
                    
                        await allowedChannel.send({ embeds: [voteEmbed] });
                    }
                    else {
                        message.channel.send("It looks like you have already voted. You can vote again in 12 hours.");
                        const voteEmbed = new EmbedBuilder()
                            .setColor(0x3498db)
                            .setTitle("Vote for Level Bot to Earn Rewards")
                            .setDescription("It looks like you have already voted. You can vote again in 12 hours")
                            .addFields(
                                {
                                    name: 'Vote on top.gg to earn 100 XP',
                                    value: `🔴 You have already voted. You can vote again in 12 hours`,
                                    inline: false
                                }
                            )
                            .setFooter({
                                text: "Thank you for your support!",
                                iconURL: message.client.user.displayAvatarURL()
                            });
                    
                        await allowedChannel.send({ embeds: [voteEmbed] });
                    }

                }
            }
        },
    }

// //
};
