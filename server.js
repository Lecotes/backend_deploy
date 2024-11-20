const session = require('express-session');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const friendRoutes = require('./routes/friends');
const textRoutes = require('./routes/texts');
const annotationsRouter = require('./routes/annotations');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

app.use(
  cors({
    origin: 'http://localhost:3001', // Replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true, // Allow cookies and credentials
  })
);


// Add session middleware
app.use(
  session({
      secret: process.env.SESSION_SECRET, // Use environment variable for secret key
      resave: false, // Don't save session if it hasn't been modified
      saveUninitialized: false, // Don't save empty sessions
      cookie: { secure: false }, // Set to true if using HTTPS
  })
);



// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/texts', textRoutes);
app.use('/api/annotations', annotationsRouter);


// Serve React frontend
app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
