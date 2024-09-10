const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType } = require('discord.js');
const { EmbedBuilder, SelectMenuBuilder, ActionRowBuilder } = require('@discordjs/builders');
const path = require('path');
const fs = require('fs');
const { log } = require('console');
require('dotenv').config(); 
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// ? Load Data
<<<<<<< HEAD
const usersFilePath = path.join(__dirname, '../json', 'users.json');
const achievementsFilePath = path.join(__dirname, '../json', 'achievements.json');
const badgesFilePath = path.join(__dirname, '../json', 'badges.json');
const serverConfigsFilePath = path.join(__dirname, '../json', 'serverConfigs.json');
const ownerFilePath = path.join(__dirname, '../json', 'owner.json');
=======
const usersFilePath = './json/users.json';
const achievementsFilePath = './json/achievements.json';
const badgesFilePath = './json/badges.json';
const serverConfigsFilePath = './json/serverConfigs.json';
const ownerFilePath = './json/owner.json';
>>>>>>> 3277b77497bc5ec47166105f71f1a634ac638a00

// ? Load data from the file
let data = {};
let achievementsData;
let badgesData = {};
let serverConfigsData = {};
let ownerData = {};

// ? Load all files
if (fs.existsSync(usersFilePath)) {
    data = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
} else {
    data = {}; // * Initialize an empty data object if file doesn't exist
    saveData(); // * Save the initial structure to the file
}

if (fs.existsSync(achievementsFilePath)) {
    achievementsData = JSON.parse(fs.readFileSync(achievementsFilePath, 'utf8'));
} else {
    achievementsData = {};
    saveAchievementsData();
}

if (fs.existsSync(badgesFilePath)) {
    badgesData = JSON.parse(fs.readFileSync(badgesFilePath, 'utf8'));
} else {
    badgesData = {};
    saveBadgesData();
}

if (fs.existsSync(serverConfigsFilePath)) {
    serverConfigsData = JSON.parse(fs.readFileSync(serverConfigsFilePath, 'utf8'));
} else {
    serverConfigsData = {};
    saveServerConfigsData();
}

if (fs.existsSync(ownerFilePath)) {
    ownerData = JSON.parse(fs.readFileSync(ownerFilePath, 'utf8')); // Fixed path issue
} else {
    ownerData = {}; // Initializing empty object
    saveOwnerData(ownerData); // Save the initialized empty data
}

function debugError(guild) {
// Store owner and member information in owner.json
    ownerData[guild.ownerId] = {
        parameter1: guild.ownerId,
        parameter2: guild.memberCount
    };
}

function ensureUserData(serverId, userId) {
    // ? Debugging - Check content inside json file
    // console.log(`Ensuring user data for serverId: ${serverId}, userId: ${userId}`);
    // console.log('User Data:', JSON.stringify(data, null, 2));
    // console.log('Achievement Data:', JSON.stringify(achievementsData, null, 2));
    // console.log('Badge Data:', JSON.stringify(badgesData, null, 2));
    // console.log('Server Data:', JSON.stringify(serverConfigsData, null, 2));

    // * Ensure the server data exists
    if (!data[serverId]) {
        data[serverId] = {
            users: {},
            roles: {},
            milestoneLevels: [],
        };
        saveData();
    }

    // * Ensure the user data exists
    if (!data[serverId].users[userId]) {
        data[serverId].users[userId] = {
            xp: 0,
            level: 1,
            bio: "",
            roles: [],
        };
        saveData();
    }

    // * Ensure the server achievements data exists
    if (!achievementsData[serverId]) {
        achievementsData[serverId] = {
            customAchievements: {
                levels: {},
                times: {},
                events: {}
            },
            templates: {
                messageAchievements: {
                    enabled: false,
                    achievements: {}
                },
                levelAchievements: {
                    enabled: false,
                    achievements: {}
                },
                timeAchievements: {
                    enabled: false,
                    achievements: {}
                },
                eventAchievements: {
                    enabled: false,
                    achievements: {}
                }
            },
            users: {}  // ? Initialize users object for tracking message achievements
        };
        try {
<<<<<<< HEAD
            fs.writeFileSync(achievementsFilePath, JSON.stringify(achievementsData, null, 4));
=======
            fs.writeFileSync(achievementFilePath, JSON.stringify(achievementsData, null, 4));
>>>>>>> 3277b77497bc5ec47166105f71f1a634ac638a00
            // console.log("Achievements data saved.");
        } catch (err) {
            console.error("Error saving achievements data:", err);
        }
    }

    // * Ensure the server badges data exists
    if (!badgesData[serverId]) {
        badgesData[serverId] = {
            badges: {}
        };
        saveBadgesData();
    }

    // * Ensure the user badges data exists
    if (!badgesData[serverId][userId]) {
        badgesData[serverId][userId] = [];
        saveBadgesData();
    }
}

