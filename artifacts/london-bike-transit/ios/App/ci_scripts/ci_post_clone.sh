#!/bin/sh
set -e

# Add Homebrew paths (Intel and Apple Silicon Macs)
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/local/sbin:$PATH"

echo "=== Xcode Cloud post-clone: building Navelo web app ==="
echo "PATH=$PATH"
echo "HOME=$HOME"
whoami

# Ensure Node.js is available
if ! command -v node >/dev/null 2>&1; then
    echo "Node not found, installing via Homebrew..."
    brew install node
fi

node --version
npm --version

# Install pnpm (corepack was removed from Node.js 23+)
npm install -g pnpm@9
pnpm --version

cd "$CI_PRIMARY_REPOSITORY_PATH"

# Safety net: strip any local-path plugin lines from Package.swift
PACKAGE_SWIFT="artifacts/london-bike-transit/ios/App/CapApp-SPM/Package.swift"
sed -i '' '/CapacitorGeolocation/d'  "$PACKAGE_SWIFT"
sed -i '' '/CapacitorApp\b/d'        "$PACKAGE_SWIFT"
sed -i '' '/CapacitorShare/d'        "$PACKAGE_SWIFT"
sed -i '' '/CapacitorSplashScreen/d' "$PACKAGE_SWIFT"
sed -i '' '/CapacitorStatusBar/d'    "$PACKAGE_SWIFT"
sed -i '' '/CapacitorHaptics/d'      "$PACKAGE_SWIFT"
sed -i '' '/CapacitorKeyboard/d'     "$PACKAGE_SWIFT"

echo "=== Package.swift ==="
cat "$PACKAGE_SWIFT"

# Install workspace dependencies
pnpm install --no-frozen-lockfile

# Build the web app
cd artifacts/london-bike-transit
BUILD_TARGET=ios BASE_PATH=/ pnpm run build:ios

# Copy web bundle into the iOS public folder
mkdir -p ios/App/App/public
cp -r dist/public/* ios/App/App/public/

# Regenerate the workspace Package.resolved so Xcode Cloud sees it as
# up-to-date after pnpm install may have rewritten Package.swift.
echo "=== Resolving Swift package dependencies ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/artifacts/london-bike-transit/ios/App"
xcodebuild -resolvePackageDependencies \
  -workspace App.xcworkspace \
  -scheme App \
  -derivedDataPath /tmp/NaveloDerivedData \
  | tail -5
echo "=== Package.resolved after resolve ==="
cat App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved

echo "=== Post-clone complete ==="
