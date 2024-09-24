const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType } = require('discord.js');
const { EmbedBuilder, SelectMenuBuilder, ActionRowBuilder } = require('@discordjs/builders');
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

// ? Load all functions

// * User DB:
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

function getUserDataFromDB(serverId) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT * 
            FROM users 
            WHERE serverId = ?`, [serverId], (err, row) => {
                if (err) {
                    console.error(err.message);
                    return reject(err);
                } else {
                    resolve(row);
                }
            });
    });
}

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

// //

// * Server DB:
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

function saveServerConfigsData(serverId, config) {
    const blacklistedChannels = Array.isArray(config.blacklistedChannels)
        ? JSON.stringify(config.blacklistedChannels)
        : config.blacklistedChannels;

    db.run(`
        INSERT INTO serverConfigsData (serverId, name, blacklistedChannels, allowedChannel, loggingChannelId, prefix, requireConfirm)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(serverId) DO UPDATE SET
        name = excluded.name, blacklistedChannels = excluded.blacklistedChannels,
        allowedChannel = excluded.allowedChannel, loggingChannelId = excluded.loggingChannelId,
        prefix = excluded.prefix, requireConfirm = excluded.requireConfirm
    `, [serverId, config.name, blacklistedChannels, config.allowedChannel, config.loggingChannelId, config.prefix, config.requireConfirm], (err) => {
        if (err) {
            console.error(err.message);
        }
    });
}

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

async function getAllServerConfigs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM serverConfigsData', (err, rows) => {
            if (err) {
                console.error("Error fetching server configurations:", err.message);
                return reject(err);
            }
            resolve(rows || []); // Returns an array of server configs
        });
    });
}

async function saveServerConfigsPrefix(serverId, newPrefix) {
    await new Promise((resolve, reject) => {
        db.run(
            `UPDATE serverConfigsData SET prefix = ? WHERE serverId = ?`,
            [newPrefix, serverId],
            function (err) {
                if (err) {
                    console.error("Error while updating the new prefix: ", err.message);
                    return reject(err);
                }
                resolve();
            }
        )
    });
}

async function updateBlacklistToServerConfigsData(serverId, blacklistedChannels) {
    await new Promise((resolve, reject) => {
        db.run(
            `UPDATE serverConfigsData SET blacklistedChannels = ? WHERE serverId = ?`,
            [JSON.stringify(blacklistedChannels), serverId],  // Stringify the array before storing
            function (err) {
                if (err) {
                    console.error("Error updating blacklisted channels:", err.message);
                    return reject(err);
                }
                resolve();
            }
        );
    });
}

// //

// * Owner DB:
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

async function getAllOwnerData() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM ownerData', (err, rows) => {
            if (err) {
                console.error("Error fetching owner data:", err.message);
                return reject(err);
            }
            resolve(rows || []); // Returns an array of owner data
        });
    });
}

async function getTopMembersByLevel(serverId, limit = 5) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT userId, level 
            FROM users 
            WHERE serverId = ? 
            ORDER BY level DESC, xp DESC 
            LIMIT ?
        `, [serverId, limit], (err, rows) => {
            if (err) {
                console.error("Error fetching top members by level:", err.message);
                return reject(err);
            }
            resolve(rows || []); // Return empty array if no results found
        });
    });
}

// //

// * Badges DB:
// Fetch server-wide badges from the database
async function getServerBadgesFromDB(serverId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT badgeName, badgeEmoji, level FROM serverBadges WHERE serverId = ?`, [serverId], (err, rows) => {
            if (err) {
                console.error("Error fetching server-wide badges from the database:", err.message);
                return reject(err);
            }
            resolve(rows || []);  // Return an empty array if no server-wide badges found
        });
    });
}

// Fetch user-specific badges from the database
async function getUserBadgesFromDB(serverId, userId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT badgeName, badgeEmoji, level FROM userBadges WHERE serverId = ? AND userId = ?`, [serverId, userId], (err, rows) => {
            if (err) {
                console.error("Error fetching user-specific badges from the database:", err.message);
                return reject(err);
            }
            resolve(rows || []);  // Return an empty array if no user-specific badges found
        });
    });
}

// General function to fetch all badges for a user (combining both server-wide and user-specific badges)
async function getAllBadges(serverId, userId) {
    const serverBadges = await getServerBadgesFromDB(serverId);
    const userBadges = await getUserBadgesFromDB(serverId, userId);

    return {
        serverBadges,
        userBadges
    };
}

// Save server-wide badges to the database
async function saveServerBadgesData(serverId, badgesData) {
    return new Promise((resolve, reject) => {
        badgesData.forEach(badge => {
            db.run(
                `INSERT INTO serverBadges (serverId, badgeName, badgeEmoji, level) 
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                serverId = excluded.serverId, badgeName = excluded.badgeName, badgeEmoji = excluded.badgeEmoji, level = excluded.level`,
                [serverId, badge.badgeName, badge.badgeEmoji, badge.level],
                function (err) {
                    if (err) {
                        console.error("Error inserting server badge into the database:", err.message);
                        return reject(err);
                    }
                }
            );
        });
        resolve();
    });
}

