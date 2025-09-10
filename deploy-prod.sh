#!/bin/sh
set -ex

export PNPM_HOME="/root/.local/share/pnpm"

export PATH="$PNPM_HOME:$PATH"

echo "Starting deployment..."

echo "Installing dependencies..."
pnpm install --force

echo "Building the application..."
pnpm build

echo "Installing PM2 globally..."
pnpm add -g pm2

echo "Starting or restarting the application with PM2..."
pm2 startOrRestart ecosystem.config.cjs

echo "✅ Deployment finished successfully!"
pm2 list # Show the status of the running app