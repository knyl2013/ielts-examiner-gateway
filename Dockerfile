FROM node:20.19.0-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

RUN pnpm add -g pm2

COPY . .

EXPOSE 3000

CMD ["pm2", "startOrRestart", "ecosystem.config.cjs"]