const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType } = require('discord.js');
const { EmbedBuilder, SelectMenuBuilder, ActionRowBuilder } = require('@discordjs/builders');
const path = require('path');
const fs = require('fs');
const { log } = require('console');
require('dotenv').config(); 
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bot.db');

// ? Load data from the file
let data = {};
let badgesData = {};
let serverConfigsData = {};
let ownerData = {};

// ? Load all files

function getUserData(serverId, userId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT xp, level, bio 
            FROM users 
            WHERE serverId = ? AND userId = ?`, 
            [serverId, userId], (err, row) => {
                if (err) {
                    console.error(err.message);
                    return reject(err);
                }
                // Return default data if user does not exist
                if (!row) {
                    resolve({ xp: 0, level: 1, bio: "", roles: [], totalXp: 0, lastVote: 0 });
                } else {
                    resolve(row);
                }
            });
    });
} 

// //

function getUserBadges(serverId, userId) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT badgeName AS name, badgeEmoji AS emoji 
            FROM badges 
            WHERE serverId = ? AND userId = ?`, 
            [serverId, userId], (err, rows) => {
                if (err) {
                    console.error(err.message);
                    return reject(err);
                }
                resolve(rows || []);  // Return an empty array if no badges found
            });
    });
}

// //

function getBadgesData(serverId, userId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM badges WHERE serverId = ? AND userId = ?`, [serverId, userId], (err, row) => {
            if (err) {
                console.error(err.message);
                return reject(null);
            }
            resolve(row || { badges: "[]" }); // Return default if no badges found
        });
    });
}

// //

function getServerConfigsData(serverId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM serverConfigsData WHERE serverId = ?`, [serverId], (err, row) => {
            if (err) {
                console.error(err.message);
                return reject(err);  // Reject the promise in case of an error
            }
            resolve(row || null);  // Resolve with server config or null if not found
        });
    });
}

// //

function getOwnerData(serverId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM ownerData WHERE serverId = ?`, [serverId], (err, row) => {
            if (err) {
                console.error(err.message);
                return reject(err);  // Reject the promise in case of an error
            }
            resolve(row || null);
        });
    });
}

// //

function getMilestoneLevels(serverId) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT level FROM milestoneLevels WHERE serverId = ?`, [serverId], (err, row) => {
            if (err) {
                console.error('Error fetching milestone levels:', err.message);
                return reject(err);
            }
            if (row) {
                resolve(JSON.parse(row.level));
            } else {
                resolve([]);  // Return an empty array if no levels are set for the server
            }
        });
    });
}

function saveMilestoneLevels(serverId, milestoneLevels) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO milestoneLevels (serverId, level)
            VALUES (?, ?)
            ON CONFLICT(serverId) DO UPDATE SET
            level = excluded.level
        `, [serverId, JSON.stringify(milestoneLevels)], (err) => {
            if (err) {
                console.error('Error saving milestone levels:', err.message);
                return reject(err);
            }
            resolve();
        });
    });
}

// //

async function getRolesForLevel(serverId, userLevel) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT roleId 
            FROM roles 
            WHERE serverId = ? AND levelRequired <= ?
        `, [serverId, userLevel], (err, rows) => {
            if (err) return reject(err);
            resolve(rows.map(row => row.roleId));  // Return an array of role IDs
        });
    });
}

function saveRoleForLevel(serverId, levelRequired, roleId) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO roles (serverId, levelRequired, roleId)
            VALUES (?, ?, ?)
            ON CONFLICT(serverId, levelRequired) DO UPDATE SET
            roleId = excluded.roleId
        `, [serverId, levelRequired, roleId], (err) => {
            if (err) {
                console.error("Error saving role for level:", err.message);
                return reject(err);
            }
            resolve();
        });
    });
}

// //

// * Update Bio
function updateUserBio(serverId, userId, bio) {
    return new Promise(async (resolve, reject) => {
        try {
            await ensureUserData(serverId, userId);  // Ensure the user exists first
            db.run(`
                UPDATE users 
                SET bio = ? 
                WHERE serverId = ? AND userId = ?
            `, [bio, serverId, userId], (err) => {
                if (err) {
                    console.error("Error updating user bio:", err.message);
                    return reject(err);
                }
                resolve();
            });
        } catch (error) {
            reject(error);
        }
    });
}

// //

function ensureUserData(serverId, userId) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT OR IGNORE INTO users (serverId, userId, xp, totalXp, level, bio )
            VALUES (?, ?, 0, 0, 1, '')
        `, [serverId, userId], (err) => {
            if (err) {
                console.error("Error ensuring user exists:", err.message);
                return reject(err);
            }
            resolve();
        });
    });
}

