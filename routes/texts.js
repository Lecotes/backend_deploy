const express = require('express');
const pool = require('../db');
const router = express.Router();

// Create a new text
router.post('/create', async (req, res) => {
    const { ownerId, title, content, sharedWith } = req.body;
  
    try {
      const result = await pool.query(
        'INSERT INTO texts (owner_id, title, content) VALUES ($1, $2, $3) RETURNING id',
        [ownerId, title, content]
      );
  
      const textId = result.rows[0].id;
  
      // If sharedWith is provided, map emails to user IDs and insert permissions
      if (sharedWith && sharedWith.length > 0) {
        const sharedUsers = await Promise.all(
          sharedWith.map(async (email) => {
            const user = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
            return user.rows.length > 0 ? user.rows[0].id : null;
          })
        );
  
        // Filter out invalid emails
        const validUserIds = sharedUsers.filter((id) => id !== null);
  
        if (validUserIds.length > 0) {
          const values = validUserIds.map((userId) => `(${textId}, ${userId})`).join(", ");
          await pool.query(`INSERT INTO text_permissions (text_id, user_id) VALUES ${values}`);
        }
      }
  
      res.status(201).send('Text created successfully');
    } catch (err) {
      console.error('Error creating text:', err);
      res.status(500).send('Error creating text');
    }
  });
  
// Get owned and shared texts
router.get('/', async (req, res) => {
  const { userId } = req.query;

  try {
    const ownedTexts = await pool.query(
      'SELECT * FROM texts WHERE owner_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    const sharedTexts = await pool.query(
      `SELECT t.* 
       FROM text_permissions tp
       JOIN texts t ON tp.text_id = t.id
       WHERE tp.user_id = $1
       ORDER BY t.created_at DESC`,
      [userId]
    );

    res.status(200).json({ owned: ownedTexts.rows, shared: sharedTexts.rows });
  } catch (err) {
    console.error('Error fetching texts:', err);
    res.status(500).send('Error fetching texts');
  }
});

// Get a specific text
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the text
    const text = await pool.query('SELECT * FROM texts WHERE id = $1', [id]);
    if (!text.rows.length) return res.status(404).json({ error: 'Text not found' });

    // Fetch the annotations with usernames
    const annotations = await pool.query(
      `SELECT a.*, u.username 
       FROM annotations a
       JOIN users u ON a.user_id = u.id
       WHERE a.text_id = $1 
       ORDER BY a.votes DESC, a.created_at ASC`,
      [id]
    );

    // Fetch the replies with usernames
    const replies = await pool.query(
      `SELECT r.*, u.username 
       FROM annotation_replies r
       JOIN users u ON r.user_id = u.id
       WHERE r.annotation_id IN (
         SELECT id FROM annotations WHERE text_id = $1
       )
       ORDER BY r.created_at ASC`,
      [id]
    );

    // Fetch shared permissions
    const permissions = await pool.query(
      `SELECT u.username, u.email 
       FROM text_permissions tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.text_id = $1`,
      [id]
    );

    // Return the full data
    res.status(200).json({
      text: text.rows[0],
      annotations: annotations.rows,
      replies: replies.rows,
      sharedWith: permissions.rows,
    });
  } catch (err) {
    console.error('Error fetching text:', err);
    res.status(500).json({ error: 'Error fetching text' });
  }
});

// Delete a specific text
// DELETE request handler in your backend
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM texts WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Text not found' });
    }
    res.status(200).json({ message: 'Text deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error('Error deleting text:', err);
    res.status(500).json({ error: 'Error deleting text' });
  }
});


module.exports = router;