const { spawn } = require('child_process');
const crypto = require('crypto');

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
  console.log('Using existing AUTH_TOKEN from environment');
}

// Start Next.js
const nextCommand = process.argv[2] || 'dev';
const args = process.argv.slice(3);

const child = spawn('npx', ['next', nextCommand, ...args], {
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
