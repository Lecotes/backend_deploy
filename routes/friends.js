const express = require('express');
const pool = require('../db');

const router = express.Router();

// Send friend request
router.post('/request', async (req, res) => {
    const { senderId, receiverEmail } = req.body;

    try {
        const receiver = await pool.query('SELECT id FROM users WHERE email = $1', [receiverEmail]);
        if (!receiver.rows.length) return res.status(404).send('User not found');

        await pool.query(
            'INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2)',
            [senderId, receiver.rows[0].id]
        );

        res.status(200).send('Friend request sent');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error sending friend request');
    }
});

// Approve/Deny request
router.post('/request/respond', async (req, res) => {
    const { requestId, status } = req.body;

    try {
        // Update the friend request status
        const request = await pool.query(
            'UPDATE friend_requests SET status = $1 WHERE id = $2 RETURNING sender_id, receiver_id',
            [status, requestId]
        );

        if (request.rowCount === 0) {
            return res.status(404).send('Request not found');
        }

        const { sender_id, receiver_id } = request.rows[0];

        if (status === 'approved') {
            // Add both users to the `friends` table
            await pool.query(
                'INSERT INTO friends (user_id, friend_id) VALUES ($1, $2), ($2, $1)',
                [sender_id, receiver_id]
            );
        }

        res.status(200).send('Friend request processed');
    } catch (err) {
        console.error('Error processing request:', err);
        res.status(500).send('Error processing request');
    }
});


// Get friends list
router.get('/list', async (req, res) => {
    const { userId } = req.query;

    try {
        const friends = await pool.query(
            `SELECT u.username, u.email 
             FROM friends f 
             JOIN users u ON f.friend_id = u.id 
             WHERE f.user_id = $1`,
            [userId]
        );

        res.status(200).json(friends.rows);
    } catch (err) {
        console.error('Error fetching friends:', err);
        res.status(500).send('Error fetching friends');
    }
});


// Get pending friend requests
router.get('/requests', async (req, res) => {
    const { userId } = req.query;
  
    try {
      const requests = await pool.query(
        `SELECT friend_requests.id, 
                users.username AS senderUsername, 
                users.email AS senderEmail
         FROM friend_requests
         JOIN users ON friend_requests.sender_id = users.id
         WHERE friend_requests.receiver_id = $1 AND friend_requests.status = 'pending'`,
        [userId]
      );
  
      res.status(200).json(requests.rows);
    } catch (err) {
      console.error('Error fetching friend requests:', err);
      res.status(500).send('Error fetching friend requests');
    }
  });
  

module.exports = router;
