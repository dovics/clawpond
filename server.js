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

// Get the mode from command line arguments
const mode = process.argv[2] || 'start';

if (mode === 'dev') {
  // Development mode: use next dev
  console.log('Starting Next.js in development mode...');
  const nextBin = path.join(__dirname, 'node_modules', '.bin', 'next');
  const devProcess = spawn('node', [nextBin, 'dev'], {
    stdio: 'inherit',
    env: { ...process.env }
  });

  devProcess.on('exit', (code) => {
    process.exit(code);
  });
} else {
  // Production mode: use standalone server
  console.log('Starting Next.js standalone server...');

  try {
    // The standalone server is at standalone-server.js (Next.js generated)
    // We load it to start the Next.js application
    const standaloneServerPath = path.join(__dirname, 'standalone-server.js');
    require(standaloneServerPath);
  } catch (err) {
    console.error('Standalone server not found. Please run: npm run build');
    console.error('Or use development mode: npm run dev');
    console.error('Error:', err.message);
    process.exit(1);
  }
}
