const localtunnel = require('localtunnel');
const { spawn } = require('child_process');

// Start the express server
const server = spawn('npm', ['start'], { shell: true });

server.stdout.on('data', data => process.stdout.write(data));
server.stderr.on('data', data => process.stderr.write(data));

(async () => {
  try {
    const tunnel = await localtunnel({ port: 3000 });
    console.log(`\n========================================================`);
    console.log(`WEBHOOK URL:  ${tunnel.url}/webhook`);
    console.log(`VERIFY TOKEN: aurel_globe_secret_123`);
    console.log(`========================================================\n`);

    tunnel.on('close', () => {
      console.log('Tunnel closed');
    });
  } catch (err) {
    console.error("Error starting localtunnel:", err);
  }
})();
