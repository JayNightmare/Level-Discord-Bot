const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = './json'; // Directory containing your JSON files

// Open the SQLite database
const db = new sqlite3.Database('./bot.db');

// Function to insert JSON data into SQLite
function insertDataIntoSQLite() {
    // Migrate users.json
    const usersData = JSON.parse(fs.readFileSync(`${path}/users.json`, 'utf8'));
    for (const serverId in usersData) {
        for (const userId in usersData[serverId].users) {
            const user = usersData[serverId].users[userId];
            db.run(
                `INSERT INTO users (serverId, userId, xp, totalXp, level, bio) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    serverId,
                    userId,
                    user.xp || 0,
                    user.totalXp || 0,
                    user.level || 1,
                    user.bio || ''
                ],
                (err) => {
                    if (err) {
                        console.error('Error inserting user data:', err.message);
                    }
                }
            );
        }
    }

    const milestoneLevelsData = JSON.parse(fs.readFileSync('./json/users.json', 'utf8'));
    for (const serverId in milestoneLevelsData) {
        const server = milestoneLevelsData[serverId];
        
        for (const level of server.milestoneLevels || []) {
            db.run(`INSERT INTO milestoneLevels (serverId, level) VALUES (?, ?)`, [serverId, level], (err) => {
                if (err) console.error('Error migrating milestone level:', err.message);
            });
        }
        
        for (const levelRequired in server.roles || {}) {
            const roleId = server.roles[levelRequired];  // Correct way to access the roleId
            db.run(`INSERT INTO roles (serverId, roleId, levelRequired) VALUES (?, ?, ?)`, 
                [serverId, roleId, levelRequired], (err) => {
                if (err) console.error('Error migrating role data:', err.message);
            });
        }
    }

    // Migrate serverConfigs.json
    const serverConfigsData = JSON.parse(fs.readFileSync(`${path}/serverConfigs.json`, 'utf8'));
    for (const serverId in serverConfigsData) {
        const config = serverConfigsData[serverId];
        db.run(
            `INSERT INTO serverConfigsData (serverId, name, blacklistedChannels, allowedChannel, loggingChannelId, prefix, requireConfirm) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                serverId,
                config.name,
                JSON.stringify(config.blacklistedChannels || []), // Store blacklistedChannels as a JSON string
                config.allowedChannel || null,
                config.loggingChannelId || null,
                config.prefix || '!',
                config.requireConfirm ? 1 : 0, // Convert boolean to integer (0 or 1)
            ],
            (err) => {
                if (err) {
                    console.error('Error inserting server config data:', err.message);
                }
            }
        );
    }

    // Migrate owner.json
    const ownerData = JSON.parse(fs.readFileSync(`${path}/owner.json`, 'utf8'));
    for (const serverId in ownerData) {
        const owner = ownerData[serverId];
        db.run(
            `INSERT INTO ownerData (serverId, ownerId, memberCount) 
             VALUES (?, ?, ?)`,
            [serverId, owner.ownerId, owner.memberCount],
            (err) => {
                if (err) {
                    console.error('Error inserting owner data:', err.message);
                }
            }
        );
    }
}

// Perform the migration and close the database
db.serialize(() => {
    insertDataIntoSQLite();
});

db.close((err) => {
    if (err) {
        return console.error('Error closing the database:', err.message);
    }
    console.log('Data migration complete and database connection closed.');
});
