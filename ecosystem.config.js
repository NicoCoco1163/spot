module.exports = {
  apps: [
    {
      name: 'spot',
      script: './.output/server/index.mjs',
      env: {
        NODE_ENV: 'production',
        PORT: 8066,
        DATABASE_URL: '/home/suijiwudao/sqlite.db',
      },
      log_file: './logs/spot.log',
      out_file: './logs/spot-out.log',
      error_file: './logs/spot-error.log',
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
}
