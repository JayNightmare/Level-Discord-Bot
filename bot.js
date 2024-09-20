const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, ActivityType, REST, Routes, SlashCommandBuilder } = require('discord.js');
const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('@discordjs/builders');
require('dotenv').config();
const { log } = require('console');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });
const rest = new REST({ version: '10' }).setToken(process.env.TEST_TOKEN);

// ? Load command modules
const adminCommands = require('./commands/admin/admin_commands.js');
const communityCommands = require('./commands/community/community_commands');
const configurationCommands = require('./commands/configuration/configuration_commands.js');
const ownerCommands = require('./commands/owner/owner_commands.js');

const { 
        // User DB:
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
} = require("./commands/utils.js");

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

    // //

    new SlashCommandBuilder()
    .setName('topgg')
    .setDescription('Post stats to topgg'),
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
                // console.log(`Successfully registered commands for guild: ${guild.id}`);
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
    const serverId = interaction.guild.id;
    const userId = interaction.member.id;

    const serverConfigsData = await getServerConfigsData(serverId);
    const badgesData = await getUserBadgesFromDB(serverId, userId);
    const ownerData = await getOwnerData(serverId, userId);
    const data = await getUserData(serverId, userId);

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
        await communityCommands.slashProfile.execute(interaction, data, badgesData, saveData);
    }

    // //

    // * Set Bio
    if (commandName === 'setbio') {
        await communityCommands.slashSetBio.execute(interaction, data, badgesData, saveData);
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

    if (commandName === 'topgg') {
        await ownerCommands.topgg.execute(interaction, client);
    }

    // * 

    if (!interaction.isStringSelectMenu()) return;

    if (interaction.customId === 'help_menu') {
        // const serverId = interaction.guild.id;
        const prefixFinder = serverConfigsData.prefix;
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
});

client.on('guildCreate', async (guild) => {
    const serverId = guild.id;

    // Fetch all members of the guild
    await guild.members.fetch(); // Ensure members are cached

    // Ensure server data is initialized
    await ensureServerData(serverId, guild);

    // Loop through each member in the guild
    guild.members.cache.forEach(async (member) => {
        const userId = member.id;

        // Ensure the user data exists for this user
        await ensureUserData(serverId, userId);
    });

    // Store owner and member information in the database
    const ownerId = guild.ownerId;
    const memberCount = guild.memberCount;

    await saveOwnerData(serverId, ownerId, memberCount);
});