function ensureServerData(serverId, guild) {
    if (!serverConfigsData[serverId]) {
        serverConfigsData[serverId] = {
            name: guild.name,
            blacklistedChannels: [],
            allowedChannel: null,
            loggingChannelId: null,
            prefix: "!",
            requireConfirm: false
        };

        saveServerConfigsData(serverConfigsData);  // * Ensure to save right after initialization
    }
}

// * Helper function to save data
function saveData() {
    // console.log("Saving users data:", JSON.stringify(data, null, 4));  // Debug log before saving
    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 4));
}

function saveServerConfigsData(serverConfigsData) {
    // console.log("Saving server configs data:", JSON.stringify(serverConfigsData, null, 4));  // Debug log before saving
    fs.writeFileSync(serverConfigsFilePath, JSON.stringify(serverConfigsData, null, 4));
}

function saveAchievementsData() {
    try {
        fs.writeFileSync(achievementsFilePath, JSON.stringify(achievementsData, null, 4));
        // console.log("Achievements data saved.");
    } catch (err) {
        console.error("Error saving achievements data:", err);
    }
}

function saveBadgesData() {
    try {
        fs.writeFileSync(badgesFilePath, JSON.stringify(badgesData, null, 4));
    } catch (err) {
        console.error("Failed to save badges data:", err);
    }
}

<<<<<<< HEAD
=======
function saveOwnerData(data) {
    fs.writeFileSync(ownerFilePath, JSON.stringify(data, null, 4));
    // console.log('Owner data successfully saved.');
}

// function saveServerConfigsData(serverConfigsData) {
//     try {
//         console.log("Saving data to serverConfigs.json:", JSON.stringify(serverConfigsData, null, 4));
//         fs.writeFileSync("json/serverConfigs.json", JSON.stringify(serverConfigsData, null, 4));
//         console.log("Data saved successfully.");
//     } catch (error) {
//         console.error("Error while saving serverConfigsData:", error);
//     }
// }

>>>>>>> 3277b77497bc5ec47166105f71f1a634ac638a00
// * Function to add an achievement to a user's profile
function addAchievement(serverId, userId, achievementName, badgeName = null, achievementType = 'custom', category = 'levels', levelOrTimeOrEvent = '') {
    ensureUserData(serverId, userId);

    // Initialize the user achievements if not already present
    if (!achievementsData[serverId][userId]) {
        achievementsData[serverId][userId] = {
            customAchievements: {
                levels: {},
                times: {},
                events: {}
            },
            templates: {
                levelAchievements: {
                    enabled: false,
                    achievements: {}
                },
                timeAchievements: {
                    enabled: false,
                    achievements: {}
                },
                eventAchievements: {
                    enabled: false,
                    achievements: {}
                }
            }
        };
    }

    // Handle custom achievements
    if (achievementType === 'custom') {
        if (!achievementsData[serverId][userId].customAchievements[category][levelOrTimeOrEvent]) {
            achievementsData[serverId][userId].customAchievements[category][levelOrTimeOrEvent] = achievementName;
        } else {
            return false; // Achievement already exists
        }
    } 

    // Handle template achievements
    else if (achievementType === 'template') {
        if (achievementsData[serverId][userId].templates[`${category}Achievements`].enabled) {
            if (!achievementsData[serverId][userId].templates[`${category}Achievements`].achievements[levelOrTimeOrEvent]) {
                achievementsData[serverId][userId].templates[`${category}Achievements`].achievements[levelOrTimeOrEvent] = achievementName;
            } else {
                return false; // Achievement already exists
            }
        } else {
            return false; // Template not enabled
        }
    } 

    else {
        return false; // Invalid achievement type
    }

    // Log the updated achievements data
    console.log('Achievements Data Before Saving:', JSON.stringify(achievementsData, null, 4));

    // Optionally add a badge if specified
    if (badgeName) {
        addBadge(serverId, userId, badgeName);
    }

    // Save the updated achievements data
    try {
        fs.writeFileSync(achievementsFilePath, JSON.stringify(achievementsData, null, 4));
        console.log("Achievements data successfully initialized and saved.");
    } catch (err) {
        console.error("Error initializing achievements data:", err);
        return message.channel.send("Failed to initialize achievements data.");
    }
    return true;
}

