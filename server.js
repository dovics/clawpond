const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');

// Check if AUTH_TOKEN is set
if (!process.env.AUTH_TOKEN) {
  // Generate a random token (64 hex characters)
  const generatedToken = crypto.randomBytes(32).toString('hex');

  // Set the token for the current process
  process.env.AUTH_TOKEN = generatedToken;

  // Output the token to stdout
  console.log('==========================================');
  console.log('AUTH_TOKEN not configured. Generated token:');
  console.log('==========================================');
  console.log('');
  console.log(generatedToken);
  console.log('');
  console.log('==========================================');
  console.log('Use this token to access the application.');
  console.log('To persist this token, set AUTH_TOKEN environment variable.');
  console.log('==========================================');
} else {
  console.log('Using existing AUTH_TOKEN from environment: ', process.env.AUTH_TOKEN);
}

// Start the Next.js standalone server
console.log('Starting Next.js standalone server...');

// Import and start the standalone server
require('./server.js');
