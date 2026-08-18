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

# Build the web app — set iOS env vars explicitly so PORT is not required
cd artifacts/london-bike-transit
BUILD_TARGET=ios BASE_PATH=/ pnpm run build:ios

# Copy web bundle into the iOS public folder
# Vite outputs to dist/public/ (matching webDir in capacitor.config.ts)
mkdir -p ios/App/App/public
cp -r dist/public/* ios/App/App/public/

# Write Package.resolved to match exactly what Package.swift contains after
# the sed processing above. This is deterministic and avoids relying on
# xcodebuild -resolvePackageDependencies inside a CI pre-clone script.
echo "=== Writing Package.resolved ==="
cd "$CI_PRIMARY_REPOSITORY_PATH/artifacts/london-bike-transit/ios/App"

PKG_VERSION=$(grep -o 'exact: "[^"]*"' CapApp-SPM/Package.swift | sed 's/exact: "//;s/"//')
echo "Detected capacitor-swift-pm version: $PKG_VERSION"

case "$PKG_VERSION" in
  "8.4.1") PKG_SHA="2231987d85b8b0b289320b1d0947b4ae8345cde4" ;;
  "8.3.1") PKG_SHA="f1a8fadf1437c23b825c818fb6509c9dbbae2f61" ;;
  *)
    echo "Unknown capacitor-swift-pm version '$PKG_VERSION' — cannot write Package.resolved"
    exit 1
    ;;
esac

cat > App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved << EOF
{
  "pins" : [
    {
      "identity" : "capacitor-swift-pm",
      "kind" : "remoteSourceControl",
      "location" : "https://github.com/ionic-team/capacitor-swift-pm.git",
      "state" : {
        "revision" : "$PKG_SHA",
        "version" : "$PKG_VERSION"
      }
    }
  ],
  "version" : 3
}
EOF

echo "=== Package.resolved written ==="
cat App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved

echo "=== Post-clone complete ==="
