module.exports = {
  apps: [
    {
      name: process.env.APP_NAME || 'spot',
      script: './.output/server/index.mjs',
      interpreter: 'bun',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 8066,
        DATABASE_URL: process.env.DATABASE_URL || '/home/suijiwudao/sqlite.db',
      },
      log_file: `./logs/${process.env.APP_NAME || 'spot'}.log`,
      out_file: `./logs/${process.env.APP_NAME || 'spot'}-out.log`,
      error_file: `./logs/${process.env.APP_NAME || 'spot'}-error.log`,
      time: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
}
