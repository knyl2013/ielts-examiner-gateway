module.exports = {
  apps: [
    {
      name: 'ielts-examiner-gateway',
      script: 'build/index.js',
      cwd: './',
      env: {
         NODE_ENV: 'production',
         PORT: 3000,
      }
    },
  ],
};