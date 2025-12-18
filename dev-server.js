const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const port = 9000;

// Serve static files from the project root
app.use(express.static(path.join(__dirname)));

// API proxy to PHP built-in server
app.use('/api', (req, res) => {
  // In development, we'll let Laragon handle PHP requests
  // This is just a placeholder
  res.status(501).json({ error: 'API requests should be handled by Laragon' });
});

app.listen(port, () => {
  console.log(`Development server running at http://localhost:${port}`);
  console.log(`API requests will be handled by Laragon at http://localhost/clean-project/api`);
});