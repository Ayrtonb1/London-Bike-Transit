#!/bin/sh
set -e

echo "=== Xcode Cloud post-clone: installing deps and building Navelo web app ==="

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Install Node.js and pnpm
brew install node
npm install -g pnpm

# Install all workspace dependencies (so node_modules exist for Swift PM)
pnpm install --no-frozen-lockfile

# Build the web app
cd artifacts/london-bike-transit
pnpm run build

# Copy the built web bundle into the iOS Capacitor public folder
mkdir -p ios/App/App/public
cp -r dist/* ios/App/App/public/

# Clean up Package.swift — remove plugins incompatible with Capacitor 8 swift-pm
PACKAGE_SWIFT="$CI_PRIMARY_REPOSITORY_PATH/artifacts/london-bike-transit/ios/App/CapApp-SPM/Package.swift"
sed -i '' '/CapacitorGeolocation/d' "$PACKAGE_SWIFT"
sed -i '' '/CapacitorApp\b/d'        "$PACKAGE_SWIFT"
sed -i '' '/CapacitorShare/d'        "$PACKAGE_SWIFT"
sed -i '' '/CapacitorSplashScreen/d' "$PACKAGE_SWIFT"
sed -i '' '/CapacitorStatusBar/d'    "$PACKAGE_SWIFT"

echo "=== Post-clone complete — node_modules and web bundle ready ==="