// Save user-specific badges to the database
async function saveUserBadgesData(serverId, userId, badgesData) {
    return new Promise((resolve, reject) => {
        // Delete current badges
        db.run(`DELETE FROM userBadges WHERE serverId = ? AND userId = ?`, [serverId, userId], function (err) {
            if (err) {
                console.error("Error deleting old badges from the database:", err.message);
                return reject(err);
            }

            // Insert updated badges
            const insertBadge = (badge) => {
                db.run(
                    `INSERT INTO userBadges (serverId, userId, badgeName, badgeEmoji, level) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [serverId, userId, badge.badgeName, badge.badgeEmoji, badge.level],
                    function (err) {
                        if (err) {
                            console.error("Error inserting badge into the database:", err.message);
                            return reject(err);
                        }
                    }
                );
            };

            // Loop through each badge and insert it
            badgesData.forEach(insertBadge);

            resolve();
        });
    });
}

// Add or update a user-specific badge
async function addUserBadge(serverId, userId, badgeName, badgeEmoji) {
    try {
        // Get the user's existing badges
        const existingBadges = await getUserBadgesFromDB(serverId, userId);

        // Check if the user already has this badge
        const hasBadge = existingBadges.some(badge => badge.badgeName === badgeName);

        if (hasBadge) {
            console.log(`User ${userId} already has the badge ${badgeName}`);
            return;  // Do nothing if the user already has the badge
        }

        // Prepare badge data to be added
        const badgesData = [{
            badgeName: badgeName,
            badgeEmoji: badgeEmoji
        }];

        // Save the badge to the database
        await saveUserBadgesData(serverId, userId, badgesData);
        console.log(`Badge ${badgeName} with emoji ${badgeEmoji} has been added for user ${userId} in server ${serverId}`);
    } catch (error) {
        console.error(`Error adding badge for user ${userId}:`, error);
    }
}

// Add or update a server-wide badge
async function addServerBadge(serverId, badgeName, badgeEmoji) {
    const badgesData = [{
        badgeName: badgeName,
        badgeEmoji: badgeEmoji
    }];

    await saveServerBadgesData(serverId, badgesData);
    console.log(`Server-wide badge ${badgeName} with emoji ${badgeEmoji} has been added for server ${serverId}`);
}

async function assignServerBadgeToUser(serverId, userId, level) {
    return new Promise((resolve, reject) => {
        // Fetch the badge from serverBadges based on serverId and level
        db.get(`
            SELECT badgeName, badgeEmoji, level 
            FROM serverBadges 
            WHERE serverId = ? AND level = ?`, 
            [serverId, level], 
            (err, row) => {
                if (err) {
                    console.error("Error fetching server badge:", err.message);
                    return reject(err);
                }
                
                if (!row) {
                    return reject(`No server badge found for level ${level}`);
                }

                // Insert the fetched badge into the userBadges table
                db.run(`
                    INSERT INTO userBadges (serverId, userId, badgeName, badgeEmoji, level) 
                    VALUES (?, ?, ?, ?, ?)`, 
                    [serverId, userId, row.badgeName, row.badgeEmoji, row.level], 
                    (err) => {
                        if (err) {
                            console.error("Error assigning badge to user:", err.message);
                            return reject(err);
                        }
                        resolve(`Badge assigned to user ${userId} for level ${level}`);
                    }
                );
            }
        );
    });
}


// //

// * Roles DB:
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

function getRolesForLevel(serverId, userLevel) {
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

// //

// * Milestone DB
async function isMilestoneLevel(serverId, level) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT level FROM milestoneLevels WHERE serverId = ?`, [serverId], (err, row) => {
            if (err) {
                console.error(`Error checking milestone level for server ${serverId} and level ${level}:`, err);
                return reject(err);
            }

            if (row && row.level) {
                const milestoneLevels = JSON.parse(row.level); // Parse the JSON array
                console.log(`Checking if level ${level} is a milestone:`, milestoneLevels.includes(level.toString()));
                resolve(milestoneLevels.includes(level.toString())); // Compare as strings
            } else {
                resolve(false); // No milestone levels found
            }
        });
    });
}

function getMilestoneLevels(serverId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM milestoneLevels WHERE serverId = ?`, [serverId], (err, rows) => {
            if (err) {
                console.error(err.message);
                return reject(err);
            }
            resolve(rows);  // Return array of role objects
        });
    });
}

function getMilestoneLevelsFromDB(serverId) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT level FROM milestoneLevels WHERE serverId = ?`, [serverId], (err, rows) => {
            if (err) {
                console.error(err.message);
                return reject(err);
            }
            resolve(rows);  // Return array of role objects
        });
    });
}

