#!/bin/sh
set -e

echo "=== Xcode Cloud post-clone: building Navelo web app ==="

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Ensure Node.js is available
brew install node || true
node --version

# Install pnpm via standalone installer (avoids npm global permission issues)
curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=9 sh -
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
pnpm --version

# Install all workspace dependencies
pnpm install --no-frozen-lockfile

# Build the web app
cd artifacts/london-bike-transit
pnpm run build

# Copy the built web bundle into the iOS Capacitor public folder
mkdir -p ios/App/App/public
cp -r dist/* ios/App/App/public/

echo "=== Post-clone complete — node_modules and web bundle ready ==="
