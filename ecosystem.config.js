module.exports = {
  apps: [
    {
      name: 'varzeshsoft',
      script: './dist/main.js',
      watch: true,
      ignore_watch: ['opt', 'node_modules'],
      env: {
        NODE_ENV: 'production',
        PORT: 8090
      },
    },
  ],
};
