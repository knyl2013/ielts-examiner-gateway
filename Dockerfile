FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./

ENV PNPM_HOME="/root/.local/share/pnpm"

ENV PATH="$PNPM_HOME:$PATH"

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

RUN pnpm add -g pm2

EXPOSE 3000 

CMD ["pm2-runtime", "ecosystem.config.cjs"]