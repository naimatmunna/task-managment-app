/**
 * PM2 process definition for production.
 *   pm2 start ecosystem.config.cjs --env production
 */
module.exports = {
  apps: [
    {
      name: 'mern-starter-api',
      script: 'src/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      env: { NODE_ENV: 'development' },
      env_production: { NODE_ENV: 'production' },
      out_file: 'logs/pm2-out.log',
      error_file: 'logs/pm2-error.log',
      merge_logs: true,
      time: true,
    },
  ],
};
