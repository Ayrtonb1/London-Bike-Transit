#!/bin/sh
set -e

echo "=== Xcode Cloud post-clone: building Navelo web app ==="

node --version
npm --version

# Install pnpm into a user-writable location (avoids permission issues)
npm config set prefix "$HOME/.npm-global"
export PATH="$HOME/.npm-global/bin:$PATH"
npm install -g pnpm@9
pnpm --version

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Safety net: remove any incompatible local-path plugins from Package.swift
PACKAGE_SWIFT="artifacts/london-bike-transit/ios/App/CapApp-SPM/Package.swift"
sed -i '' '/CapacitorGeolocation/d'  "$PACKAGE_SWIFT"
sed -i '' '/CapacitorApp\b/d'        "$PACKAGE_SWIFT"
sed -i '' '/CapacitorShare/d'        "$PACKAGE_SWIFT"
sed -i '' '/CapacitorSplashScreen/d' "$PACKAGE_SWIFT"
sed -i '' '/CapacitorStatusBar/d'    "$PACKAGE_SWIFT"
sed -i '' '/CapacitorHaptics/d'      "$PACKAGE_SWIFT"
sed -i '' '/CapacitorKeyboard/d'     "$PACKAGE_SWIFT"

echo "=== Package.swift after cleanup ==="
cat "$PACKAGE_SWIFT"

# Install workspace dependencies
pnpm install --no-frozen-lockfile

# Build the web app
cd artifacts/london-bike-transit
pnpm run build

# Copy web bundle into the iOS public folder
mkdir -p ios/App/App/public
cp -r dist/* ios/App/App/public/

echo "=== Post-clone complete ==="
