const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('@discordjs/builders');
require('dotenv').config();
const fs = require('fs');
const { log } = require('console');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });
const rest = new REST({ version: '10' }).setToken(process.env.TEST_TOKEN);

// ? Load Data
const usersFilePath = 'json/users.json';
const achievementsFilePath = 'json/achievements.json';
const badgesFilePath = 'json/badges.json';
const serverConfigsFilePath = 'json/serverConfigs.json';
const ownerFilePath = 'json/owner.json';

// ? Load data from the file
let data = {};
let achievementsData;
let badgesData = {};
let serverConfigsData = {};
let ownerData = {};

// ? Load command modules
const adminCommands = require('./commands/admin/admin_commands.js');
const communityCommands = require('./commands/community/community_commands');
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


const commands = [
    // * Announce - Server Maintanance
    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send a maintenance message to all servers'),

    // //

    // * Help
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('See all the commands available in the bot'),

    // //

    // * Profile
    new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your profile or another user\'s profile')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user whose profile you want to view')
                .setRequired(false)),

    // //

    // * Set Bio
    new SlashCommandBuilder()
        .setName('setbio')
        .setDescription('Set your bio')
        .addStringOption(option => 
            option.setName('bio')
                .setDescription('The bio to set')
                .setRequired(true)),

    // //

    // * Leaderboard
    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server leaderboard'),

    // //

    // * Vote
    new SlashCommandBuilder()
        .setName('vote')
        .setDescription('Vote for the bot and earn rewards'),
    
    // //

    // * Check Roles
    new SlashCommandBuilder()
        .setName('checkroles')
        .setDescription('Check your current roles'),

    // //

    // * Rank
    new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your current rank and XP'),
];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    try {
        console.log('Started refreshing application (/) commands.');

        // Fetch all guilds the bot is in
        const guilds = await client.guilds.fetch();

        guilds.forEach(async (guild) => {
            try {
                // Register slash commands for each guild dynamically
                await rest.put(
                    Routes.applicationGuildCommands(client.user.id, guild.id),
                    { body: commands }
                );
                console.log(`Successfully registered commands for guild: ${guild.id}`);
            } catch (error) {
                console.error(`Error registering commands for guild: ${guild.id}`, error);
            }
        });

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
});

client.on('interactionCreate', async interaction => {
    const { commandName } = interaction;

    // //

    // * Help
    if (commandName === 'help') {
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
    
            if (interaction.member.id === process.env.OWNER) {
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
    
            await interaction.reply({ embeds: [optionEmbed], components: [row] });
        } catch (error) {
            console.error('An error occurred while creating the help embed:', error);
            interaction.reply('An error occurred while generating the help message. Please contact the admin. **Error code: 0hb**');
        }
    }

    // //

    // * Announce
    if (interaction.member.id === process.env.OWNER) { if (commandName === 'announce') { await notifyUpdate(client); } }

    // //

    // * Profile
    if (commandName === 'profile') {
        await communityCommands.slashProfile.execute(interaction, data, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData);
    }

    // //

    // * Set Bio
    if (commandName === 'setbio') {
        await communityCommands.slashSetBio.execute(interaction, data, achievementsData, badgesData, saveData);
    }

    // //

    // * Leaderboard
    if (commandName === 'leaderboard') {
        await communityCommands.slashLeaderboard.execute(interaction, data, serverConfigsData, saveData);
    }

    // //

    // * Vote
    if (commandName === 'vote') {
        await communityCommands.slashVote.execute(interaction, client);
    }

    // //

    // * Check Roles
    if (commandName === 'checkroles') {
        await communityCommands.slashCheckRoles.execute(interaction);
    }

    // //

    // * Rank
    if (commandName === 'rank') {
        await communityCommands.slashRank.execute(interaction, client, saveData);
    }

    // * 

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
                    • \`${prefixFinder}rmxp\` - Remove XP from a user.\n
                    • \`${prefixFinder}addachievement\` - Add an achievement to a user.\n
                    • \`${prefixFinder}rmachievement\` - Remove an achievement from a user.\n
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
                    • \`${prefixFinder}${process.env.OWNER3}\`\n
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

client.on('guildCreate', async (guild) => {
    const serverId = guild.id;

    // Fetch all members of the guild
    await guild.members.fetch(); // Ensure members are cached

    guild.members.cache.forEach(member => {
        const userId = member.id;

        // Ensure the user data exists for this user
        ensureUserData(serverId, userId);
        ensureServerData(serverId, guild);

        if (!data[serverId]) {
            data[serverId] = {
                users: {},  // Initialize users object for the server
                roles: {},
                milestoneLevels: []
            };
        }

        // Ensure that the users data is initialized
        if (!data[serverId].users[userId]) {
            data[serverId].users[userId] = {
                xp: 0,
                level: 1,
                bio: "",
                roles: [],
                totalXp: 0,
                lastVote: 0
            };
        }

        // Ensure achievements data exists for this user
        if (!achievementsData[serverId]) {
            achievementsData[serverId] = { users: {} };
        }
        if (!achievementsData[serverId].users[userId]) {
            achievementsData[serverId].users[userId] = { achievements: [] };
        }

        // Ensure badges data exists for this user
        if (!badgesData[serverId]) {
            badgesData[serverId] = { badges: {}, users: {} };
        }
        if (!badgesData[serverId].users[userId]) {
            badgesData[serverId].users[userId] = [];
        }
    });

    // Store owner and member information in owner.json
    ownerData[serverId] = {
        ownerId: guild.ownerId,  // Use the guild object to get the owner ID
        memberCount: guild.memberCount  // Use the guild object to get the member count
    };

    // Write the changes to the files
    try {
        fs.writeFileSync('./json/owner.json', JSON.stringify(ownerData, null, 4));
        fs.writeFileSync('./json/achievements.json', JSON.stringify(achievementsData, null, 4));
        fs.writeFileSync('./json/badges.json', JSON.stringify(badgesData, null, 4));
        fs.writeFileSync('./json/users.json', JSON.stringify(data, null, 4));

        console.log(`Successfully updated data for guild: ${guild.name}`);
    } catch (error) {
        console.error('Error writing to file:', error);
    }
    console.log('Owner Data:', ownerData);
    console.log('Achievements Data:', achievementsData);
    console.log('Badges Data:', badgesData);
    console.log('User Data:', data);

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

        const member = guild.members.cache.get(userId);

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
                    console.log(`User ${message.author.username} is on cooldown. ${timeLeft.toFixed(1)} seconds remaining.`);
                    return; // User is on cooldown, so do not award XP
                }
            }

            cooldowns.set(userId, now);

            const user = data[serverId].users[userId];
            const xpGain = Math.floor(Math.random() * 5) + 5; // Gain 5-10 XP per message
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
                if (data[serverId].milestoneLevels.includes(level)) {
                    message.channel.send(`🎉 Congrats <@${message.author.id}>! You've reached level ${level}! This is a milestone level!`);
                } else {
                    message.channel.send(`${message.author.username} leveled up to level ${level}!`);
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
            await configurationCommands[command].execute(message, args, client, data, serverConfigsData, achievementsData, badgesData, saveData, saveAchievementsData, saveBadgesData, saveServerConfigsData);
        }

        if (ownerCommands[command]) {
            await ownerCommands[command].execute(message, client, serverConfigsData, ownerData);
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
