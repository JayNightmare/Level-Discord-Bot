const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType } = require('discord.js');
const { EmbedBuilder, SelectMenuBuilder, ActionRowBuilder } = require('@discordjs/builders');
require('dotenv').config();
const fs = require('fs');
const { log } = require('console');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });


// ? Load Data
const usersFilePath = 'json/users.json';
const achievementsFilePath = 'json/achievements.json';
const badgesFilePath = 'json/badges.json';
const serverConfigsFilePath = 'json/serverConfigs.json';
const ownerFilePath = '../Lvl Bot/json/owner.json';

// ? Load data from the file
let data = {};
let achievementsData;
let badgesData = {};
let serverConfigsData = {};
let ownerData = {};

// ? Load command modules
const adminCommands = require('./commands/admin/admin_commands.js');
const communityCommands = require('./commands/community/community_commands.js');
const configurationCommands = require('./commands/configuration/configuration_commands.js');
const ownerCommands = require('./commands/owner/owner_commands.js');

const { ensureUserData,
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
        handleCustomLevelAchievements,
        debugError } = require("./commands/utils.js");

// ? Load all files
try {
    data = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
} catch (err) {
    console.error("Error reading users.json file:", err);
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
    ownerData = JSON.parse(fs.readFileSync(ownerFilePath, 'utf8'));
}

const cooldowns = new Map();

// * Event listener when bot goes online
client.on('ready', () => {
    console.log('Bot is online!');
    // * Example: Send status update to all servers
    Object.keys(data).forEach(serverId => {
        sendStatusMessage(serverId, 'online');
    });
});

client.on('shutdown', () => {
    console.log('Bot is shutting down...');
    Object.keys(data).forEach(serverId => {
        sendStatusMessage(serverId, 'offline');
    });
});

// * Event listener when bot reconnects
client.on('shardReconnecting', (shardId) => {
    console.warn(`Shard ${shardId} is reconnecting...`);
    sendStatusMessage(`Shard ${shardId} is reconnecting...`);
});

