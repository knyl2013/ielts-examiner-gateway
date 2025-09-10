FROM node:20-alpine AS builder

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

RUN pnpm build


FROM node:20-alpine AS production

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod

COPY --from=builder /app/.svelte-kit/output ./build

EXPOSE 3000

ENV HOST=0.0.0.0
ENV PORT=3000

CMD ["node", "/app/build/server/index.js"]