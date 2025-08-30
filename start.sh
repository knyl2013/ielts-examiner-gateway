#!/bin/bash
set -ex
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
eval "$(cat ~/.bashrc | tail -n +10)"
nvm install 20.19.0 
nvm use 20.19.0
pnpm install
pnpm env use --global lts
pnpm dev