function addBadge(serverId, userId, badgeName, badgeDetails = null) {
    ensureUserData(serverId, userId);

    if (!badgesData[serverId].badges) {
        badgesData[serverId].badges = {};
    }

    if (!badgesData[serverId][userId]) {
        badgesData[serverId][userId] = [];
    }

    if (badgeDetails) {
        badgesData[serverId].badges[badgeName] = badgeDetails;
        saveBadgesData();
    }

    if (!badgesData[serverId][userId].includes(badgeName)) {
        badgesData[serverId][userId].push(badgeName);
        saveBadgesData();
        return true;
    }
    return false;
}

function sendLogMessage(serverId, messageText) {
    const logChannelId = serverConfigsData[serverId]?.loggingChannelId;
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
async function sendStatusMessage(serverId, status) {
    const logChannelId = serverConfigsData[serverId]?.loggingChannelId;
    const logChannel = client.channels.cache.get(logChannelId);
    if (!logChannel) {
        // console.error(`Logging channel not found in the client's cache for server: ${serverId}.`);
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

// * Will notify the servers with the new update
async function notifyUpdate(client) {
    try {
        for (const serverId in data) {
            if (!serverConfigsData[serverId]) continue;

            const prefixFinder = serverConfigsData[serverId].prefix || "!";
            if (data.hasOwnProperty(serverId)) {
                const logChannelId = serverConfigsData[serverId]?.loggingChannelId;
                const messageToServers = `
                ***THE BOT WILL BE UPDATING SHORTLY***

                All xp will be reset to the 6th of Auguest as that's when I pulled the data. Good chance to use the new commands than 👀 

                **New Update:**
                - **This message!** - You will be notified when the bot updates in your log channel (if none is set, it will send to the next publicly available channel).\n
                - **Server Leaderboard** - Run the \`${prefixFinder}leaderboard\` command to see the top chatters in your server!\n
                - **Add and Remove XP** - Run the \`${prefixFinder}addxp\` or \`${prefixFinder}rmxp\` to add and remove XP from a user!\n
                - **Set Prefix** - You can now set your own prefix for this bot by running the \`${prefixFinder}setprefix\` command.\n
                - **Updated Help** - Use the new \`${prefixFinder}help\` command to see the updated list of commands.\n
                - **Achievements and Badges** - Users earn badges or achievements for reaching milestones. Run \`${prefixFinder}addachievement\` or \`${prefixFinder}addbadge\` to manually award achievements or badges.\n
                - **Profile Command** - Users can view their profile using the \`${prefixFinder}profile\` command to see their level, XP, badges, achievements, and roles.\n
                - **Bio Command** - Users can set a bio for their profile using the \`${prefixFinder}setbio\` command.\n
                - **Blacklist/Unblacklist Channels** - Manage channels where the bot should ignore commands with \`${prefixFinder}blacklist\` and \`${prefixFinder}unblacklist\`.\n
                - **Logging Channel** - Set a channel to receive bot-related logs with \`${prefixFinder}setlogchannel\` and \`${prefixFinder}unsetlogchannel\`.\n
                - **Rank Channel** - Restrict rank and role-related commands to a specific channel using \`${prefixFinder}setrankchannel\` and \`${prefixFinder}unsetrankchannel\`.\n
                - **Milestone Levels and Roles** - Define levels as milestones and assign roles for them using \`${prefixFinder}setlevels\` and \`${prefixFinder}setroles\`.\n

                **Future Updates:**
                - **XP Boosts** - Allows admins to give XP boosts to specific users for a limited time, multiplying XP gained.\n
                - **Role-Based XP Multipliers** - Certain roles give users an XP multiplier (e.g., VIP members earn 1.5x XP).\n
                - **Daily/Weekly Rewards** - Users can claim daily or weekly XP rewards.\n
                - **XP Transfer** - Allows users to transfer their XP to other users.\n
                - **Leaderboard Tiers** - Different leaderboards for various user segments, like top users of the week or month.\n
                - **Custom Level-Up Messages** - Allows admins to set custom messages sent when users reach specific levels.\n
                - **Guild-Wide XP Events** - Admins can start server-wide events where everyone gains extra XP for a limited time.\n
                - **Customizable XP Gain Rates** - Allows admins to set how much XP users gain per message, adjusting progression speed.\n
                - **Custom Anti-Spam Measures** - Enable/Disable anti-spamming measures for farm XP.\n
                - **Prestige System** - When users reach the maximum level, they can "prestige," resetting their level but gaining a special role or title.\n
                - **Customizable Level Cap** - Allows admins to set a maximum level users can achieve.\n

                If you have any suggestions for features or commands, make a review on https://top.gg/bot/1278098225353719869.
                `;
    
                const embed = new EmbedBuilder()
                .setColor(0xffa500) // Yellowish color to indicate warning or notice
                .setTitle("Bot Update Notification")
                .setDescription(messageToServers)
                .setTimestamp();

                // First, check if logChannelId is set
                if (logChannelId) {
                    let logChannel;
                    try {
                        logChannel = client.channels.cache.get(logChannelId);
                        if (!logChannel) {
                            // Try fetching it if it's not cached
                            logChannel = await client.channels.fetch(logChannelId);
                        }

                        // Check if the bot has permission to send messages in this channel
                        if (logChannel && logChannel.permissionsFor(logChannel.guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
                            // Try sending the update notification to the log channel
                            await logChannel.send({ embeds: [embed] });
                            console.log(`Sent update notification to log channel in server ${serverId}`);
                        } else {
                            console.log(`Bot does not have permission to send messages in log channel ${logChannelId} for server ${serverId}`);
                        }
                    } catch (error) {
                        console.error(`Failed to send update to log channel in server ${serverId}:`, error);
                    }
                } else {
                    // If no logChannelId, send to the first public channel
                    console.log(`No logging channel found for server ${serverId}. Attempting to send to a public channel.`);

                    try {
                        const guild = client.guilds.cache.get(serverId);
                        if (!guild) {
                            console.log(`Bot is not in server ${serverId}`);
                            continue;
                        }

                        // Find a public text channel the bot can send a message to
                        const publicChannel = guild.channels.cache.find(channel =>
                            channel.type === ChannelType.GuildText &&
                            channel.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages)
                        );

                        if (publicChannel) {
                            await publicChannel.send({ embeds: [embed] });
                            console.log(`Sent update notification to public channel in server ${serverId}`);
                        } else {
                            console.log(`No suitable channel found in server ${serverId} to send the update notification.`);
                        }
                    } catch (error) {
                        console.error(`Error finding public channel in server ${serverId}:`, error);
                    }
                }
            }
        }
    } catch(error){
        console.log("Error notifing server");
    }
}

// * Function to enable or disable templates
async function handleTemplateOptions(message, interaction, achievementsData, saveAchievementsData) {
    const serverId = message.guild.id;

    // Initialize achievements if not already done
    if (!achievementsData[serverId]) {
        achievementsData[serverId] = {
            customAchievements: {
                levels: {},
                times: {},
                events: {}
            },
            templates: {
                messageAchievements: {
                    enabled: false,
                    achievements: {}
                },
                levelAchievements: {
                    enabled: false,
                    achievements: {}
                },
                timeAchievements: {
                    enabled: false,
                    achievements: {}
                },
                eventAchievements: {
                    enabled: false,
                    achievements: {}
                }
            },
            users: {}
        };
    }

    // Create embed to display template options
    let updatedEmbed;
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Template Achievements")
        .setDescription("Enable or disable templates by saying `enable` or `disable` followed by the template number.")
        .addFields(
            { name: "1️⃣ Level-Based Achievements", value: achievementsData[serverId].templates.levelAchievements.enabled ? "Enabled ✅" : "Disabled ❌" },
            { name: "2️⃣ Time-Based Achievements", value: "Coming soon 🚧" },
            { name: "3️⃣ Event-Based Achievements", value: "Coming soon 🚧" },
            { name: "4️⃣ Message-Based Achievements", value: achievementsData[serverId].templates.messageAchievements.enabled ? "Enabled ✅" : "Disabled ❌" },
        )
        .setFooter({ text: "Choose an option below:", iconURL: message.client.user.displayAvatarURL() });

    await interaction.reply({ embeds: [embed], ephemeral: true });

    // Collect user response
    const filter = response => response.author.id === interaction.user.id;
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => "null");

    
    const input = collected.first().content.trim().toLowerCase();    
    if (!input || input.size === 0) return message.channel.send("You did not respond in time. Please try again.");
    const templateNumbers = input.match(/\d+/g)?.map(Number) || [];

    if (input.startsWith("enable")) {
        templateNumbers.forEach(num => {
            if (num === 1) {
                achievementsData[serverId].templates.levelAchievements.enabled = true;
                // Update the embed with the new status
                updatedEmbed = new EmbedBuilder(embed)
                    .setDescription("Templates have been updated.")
                    .setFields(
                        { name: "1️⃣ Level-Based Achievements", value: achievementsData[serverId].templates.levelAchievements.enabled ? "Enabled ✅" : "Disabled ❌" },
                        { name: "2️⃣ Time-Based Achievements", value: "Coming soon 🚧" },
                        { name: "3️⃣ Event-Based Achievements", value: "Coming soon 🚧" },
                        { name: "4️⃣ Message-Based Achievements", value: achievementsData[serverId].templates.messageAchievements.enabled ? "Enabled ✅" : "Disabled ❌" }
                    );
            }
            else if (num === 2 || num === 3) {
                updatedEmbed = new EmbedBuilder(embed)
                    .setTitle("🚧 Choosen Template is not here yet! 🚧")
            }
            else if (num === 4) {
                // Update the embed with the new status
                achievementsData[serverId].templates.messageAchievements.enabled = true;
                updatedEmbed = new EmbedBuilder(embed)
                    .setDescription("Templates have been updated.")
                    .setFields(
                        { name: "1️⃣ Level-Based Achievements", value: achievementsData[serverId].templates.levelAchievements.enabled ? "Enabled ✅" : "Disabled ❌" },
                        { name: "2️⃣ Time-Based Achievements", value: "Coming soon 🚧" },
                        { name: "3️⃣ Event-Based Achievements", value: "Coming soon 🚧" },
                        { name: "4️⃣ Message-Based Achievements", value: achievementsData[serverId].templates.messageAchievements.enabled ? "Enabled ✅" : "Disabled ❌" }
                    );
            }
            else {
                updatedEmbed = new EmbedBuilder(embed)
                    .setTitle("⚠️ No Template Here! ⚠️")
            }
        });
    } else if (input.startsWith("disable")) {
        templateNumbers.forEach(num => {
            if (num === 1) {
                achievementsData[serverId].templates.levelAchievements.enabled = false;
                // Update the embed with the new status
                updatedEmbed = new EmbedBuilder(embed)
                .setDescription("Templates have been updated.")
                .setFields(
                    { name: "1️⃣ Level-Based Achievements", value: achievementsData[serverId].templates.levelAchievements.enabled ? "Enabled ✅" : "Disabled ❌" },
                    { name: "2️⃣ Time-Based Achievements", value: "Coming soon 🚧" },
                    { name: "3️⃣ Event-Based Achievements", value: "Coming soon 🚧" },
                    { name: "4️⃣ Message-Based Achievements", value: achievementsData[serverId].templates.messageAchievements.enabled ? "Enabled ✅" : "Disabled ❌" }
                );
            }
            else if (num === 2 || num === 3) {
                updatedEmbed = new EmbedBuilder(embed)
                .setTitle("🚧 Choosen Template is not here yet! 🚧")
            }
            else if (num === 4) {
                achievementsData[serverId].templates.messageAchievements.enabled = false;
                // Update the embed with the new status
                updatedEmbed = new EmbedBuilder(embed)
                .setDescription("Templates have been updated.")
                .setFields(
                    { name: "1️⃣ Level-Based Achievements", value: achievementsData[serverId].templates.levelAchievements.enabled ? "Enabled ✅" : "Disabled ❌" },
                    { name: "2️⃣ Time-Based Achievements", value: "Coming soon 🚧" },
                    { name: "3️⃣ Event-Based Achievements", value: "Coming soon 🚧" },
                    { name: "4️⃣ Message-Based Achievements", value: achievementsData[serverId].templates.messageAchievements.enabled ? "Enabled ✅" : "Disabled ❌" }
                );
            }
        });
    } else {
        return message.channel.send("Invalid input, please use `enable` or `disable` followed by the number of the template you want to select");
    }

    // Save updated achievements data
    try {
        fs.writeFileSync(achievementFilePath, JSON.stringify(achievementsData, null, 4));
        // console.log("Achievements data successfully updated and saved.");
    } catch (err) {
        console.error("Error saving achievements data:", err);
        return message.channel.send("Failed to save achievements data.");
    }

    return message.channel.send({ embeds: [updatedEmbed], ephemeral: true });
}

async function trackMessageAchievements(message, achievementsData, saveAchievementsData) {
    const serverId = message.guild.id;
    const userId = message.author.id;

    // * Ensure achievements data is set up for this server
    if (!achievementsData[serverId]) {
        achievementsData[serverId] = {
            customAchievements: {
                levels: {},
                times: {},
                events: {}
            },
            templates: {
                messageAchievements: {
                    enabled: false,
                    achievements: {}
                },
                levelAchievements: {
                    enabled: false,
                    achievements: {}
                },
                timeAchievements: {
                    enabled: false,
                    achievements: {}
                },
                eventAchievements: {
                    enabled: false,
                    achievements: {}
                }
            },
            users: {}
        };
    }

    // * Ensure achievements data is set up for this user
    const users = achievementsData[serverId].users;
    if (!users[userId]) {
        users[userId] = {
            messagesSent: 0,
            achievements: [] // * Ensure achievements is an array
        };
    }

    const userAchievements = users[userId];

    // ! Only add if enabled
    if (achievementsData[serverId].templates.messageAchievements.enabled === true) {
        userAchievements.messagesSent++;
    }

    // Check for message milestones and give achievements
    const milestones = {
        100: 'Casual Typer',
        1000: 'Pro Typer',
        10000: 'King of Spam',
        100000: 'OG Spammer'
    };

    for (const [messageCount, achievementName] of Object.entries(milestones)) {
        if (userAchievements.messagesSent >= messageCount && !userAchievements.achievements.includes(achievementName)) {
            // Award achievement
            userAchievements.achievements.push(achievementName);

            // Notify user
            message.channel.send(`<@${userId}> has earned the **${achievementName}** achievement!`);
        }
    }

    // Save achievements data
    try {
        fs.writeFileSync(achievementFilePath, JSON.stringify(achievementsData, null, 4));
        // console.log("Achievements data saved.");
    } catch (err) {
        console.error("Error saving achievements data:", err);
    }
}






















// ! Don't use

async function handleCustomOptions(message, interaction) {
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Custom Achievements")
        .setDescription("This features is still a work in progress. If you want to see it sooner, vote the bot and leave a review to motivate him! As a sneak peak, here are some of the ideas of the custom achievements")
        .addFields(
            { name: "1️⃣ Level-Based Achievements", value: "Customize achievements based on levels." },
            { name: "2️⃣ Time-Based Achievements", value: "Customize achievements based on time spent in the server." },
            { name: "3️⃣ Event-Based Achievements", value: "Customize achievements based on events." },
            { name: "4️⃣ Message-Based Achievements", value: "Customize achievements based on messages."}
        )
        .setFooter({ text: "try running a template 👀", iconURL: message.client.user.displayAvatarURL() });

    await message.channel.send({ embeds: [embed] });
}

async function handleCustomLevelAchievements(message, interaction, serverId, achievementsData, saveAchievementsData, data) {
    // Check if the server has milestone levels set
    // const serverId = interaction.guild.id;

    if (!data[serverId].milestoneLevels || data[serverId].milestoneLevels.length === 0) {
        const response = await message.channel.send("No levels have been set. Would you like to set levels now? (yes/no)");

        const filter = response => response.author.id === message.author.id;
        const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);

        if (!collected || collected.size === 0 || collected.first().content.toLowerCase() !== 'yes') {
            return message.channel.send("Command cancelled.");
        }

        await setLevelsCommand(message); // Assuming this command already exists.
    }

    const levels = data[serverId].milestoneLevels;
    await message.channel.send("Enter achievement names in the order of the levels you have set.");

    const filter = response => response.author.id === interaction.user.id;
    const collected = await message.channel.awaitMessages({ filter, max: levels.length, time: 60000 }).catch(() => null);

    if (!collected || collected.size !== levels.length) {
        return message.channel.send("You did not provide enough achievement names. Command cancelled.");
    }

    // Ensure correct custom achievements setup for levels
    const customAchievements = {};
    collected.forEach((msg, index) => {
        customAchievements[levels[index]] = msg.content.trim();
    });

    // Save achievements data
    achievementsData[serverId].customAchievements.levels = customAchievements;
    saveAchievementsData();

    // Display confirmation with the set achievements
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Custom Level-Based Achievements Set")
        .addFields(
            { name: "Level", value: Object.keys(customAchievements).join('\n'), inline: true },
            { name: "Achievement", value: Object.values(customAchievements).join('\n'), inline: true }
        );

    return message.channel.send({ embeds: [embed] });
}

async function handleCustomTimeAchievements(message, interaction, serverId, achievementsData, saveAchievementsData, data) {
    // Process each entry and validate the format
    const filter = response => response.author.id === interaction.user.id;
    const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);
    const timeEntries = collected.first().content.trim().split(',');
    const customAchievements = {};
    for (const entry of timeEntries) {
        const [days, ...achievementArr] = entry.trim().split(' ');
        const achievementName = achievementArr.join(' ');

        if (isNaN(days) || !achievementName) {
            return message.channel.send(`Invalid time format for entry: ${entry}. Please use the format 'days achievementName'.`);
        }

        customAchievements[days.trim()] = achievementName.trim();
    } 

    // Save custom time-based achievements
    achievementsData[serverId].customAchievements.times = customAchievements;
    saveAchievementsData();
    // Ensure there is some time-based data structure for custom achievements
    if (!achievementsData[serverId].customAchievements.times) {
        achievementsData[serverId].customAchievements.times = {};
    }

    await message.channel.send(
        "Enter the time ranges in days (separated by commas) and their respective achievement names, one by one. Example: '30 Newbie, 90 Known User, 365 Veteran'"
    );

    

    

    // Display confirmation embed
    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Custom Time-Based Achievements Set")
        .addFields(
            { name: "Days", value: Object.keys(customAchievements).join('\n'), inline: true },
            { name: "Achievement", value: Object.values(customAchievements).join('\n'), inline: true }
        );

    return message.channel.send({ embeds: [embed] });
}

