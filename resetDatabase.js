const pool = require('./db');

const dropTables = `
DROP TABLE IF EXISTS friends CASCADE;
DROP TABLE IF EXISTS friend_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS texts CASCADE;
DROP TABLE IF EXISTS text_permissions CASCADE;
DROP TABLE IF EXISTS annotation_replies CASCADE;
DROP TABLE IF EXISTS annotation_votes CASCADE;
DROP TABLE IF EXISTS annotations CASCADE;
`;

const createTables =  `

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    username VARCHAR(255) NOT NULL
);

CREATE TABLE friend_requests (
    id SERIAL PRIMARY KEY,
    sender_id INT REFERENCES users(id),
    receiver_id INT REFERENCES users(id),
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE friends (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    friend_id INT REFERENCES users(id)
);

CREATE TABLE texts (
    id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE text_permissions (
    id SERIAL PRIMARY KEY,
    text_id INT REFERENCES texts(id),
    user_id INT REFERENCES users(id)
);

CREATE TABLE annotations (
    id SERIAL PRIMARY KEY,
    text_id INT REFERENCES texts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    content TEXT NOT NULL,
    range_start INT NOT NULL,
    range_end INT NOT NULL,
    votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (text_id, range_start, range_end) -- Prevent duplicate annotations
);

CREATE TABLE annotation_votes (
    id SERIAL PRIMARY KEY,
    annotation_id INT REFERENCES annotations(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    vote_value INT CHECK (vote_value IN (1, -1)),
    UNIQUE (annotation_id, user_id) -- Ensure one vote per user
);

CREATE TABLE annotation_replies (
    id SERIAL PRIMARY KEY,
    annotation_id INT REFERENCES annotations(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    content TEXT NOT NULL,
    votes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE reply_votes (
    id SERIAL PRIMARY KEY,
    reply_id INT REFERENCES annotation_replies(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id),
    vote_value INT CHECK (vote_value IN (1, -1)),
    UNIQUE (reply_id, user_id) -- Ensure one vote per user
);
`;

const resetDatabase = async () => {
    const client = await pool.connect();

    try {
        console.log('Dropping existing tables...');
        await client.query(dropTables);

        console.log('Creating new tables...');
        await client.query(createTables);

        console.log('Database reset complete.');
    } catch (err) {
        console.error('Error resetting the database:', err);
    } finally {
        client.release();
        pool.end();
    }
};

resetDatabase();
