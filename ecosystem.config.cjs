module.exports = {
  apps: [
    {
       name: 'dashboard-backend',
      cwd: './backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        BIND_HOST: '127.0.0.1',
        CORS_ORIGIN: '*',
      },
    },
  ],
};
