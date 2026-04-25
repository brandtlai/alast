module.exports = {
  apps: [{
    name: 'alast-api',
    script: 'dist/index.js',
    cwd: '/opt/alast/backend',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    restart_delay: 3000,
    max_restarts: 10,
    error_file: '/opt/alast/logs/api-error.log',
    out_file:   '/opt/alast/logs/api-out.log',
  }]
}