// ! Message handling
client.on('messageCreate', async (message) => {
    const guild = message.guild;
    const serverId = guild.id;
    const userId = message.author.id;
    const ownerId = guild.ownerId;
    const memberCount = guild.memberCount;

    let serverConfigsData = await getServerConfigsData(serverId);
    let userData = await getUserData(serverId, userId);
    let rolesData = await getRolesData(serverId);
    let badgesData = await getAllBadges(serverId, userId);
    let ownerData = await getOwnerData(serverId, userId);
    let milestoneLevelsData = await getMilestoneLevels(serverId);

    try {
        // console.log("Message sent");
        if (!guild || message.author.bot) return;

        await ensureServerData(serverId, guild, userId);
        serverConfigsData = await getServerConfigsData(serverId);  // Fetch again after initialization
        
        if (!userData) {
            await ensureUserData(serverId, userId);
            userData = await getUserData(serverId, userId);  // Fetch again after initialization
        }
        
        if (!ownerData) {
            await saveOwnerData(serverId, ownerId, memberCount);
            ownerData = await getOwnerData(serverId, ownerId, memberCount);
        }

        const member = guild.members.cache.get(userId);
        const prefix = serverConfigsData.prefix || "!";

        // Handle XP and leveling
        if (!message.content.startsWith(prefix)) {
            const now = Date.now();
            const cooldowns = new Map();
            const cooldownAmount = 1; // Cooldown set to 1 minute

            if (cooldowns.has(userId)) {
                const expirationTime = cooldowns.get(userId) + cooldownAmount;
                if (now < expirationTime) {
                    const timeLeft = (expirationTime - now) / 1000;
                    console.log(`User ${message.author.username} is on cooldown. ${timeLeft.toFixed(1)} seconds remaining.`);
                    return;
                }
            }

            cooldowns.set(userId, now);

            // Gain XP
            const xpGain = Math.floor(Math.random() * 5) + 5; // Gain 5-10 XP per message
            userData.totalXp += xpGain;  // This tracks all XP gained across all levels.
            userData.xp += xpGain;  // This tracks XP towards the next level.

            const level = userData.level;
            const baseMultiplier = 100;
            const scalingFactor = 1.1;

            const xpNeededForCurrentLevel = Math.floor(level * baseMultiplier * Math.pow(scalingFactor, level));
            const xpNeededForNextLevel = Math.floor((level + 1) * baseMultiplier * Math.pow(scalingFactor, level + 1));

            const xpForNextLevel = xpNeededForNextLevel - xpNeededForCurrentLevel;

            // Level-up logic
            if (userData.xp >= xpForNextLevel) {
                userData.level++;
                userData.xp = 0;

                console.log(`User leveled up to ${userData.level}`);

                // Send level-up message
                if (await isMilestoneLevel(serverId, userData.level)) {
                    console.log(`User reached a milestone level: ${userData.level}`);
                    message.channel.send(`🎉 Congrats <@${message.author.id}>! You've reached level ${userData.level}, a milestone level!`);
                } else {
                    message.channel.send(`${message.author.username} leveled up to level ${userData.level}!`);
                }                
            }
            
            // Handle role and badge updates if necessary
            await manageRoles(member, userData.level, guild, message);
            await manageBadges(serverId, userData.level, member, message);

            await saveData(serverId, userId, userData);
            return;
        }

        // Command handling if the message starts with a prefix
        const args = message.content.slice(prefix.length).trim().split(/ +/g);
        const command = args.shift().toLowerCase();

        // Check admin commands
        // * NEW FIXED
        if (adminCommands[command]) {
            await adminCommands[command].execute(message, args, client, userData, serverConfigsData, milestoneLevelsData);
        }

        // Check community commands
        if (communityCommands[command]) {
            await communityCommands[command].execute(message, args, userData, badgesData, saveData);
        }

        // Check configuration commands
        // * NEW FIXED
        if (configurationCommands[command]) {
            await configurationCommands[command].execute(message, args, client);
        }

        // Check owner commands
        // * NEW FIXED
        if (ownerCommands[command]) {
            await ownerCommands[command].execute(message, client, serverConfigsData, ownerData);
        }
        
    } catch (error) {
        console.error('An error occurred:', error);

        const loggingChannelId = serverConfigsData.loggingChannelId;
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
    try {
        // Fetch roles for the specific level from the database
        const rolesToAdd = await getRolesForLevel(serverId, level);
        console.log(`Roles to add for level ${level}:`, rolesToAdd);  // Log the roles to add

        // Add the new role for the current level if it exists
        if (rolesToAdd.length > 0) {
            for (let roleId of rolesToAdd) {
                // Ensure we are using a raw role ID (remove mention formatting if any)
                roleId = roleId.replace(/[<@&>]/g, ''); // Strip out any <@& or > from the role ID

                const role = guild.roles.cache.get(roleId);
                if (role) {
                    console.log(`Assigning role: ${role.name} to ${member.user.username}`);
                    await member.roles.add(role);
                } else {
                    console.error(`Role with ID ${roleId} not found in the server.`);
                }
            }
        } else {
            console.log(`No roles configured for level ${level}`);
        }
    } catch (error) {
        console.error(`Failed to manage roles for ${member.user.username}:`, error);
        const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle(`Unable To Assign Role`)
                .addFields(
                    { name: "Reason 1", value: "Move me above roles", inline: false },
                    { name: "Reason 2", value: "Missing Permissions - Add Manage Roles", inline: false }
                )
                .setFooter({ text: "If you've done both and it's still not working, contact jaynightmare", iconURL: message.client.user.displayAvatarURL() });

        return message.channel.send({ embeds: [embed] });
    }
}

async function manageBadges(serverId, level, member, message) {
    try {
        // Fetch all badges associated with the server
        const serverBadges = await getServerBadgesFromDB(serverId);

        // Loop through all server badges and check if the user qualifies for any
        for (const badge of serverBadges) {
            if (badge.level === level) {  // If badge is linked to this level
                // Check if the user already has this badge
                const userBadges = await getUserBadgesFromDB(serverId, member.user.id);
                const hasBadge = userBadges.some(userBadge => userBadge.badgeName === badge.badgeName);

                if (!hasBadge) {
                    await addUserBadge(serverId, member.user.id, badge.badgeName, badge.badgeEmoji);

                    // Notify the user about the new badge
                    await message.channel.send(`🎉 Congrats <@${member.user.id}>! You've earned the ${badge.badgeEmoji} **${badge.badgeName}** badge for reaching level ${level}!`);
                }
            }
        }
    } catch (error) {
        console.error("Error managing badges:", error);
    }
}

client.login(process.env.TEST_TOKEN);