function saveMilestoneLevels(serverId, levelData) {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO milestoneLevels (serverId, level)
            VALUES (?, ?)
        `, [serverId, levelData.level], (err) => {
            if (err) {
                console.error("Error saving server configuration:", err.message);
                return reject(err);
            }
            resolve();
        });
    });
}

async function saveMilestoneLevelServerId(serverId, levels) {
    await new Promise((resolve, reject) => {
        db.run(
            `UPDATE milestoneLevels SET level = ? WHERE serverId = ?`,
            [JSON.stringify(levels), serverId],  // Store levels as a JSON string
            function (err) {
                if (err) {
                    return reject(err);
                }
                resolve();
            }
        );
    });
}

// //

// * Ensure Data:
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

async function ensureServerData(serverId, guild, userId) {
    // Fetch data from the database
    const serverConfig = await getServerConfigsData(serverId);
    const userBadgesData = await getUserBadgesFromDB(serverId, userId);
    const serverBadgesData = await getServerBadgesFromDB(serverId);
    const rolesData = await getRolesData(serverId);
    const milestoneLevelsData = await getMilestoneLevels(serverId);

    // Initialize roles if not present
    if (!rolesData || rolesData.length === 0) {
        const defaultRoles = {
            roles: {}
        };
        await saveRoles(serverId, defaultRoles);
    }

    // If server configuration doesn't exist, initialize with default values
    if (!serverConfig) {
        const defaultServerData = {
            serverId: serverId,
            name: guild.name,
            blacklistedChannels: JSON.stringify([]),  // Store as JSON array
            allowedChannel: null,
            loggingChannelId: null,
            prefix: "!",  // Default prefix
            requireConfirm: false
        };

        await saveServerConfig(serverId, defaultServerData);
    }

    // Initialize milestone levels if not present
    if (!milestoneLevelsData || milestoneLevelsData.length === 0) {
        const defaultMilestoneLevels = {
            serverId: serverId,
            level: JSON.stringify([])  // Store levels as JSON string
        };
        await saveMilestoneLevels(serverId, defaultMilestoneLevels);
    }
}

// //

// * Execute Commands Data:
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
        const usersField = sortedLeaderboard.map((user, index) => `${index + 1}. ${user.displayName} [lvl ${user.level}]`).join('\n');

        // Create leaderboard embed
        const leaderboardEmbed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle("Server Leaderboard")
            .addFields(
                { name: "Top 10", value: usersField, inline: true }
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

// //

// * Other Data:
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

// Send status to logging channel
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

// Will notify the servers with the new update
async function notifyUpdate(client) {
    try {
        // Fetch all server configurations from the database
        const serverConfigsData = await getAllServerConfigs();  // This assumes you have a function to fetch all server configs

        for (const serverConfig of serverConfigsData) {
            const serverId = serverConfig.serverId;

            // If there's no valid serverConfig, skip to the next server
            if (!serverConfig) continue;

            const logChannelId = serverConfig.loggingChannelId;
            const messageToServers = `
                Level Bot is finally back up!

                **New Update:**
- Moved from JSON file management to a SQLite database
- Updated community commands to use slash commands (old prefix commands still work)
- Fixed addxp and rmxp commands to actually work now
- Updated the look of profile and rank
- Added new logic in the backend to clean things up

                **Future Updates:**
- Adding slash commands to the other commands
- Adding a suggestions command for users to add suggested updates
- Fixing the logic for the vote command

                Open Source Repo: <https://github.com/JayNightmare/Level-Discord-Bot>
            `;

            const embed = new EmbedBuilder()
                .setColor(0xffa500) // Yellowish color to indicate warning or notice
                .setTitle("BOT UPDATE")
                .setDescription(messageToServers)
                .setTimestamp()
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter({ text: "Bot Update", iconURL: client.user.displayAvatarURL() });

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
    } catch (error) {
        console.error("Error notifying server:", error);
    }
}

module.exports = {    
    // User DB:
    getUserData,
    getUserDataFromDB,
    updateUserBio,
    saveData,

    // Server DB:
    getServerConfigsData,
    saveServerConfigsData,
    saveServerConfig,
    getAllServerConfigs,
    saveServerConfigsPrefix,
    updateBlacklistToServerConfigsData,

    // Owner DB:
    getOwnerData,
    saveOwnerData,
    getAllOwnerData,
    getTopMembersByLevel,

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

    // Execute Commands Data:
    executeProfile,
    executeSetBio,
    executeLeaderboard,
    executeVote,
    updateUserVoteData,
    executeCheckRoles,

    // Other Functions:
    sendLogMessage,
    sendStatusMessage,
    notifyUpdate
};
