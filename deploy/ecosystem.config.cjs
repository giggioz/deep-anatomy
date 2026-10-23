/**
 * PM2 sulla VPS: un solo processo, il server Fastify che serve anche la web app (apps/web/dist).
 * Ascolta su 127.0.0.1:PORT (dal .env); davanti c'è nginx con HTTPS (deploy/nginx-deep-anatomy.conf).
 */
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'deep-anatomy',
      cwd: path.join(__dirname, '..'),
      script: 'apps/server/src/index.ts',
      interpreter: 'node',
      node_args: '--import tsx',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      time: true,
    },
  ],
};
