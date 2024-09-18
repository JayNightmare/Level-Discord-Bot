const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bot.db');

// Create tables if they don't exist
db.serialize(() => {
        // Create the users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
                serverId TEXT NOT NULL,
                userId TEXT NOT NULL,
                xp INTEGER DEFAULT 0,
                totalXp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                bio TEXT DEFAULT '',
                PRIMARY KEY (serverId, userId)
        );`);

        db.run(`CREATE TABLE IF NOT EXISTS roles (
                serverId TEXT NOT NULL,
                roleId TEXT NOT NULL,
                levelRequired INTEGER DEFAULT 0,
                PRIMARY KEY (serverId, levelRequired)
        );`);

        db.run(`CREATE TABLE IF NOT EXISTS milestoneLevels (
                serverId TEXT NOT NULL,
                level INTEGER NOT NULL,
                PRIMARY KEY (serverId)
        );`);

        // Create the userBadges table
        db.run(`CREATE TABLE IF NOT EXISTS userBadges (
                id  INTEGER
                serverId TEXT,
                userId TEXT,
                badgeName TEXT DEFAULT "' '", 
                badgeEmoji TEXT DEFAULT "' '", 
                level INTEGER,
                PRIMARY KEY (id AUTOINCREMENT)
        )`);

        // Create the serverBadges table
        db.run(`CREATE TABLE IF NOT EXISTS serverBadges (
                id  INTEGER
                serverId TEXT,
                badgeName TEXT DEFAULT "' '", 
                badgeEmoji TEXT DEFAULT "' '",
                level INTEGER,
                PRIMARY KEY (id AUTOINCREMENT)
        )`);

        // Create the server configurations table
        db.run(`CREATE TABLE IF NOT EXISTS serverConfigsData (
                serverId TEXT PRIMARY KEY,
                name TEXT,
                blacklistedChannels TEXT DEFAULT '[]',
                allowedChannel TEXT DEFAULT NULL,
                loggingChannelId TEXT DEFAULT NULL,
                prefix TEXT DEFAULT '!',
                requireConfirm INTEGER DEFAULT 0
        )`);

        // Create the owner data table
        db.run(`CREATE TABLE IF NOT EXISTS ownerData (
                serverId TEXT PRIMARY KEY,
                ownerId TEXT NOT NULL,
                memberCount INTEGER DEFAULT 0
        )`);
});

// Close the database after creating tables
db.close((err) => {
        if (err) {
                return console.error('Error closing the database:', err.message);
        }
        console.log('Database setup complete and connection closed.');
});