// //

async function isMilestoneLevel(serverId, level) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT level FROM milestoneLevels WHERE serverId = ? AND level = ?`, [serverId, level], (err, row) => {
            if (err) return reject(err);
            resolve(!!row); // Return true if the level is a milestone
        });
    });
}

// //

// Fetch milestone levels from SQLite
async function getMilestoneLevelsFromDB(serverId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT level FROM milestoneLevels WHERE serverId = ?`, [serverId], (err, rows) => {
            if (err) {
                console.error(err.message);
                return reject(err);
            }
            resolve(rows.map(row => row.level));  // Return an array of levels
        });
    });
}

// Fetch roles from SQLite
async function getRolesFromDB(serverId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT roleId FROM roles WHERE serverId = ?`, [serverId], (err, rows) => {
            if (err) {
                console.error(err.message);
                return reject(err);
            }
            resolve(rows);  // Return array of role objects
        });
    });
}

async function getRolesData(serverId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM roles WHERE serverId = ?`, [serverId], (err, rows) => {
            if (err) {
                console.error(err.message);
                return reject(err);
            }
            resolve(rows);  // Return array of role objects
        });
    });
}

// //

// ? For Badges
async function getBadgesFromDB(serverId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT badgeName, badgeEmoji FROM badges WHERE serverId = ?`, [serverId], (err, rows) => {
            if (err) {
                console.error("Error fetching badges from the database:", err.message);
                return reject(err);
            }
            resolve(rows || []);
        });
    });
}

// Function to get badges for a specific user
async function getUserBadgesFromDB(serverId, userId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT badgeName FROM badges WHERE serverId = ? AND userId = ?`, [serverId, userId], (err, rows) => {
            if (err) {
                console.error("Error fetching user badges from the database:", err.message);
                return reject(err);
            }
            resolve(rows.map(row => row.badgeName) || []);
        });
    });
}