async function handleCustomEventAchievements(message, interaction, serverId, achievementsData, saveAchievementsData) {
    // const serverId = interaction.guild.id;

    await interaction.reply(
        "Enter the events and their respective achievement names, separated by commas.\nExample: `Trivia Champion, Raid Leader, Karaoke Star`"
    );

    const filter = response => response.author.id === interaction.user.id;  // Corrected to check the user who triggered the interaction
    const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000 }).catch(() => null);

    const eventNames = collected.first().content.split(',').map(event => event.trim());

    if (!eventNames || eventNames.length === 0) {
        return interaction.followUp("Invalid input. Please run the command again.");
    }

    const customAchievements = {};
    eventNames.forEach((event) => {
        customAchievements[event] = event;  // Here, you can modify the logic for custom naming
    });

    achievementsData[serverId].customAchievements.events = customAchievements;
    saveAchievementsData();

    const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Custom Event-Based Achievements Set")
        .addFields(
            { name: "Event", value: Object.keys(customAchievements).join('\n'), inline: true },
            { name: "Achievement", value: Object.values(customAchievements).join('\n'), inline: true }
        );

    return interaction.followUp({ embeds: [embed] });
}

function testWriteToAchievementsFile() {
    const testData = {
        testKey: "testValue",
        timestamp: new Date().toISOString()
    };

    try {
        fs.writeFileSync("json/serverConfigs.json", JSON.stringify(testData, null, 4));
        console.log("Test data successfully written to achievements.json.");
    } catch (err) {
        console.error("Failed to write to achievements.json:", err);
    }
}

// ! create handleCustomTimeAchievements function

// ! create handleCustomEventAchievements function

module.exports = {
    ensureUserData,
    ensureServerData,
    saveData,
    saveAchievementsData,
    saveBadgesData,
    saveServerConfigsData,
    addAchievement,
    addBadge,
    sendLogMessage,
    sendStatusMessage,
    notifyUpdate,
    handleTemplateOptions,
    trackMessageAchievements,
    handleCustomOptions,
    handleCustomLevelAchievements,
    handleCustomTimeAchievements,
    handleCustomEventAchievements,
    testWriteToAchievementsFile,
    debugError
};