// * Event listener when bot resumes
client.on('shardResume', (shardId) => {
    console.log(`Shard ${shardId} has resumed connection.`);
    sendStatusMessage(`Shard ${shardId} is back online.`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'help_menu') {
        const serverId = interaction.guild.id;
        const prefixFinder = serverConfigsData[serverId].prefix;
        let embed;

        switch (interaction.values[0]) {
            case 'admin_commands':
                embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('Admin Commands')
                    .setDescription(`
                    • \`${prefixFinder}setlevels\` - Set milestone levels.\n
                    • \`${prefixFinder}setroles\` - Set milestone roles.\n
                    • \`${prefixFinder}viewsettings\` - View current settings.\n
                    • \`${prefixFinder}blacklist\` - Blacklist channels.\n
                    • \`${prefixFinder}unblacklist\` - Unblacklist channels.\n
                    • \`${prefixFinder}setlogchannel\` - Set the log channel.\n
                    • \`${prefixFinder}unsetlogchannel\` - Unset the log channel.\n
                    • \`${prefixFinder}setrankchannel\` - Set the rank check channel.\n
                    • \`${prefixFinder}unsetrankchannel\` - Unset the rank check channel.\n
                    • \`${prefixFinder}toggleconfirm\` - Toggle the confirm message when adding xp (🚧 Will have more use in the future 🚧).
                    `);
                break;
        
            case 'community_commands':
                embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('Community Commands')
                    .setDescription(`
                    • \`${prefixFinder}rank\` - View your rank.\n
                    • \`${prefixFinder}checkroles\`- Check your roles.\n
                    • \`${prefixFinder}profile\` - View your profile.\n
                    • \`${prefixFinder}setbio\` - Set your bio.\n
                    • \`${prefixFinder}leaderboard\` - View the server leaderboard.\n
                    • \`${prefixFinder}help\` - View bot commands.\n
                    • \`${prefixFinder}vote\` - Vote for the bot for extra xp gain! (🚧 WIP: xp gain currently not working).
                    `);
                break;
        
            case 'configuration_commands':
                embed = new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle('Configuration Commands')
                    .setDescription(`
                    • \`${prefixFinder}setprefix\` - Set a custom prefix for the bot.\n
                    • \`${prefixFinder}addxp\` - Add XP to a user.\n
                    • \`${prefixFinder}rmxp\` - Remove XP from a user - 🚧 COMING SOON 🚧.\n
                    • \`${prefixFinder}addachievement\` - Add an achievement to a user.\n
                    • \`${prefixFinder}rmachievement\` - Remove an achievement from a user.\n
                    • \`${prefixFinder}setachievement\` - Set achievements for server.\n
                    • \`${prefixFinder}addbadge\` - Add a badge to a user.\n
                    • \`${prefixFinder}rmbadge\` - Remove a badge from a user.\n
                    • \`${prefixFinder}setbadges\` - Set badges for milestone levels.\n
                    • \`${prefixFinder}viewbadges\` - View badges of server.
                    `);
                break;
        
            case 'owner_commands':
                if (interaction.user.id !== process.env.OWNER) {
                    return interaction.reply({ content: 'You do not have permission to view this section.', ephemeral: true });
                }
                embed = new EmbedBuilder()
                    .setColor(0xff0000)
                    .setTitle('Owner Commands')
                    .setDescription(`
                    • \`${prefixFinder}${process.env.OWNER1}\`\n
                    • \`${prefixFinder}${process.env.OWNER2}\`\n
                    `);
                break;

            case 'command_help':
                embed = new EmbedBuilder()
                    .setColor(0xffa500)
                    .setTitle('Help With Commands')
                    .setDescription(`
                        All commands are setup to work in steps. First, find the command you want to run and send it, the bot will respond and you'll be told what you need to do next.\n
                        If you experience any errors, contact \`jaynightmare\` on discord with your server ID and the issue you're having. 
                    `);
                break;
        
            default:
                return;
        }        

        // * Validate the embed to ensure no empty fields are sent
        if (embed && embed.data && (embed.data.title || embed.data.description)) {
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } 
        
        else {
            console.error('Attempted to send an embed with missing or invalid fields.');
            await interaction.reply({ content: 'There was an error generating the command list. Please try again later.', ephemeral: true });
        }
    }

    if (interaction.customId === 'achievements_menu') {
        const serverId = interaction.guild.id;
        let embed;
        try {
            const serverId = interaction.guild?.id;

            if (!serverId) {
                return interaction.reply({ content: "This command can only be run in a server", ephemeral: true });
            }

            switch (interaction.values[0]) {
                case 'template':
                    // * Handle the logic to show template options
                    await handleTemplateOptions(interaction.message, interaction, achievementsData, saveAchievementsData);
                    break;
    
                case 'custom':
                    // * Handle the logic to show custom achievement options
                    embed = new EmbedBuilder()
                        .setColor(0x3498db)
                        .setTitle("Custom Achievements - COMING SOON")
                        .setDescription(`This features is still a work in progress.\n
                            If you want to see it sooner, vote the bot and leave a review to motivate him!\n
                            As a sneak peak, here are some of the ideas of the custom achievements`)
                        .addFields(
                            { name: "1️⃣ Level-Based Achievements", value: "Customize achievements based on levels." },
                            { name: "2️⃣ Time-Based Achievements", value: "Customize achievements based on time spent in the server." },
                            { name: "3️⃣ Event-Based Achievements", value: "Customize achievements based on events." },
                            { name: "4️⃣ Message-Based Achievements", value: "Customize achievements based on messages."}
                        )
                        .setFooter({ text: "try running a template instead 👀", iconURL: interaction.client.user.displayAvatarURL() });

                    await interaction.reply({ embeds: [embed] });
                    break;
    
                default:
                    return;
            }
        } catch (error) {
            console.error('Error occured while handling achie menu interaction', error);
            await interaction.reply({ content: "An error occured while generating the menu. Please wait" })
        }
        

        // Acknowledge the interaction
        // await interaction.deferReply();
    }
    
});