// Function to add a badge to a user in the database
async function addUserBadgeToDB(serverId, userId, badgeName) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO badges (serverId, userId, badgeName, badgeEmoji) 
            VALUES (?, ?, ?, ?) 
            ON CONFLICT(serverId, userId, badgeName, badgeEmoji) DO NOTHING
        `, [serverId, userId, badgeName, badgeEmoji], (err) => {
            if (err) {
                console.error("Error adding badge to user in the database:", err.message);
                return reject(err);
            }
            resolve();
        });
    });
}

// //

function saveServerConfig(serverId, serverData) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO serverConfigsData (serverId, name, blacklistedChannels, allowedChannel, loggingChannelId, prefix, requireConfirm)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [serverId, serverData.name, serverData.blacklistedChannels, serverData.allowedChannel, serverData.loggingChannelId, serverData.prefix, serverData.requireConfirm], (err) => {
            if (err) {
                console.error("Error saving server configuration:", err.message);
                return reject(err);
            }
            resolve();
        });
    });
}

async function ensureServerData(serverId, guild) {
    // Check if server data exists in the database
    const serverConfig = await getServerConfigsData(serverId);
    
    // If server configuration doesn't exist, initialize with default values
    try {
        if (!serverConfig) {
            console.log("No server! Adding Data");
            const defaultServerData = {
                serverId: serverId,
                name: guild.name,
                blacklistedChannels: JSON.stringify([]),  // Store as JSON array
                allowedChannel: null,
                loggingChannelId: null,
                prefix: "!",  // Default prefix
                requireConfirm: false
            };
    
            // Save the default server configuration into the database
            await saveServerConfig(serverId, defaultServerData);
    
            console.log(`Initialized default server configuration for serverId: ${serverId}`);
        }
    } catch(err) {
        console.log("Server Already Exists! No Data Added - " + err);
    }

    // Ensure that the badges, roles, and milestone levels are initialized
    const badgesData = await getBadgesData(serverId);
    const rolesData = await getRolesData(serverId);
    const milestoneLevelsData = await getMilestoneLevelsFromDB(serverId);

    // Initialize badges if not present
    if (!badgesData || badgesData.length === 0) {
        const defaultBadges = []; // Empty badges array by default
        await saveBadgeData(serverId, null, defaultBadges);
        console.log(`Initialized badges for serverId: ${serverId}`);
    }

    // Initialize roles if not present
    if (!rolesData || rolesData.length === 0) {
        const defaultRoles = { roles: {} }; // No roles set initially
        await saveRoles(serverId, defaultRoles);
        console.log(`Initialized roles for serverId: ${serverId}`);
    }

    // Initialize milestone levels if not present
    if (!milestoneLevelsData || milestoneLevelsData.length === 0) {
        const defaultMilestoneLevels = [];
        await saveMilestoneLevels(serverId, defaultMilestoneLevels);
        console.log(`Initialized milestone levels for serverId: ${serverId}`);
    }
}

// * Helper function to save data
function saveData(serverId, userId, userData) {
    db.run(`
        INSERT OR IGNORE INTO users (serverId, userId, xp, totalXp, level, bio)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(serverId, userId) DO UPDATE SET
        xp = excluded.xp, totalXp = excluded.totalXp, level = excluded.level, bio = excluded.bio
    `, [serverId, userId, userData.xp, userData.totalXp, userData.level, userData.bio ], (err) => {
        if (err) {
            console.error(err.message);
        }
    });
}

function saveServerConfigsData(serverId, config) {
    db.run(`
        INSERT INTO servers (serverId, name, blacklistedChannels, allowedChannel, loggingChannelId, prefix, requireConfirm)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(serverId) DO UPDATE SET
        name = excluded.name, blacklistedChannels = excluded.blacklistedChannels,
        allowedChannel = excluded.allowedChannel, loggingChannelId = excluded.loggingChannelId,
        prefix = excluded.prefix, requireConfirm = excluded.requireConfirm
    `, [serverId, config.name, JSON.stringify(config.blacklistedChannels), config.allowedChannel, config.loggingChannelId, config.prefix, config.requireConfirm], (err) => {
        if (err) {
            console.error(err.message);
        }
    });
}

function saveBadgesData(serverId, userId, badges) {
    db.run(`
        INSERT INTO badges (serverId, userId, badges)
        VALUES (?, ?, ?)
        ON CONFLICT(serverId, userId) DO UPDATE SET
        badges = excluded.badges
    `, [serverId, userId, JSON.stringify(badges)], (err) => {
        if (err) {
            console.error(err.message);
        }
    });
}

async function saveRoles(serverId, rolesData) {
    return new Promise((resolve, reject) => {
        // Assuming rolesData is an object with levels as keys and roleIds as values
        for (const [levelRequired, roleId] of Object.entries(rolesData.roles)) {
            db.run(
                `INSERT INTO roles (serverId, roleId, levelRequired) VALUES (?, ?, ?)`,
                [serverId, roleId, levelRequired],
                function (err) {
                    if (err) {
                        console.error(`Error inserting role for server ${serverId}:`, err.message);
                        return reject(err);
                    }
                }
            );
        }
        resolve();
    });
}

function saveOwnerData(serverId, ownerId, memberCount) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO ownerData (serverId, ownerId, memberCount)
            VALUES (?, ?, ?)
            ON CONFLICT(serverId) DO UPDATE SET
            ownerId = excluded.ownerId, memberCount = excluded.memberCount
        `, [serverId, ownerId, memberCount], (err) => {
            if (err) {
                console.error("Error saving owner data:", err.message);
                return reject(err);
            }
            resolve();
        });
    });
}

// //

function addBadge(serverId, userId, badgeName, badgeDetails = null) {
    ensureUserData(serverId, userId);

    getBadgesData(serverId, userId, (userBadges) => {
        if (!userBadges) {
            userBadges = [];
        }

        if (badgeDetails) {
            // Add or update badge details in the database
            saveBadgesData(serverId, userId, badgeDetails);
        }

        if (!userBadges.includes(badgeName)) {
            userBadges.push(badgeName);
            saveBadgesData(serverId, userId, userBadges);
            return true;
        }
        return false;
    });
}

function sendLogMessage(serverId, messageText) {
    getServerConfigsData(serverId, (config) => {
        const logChannelId = config?.loggingChannelId;
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
    });
}

// * Send status to logging channel
async function sendStatusMessage(serverId, status) {
    const logChannelId = serverConfigsData?.loggingChannelId;
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
            if (!serverConfigsData) continue;

            // const prefixFinder = serverConfigsData[serverId].prefix || "!";
            if (data.hasOwnProperty(serverId)) {
                const logChannelId = serverConfigsData[serverId]?.loggingChannelId;
                const messageToServers = `The bot has been experiencing issues on the server, causing it to get stuck in a reset loop. The bot will be down till the issue is resolved.`;
    
                const embed = new EmbedBuilder()
                .setColor(0xffa500) // Yellowish color to indicate warning or notice
                .setTitle("Bot Maintanance")
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

module.exports = {
    ensureUserData,
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
    getBadgesFromDB,
    getUserBadgesFromDB,
    addUserBadgeToDB,
    getRolesData
};
