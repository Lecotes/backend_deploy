const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const router = express.Router();

// Signup route
router.post('/signup', async (req, res) => {
  const { email, password, username } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING id',
      [email, hashedPassword, username]
    );

        // Save user in session
        req.session.userId = user.id; 
        req.session.username = user.username;
    
        // Set cookie for tracking
        res.cookie('userId', user.id, { 
          httpOnly: true,  
          secure: process.env.NODE_ENV === 'production', // Secure for production
          sameSite: 'None', 
          maxAge: 24 * 60 * 60 * 1000 // 1 day
        });

    res.status(201).json({ userId: result.rows[0].id });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).send('Error creating user');
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(400).send('User not found');

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(400).send('Invalid credentials');

    // Save user in session
    req.session.userId = user.id; 
    req.session.username = user.username;

    // Set cookie for tracking
    res.cookie('userId', user.id, { 
      httpOnly: true,  
      secure: process.env.NODE_ENV === 'production', // Secure for production
      sameSite: 'None', 
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.status(200).json({ userId: user.id, username: user.username });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).send('Error logging in');
  }
});


// Session route
router.get('/session', (req, res) => {
  if (req.session.userId) {
    res.status(200).json({ userId: req.session.userId, username: req.session.username });
  } else {
    res.status(401).send('Not logged in');
  }
});


// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error logging out:', err);
      return res.status(500).send('Error logging out');
    }
    res.status(200).send('Logged out');
  });
});

module.exports = router;