client.on('guildCreate', guild => {
    const serverId = guild.id;

    ensureServerData(guild.id, guild);

    // Store owner and member information in owner.json
    ownerData[serverId] = {
        ownerId: guild.ownerId,  // Use the guild object to get the owner ID
        memberCount: guild.memberCount  // Use the guild object to get the member count
    };    

    fs.writeFileSync('./json/owner.json', JSON.stringify(ownerData, null, 4));

    console.log(`Joined new guild: ${guild.name}`);
});

// ! Message handling
client.on('messageCreate', async message => {
    try {
        if (!message.guild || message.author.bot) return;

        const serverId = message.guild.id;
        const userId = message.author.id;
        const guild = message.guild;

        // Ensure the user data is initialized
        ensureUserData(serverId, userId); 
        ensureServerData(serverId, message.guild);

        // Store owner and member information in owner.json
        ownerData[serverId] = {
            ownerId: guild.ownerId,  // Use the guild object to get the owner ID
            memberCount: guild.memberCount  // Use the guild object to get the member count
        };        
        fs.writeFileSync('./json/owner.json', JSON.stringify(ownerData, null, 4));

        // Save updated owner data to file

        // Ensure that the server data is initialized
        if (!data[serverId]) {
            data[serverId] = {
                users: {},  // Initialize users object for the server
                roles: {},
                milestoneLevels: []
            };
        }

        // Ensure that the users data is initialized
        if (!data[serverId].users[userId] ||
            !data[serverId].users[userId].bio ||
            !data[serverId].users[userId].totalXp) {
            data[serverId].users[userId] = {
                xp: data[serverId].users[userId].xp || 0,
                level: data[serverId].users[userId].level || 1,
                bio: "",
                roles: data[serverId].users[userId].role || [],
                totalXp: data[serverId].users[userId].xp || 0
            };
        }

        const member = guild.members.cache.get(userId);

        // Check if the server config exists, if not, initialize it.
        if (!serverConfigsData[serverId] || 
            !serverConfigsData[serverId].prefix ||
            !serverConfigsData[serverId].name ||
            !serverConfigsData[serverId].requireConfirm) {
            serverConfigsData[serverId] = {
                name: guild.name,
                blacklistedChannels: serverConfigsData[serverId].blacklistedChannels,
                allowedChannel: serverConfigsData[serverId].allowedChannel,
                loggingChannelId: serverConfigsData[serverId].loggingChannelId,
                prefix: serverConfigsData[serverId].prefix || "!",
                requireConfirm: false
            };

            // Save the newly created server config to the file
            saveServerConfigsData(serverConfigsData);
        }

        const prefix = serverConfigsData[serverId].prefix || "!";

        // Handle XP and leveling
        if (!message.content.startsWith(prefix)) {
            trackMessageAchievements(message, achievementsData, saveAchievementsData);
            const now = Date.now();
            const cooldownAmount = 1;  // 60 seconds * 1000

            if (cooldowns.has(userId)) {
                const expirationTime = cooldowns.get(userId) + cooldownAmount;

                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    // console.log(`User ${message.author.username} is on cooldown. ${timeLeft.toFixed(1)} seconds remaining.`);
                    return; // User is on cooldown, so do not award XP
                }
            }

            cooldowns.set(userId, now);

            const user = data[serverId].users[userId];
            const xpGain = Math.floor(Math.random() * 5) + 5; // Gain 5-10 XP per message

            // Initialize totalXp if not already set
            if (!user.totalXp) {
                user.totalXp = 0;
            }

            // Accumulate total XP
            user.totalXp += xpGain;  // This tracks all XP gained across all levels.
            user.xp += xpGain;  // This tracks XP towards the next level.

            const level = user.level;
            const x = 100;  // Base multiplier
            const y = 1.1;  // Scaling factor

            const xpNeededForCurrentLevel = Math.floor(level * x * Math.pow(y, level));
            const xpNeededForNextLevel = Math.floor((level + 1) * x * Math.pow(y, level + 1));

            // XP required for the next level
            const xpForNextLevel = xpNeededForNextLevel - xpNeededForCurrentLevel;

            // Level-up logic
            if (user.xp >= xpForNextLevel) {
                user.level++;
                user.xp = 0;

                // Send level-up message
                if (data[serverId].milestoneLevels.includes(user.level)) {
                    message.channel.send(`🎉 Congrats <@${message.author.id}>! You've reached level ${user.level}! This is a milestone level!`);
                } else {
                    message.channel.send(`${message.author.username} leveled up to level ${user.level}!`);
                }

                // Handle role updates if necessary
                await manageRoles(member, user.level, guild, message);
            }

            // Save data after XP and level calculation
            saveData();

            // Save the updated data
            try {
                fs.writeFileSync('json/users.json', JSON.stringify(data, null, 4));
                // console.log("User data successfully saved.");
            } catch (err) {
                console.error("Error saving user data:", err);
            }
            return;
        }

        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        // Handle various command categories as usual
        if (adminCommands[command]) {
            await adminCommands[command].execute(message, args, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData);
        }

        // * Community commands
        if (communityCommands[command]) {
            await communityCommands[command].execute(message, args, data, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData);
        }

        // ? Configuration commands
        if (configurationCommands[command]) {
            await configurationCommands[command].execute(
                message,
                args,
                client,
                data,
                serverConfigsData,
                achievementsData,
                badgesData,
                saveData,
                saveAchievementsData,
                saveBadgesData,
                saveServerConfigsData
            );
        }

        if (ownerCommands[command]) {
            await ownerCommands[command].execute(message, client, serverConfigsData, ownerData, data, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData);
        }

    } catch (error) {
        console.error('An error occurred:', error);

        const serverId = message.guild.id;
        const loggingChannelId = serverConfigsData[serverId]?.loggingChannelId;
        const logChannel = client.channels.cache.get(loggingChannelId);

        if (message.channel.permissionsFor(client.user).has(PermissionsBitField.Flags.SendMessages)) {
            await message.channel.send('Contact Admin: **Error 28a**').catch(err => console.error('Failed to send message in original channel:', err));
        } else if (logChannel) {
            await logChannel.send(`Error 28a occurred in ${message.channel.name}, but the bot lacks permissions to send messages there.`)
                .catch(err => console.error('Failed to send message in log channel:', err));
        } else {
            console.error('Bot lacks permission to send messages and no log channel is set.');
        }

        throw error;
    }
});


