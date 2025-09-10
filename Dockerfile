FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

RUN pnpm add -g pm2

EXPOSE 3000 

CMD ["pm2-runtime", "ecosystem.config.cjs"]