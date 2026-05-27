#!/bin/sh
set -e

echo "=== Xcode Cloud post-clone: building Navelo web app ==="

node --version
npm --version

# Install pnpm via npm (Node is pre-installed on Xcode Cloud)
npm install -g pnpm@9

export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

pnpm --version

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Install workspace dependencies
pnpm install --no-frozen-lockfile

# Build the web app
cd artifacts/london-bike-transit
pnpm run build

# Copy web bundle into the iOS public folder
mkdir -p ios/App/App/public
cp -r dist/* ios/App/App/public/

echo "=== Post-clone complete ==="