async function manageRoles(member, level, guild, message) {
    const serverId = guild.id;
    ensureServerData(serverId); // * Ensure the server data structure exists

    const roles = data[serverId].roles; // * Fetch the roles for this server
    const milestoneLevels = data[serverId].milestoneLevels; // * Fetch milestone levels for this server
    const fixedserver = 1274891590992920628;

    try {
        // * Remove previous roles if the user reaches level 15
        if (data[serverId] === fixedserver && level === 15 || serverId === fixedserver && level === 15) {
            for (let lvl of milestoneLevels) {
                const roleId = roles[lvl];
                if (roleId && member.roles.cache.has(roleId)) {
                    await member.roles.remove(roleId);
                    console.log(`Removed role with ID ${roleId} from ${member.user.username}`);
                }
            }
        }

        // * Add the new role for the current level if it exists
        const roleId = roles[level];
        if (roleId) {
            const role = guild.roles.cache.get(roleId);
            if (role) {
                await member.roles.add(role);
                console.log(`Assigned role ${role.name} to ${member.user.username}`);
            } else {
                console.error(`Role with ID ${roleId} not found in the server.`);
            }
        } else {
            console.log(`No role configured for level ${level}`);
        }
    } catch (error) {
        console.error(`Failed to manage roles for ${member.user.username}:`, error);
        // await message.channel.send(`Contact Admin: **Error 71a**`);
    }
}

client.login(process.env.TEST_TOKEN);