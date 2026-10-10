#!/usr/bin/env bash
set -euo pipefail
cd /workspace/InfoSys_ViewGP_Web
node -e 'if (Number(process.versions.node.split(".")[0]) < 24) throw new Error("Node.js 24+ required")'
# Install from Microsoft's official HTTPS endpoint only when the SDK is absent.
if [ ! -x /workspace/.tools/dotnet/dotnet ]; then
  curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/viewx-dotnet-install.sh
  bash /tmp/viewx-dotnet-install.sh --version 10.0.401 --install-dir /workspace/.tools/dotnet --no-path
fi
export PATH="/workspace/.tools/dotnet:$PATH"
export DOTNET_CLI_HOME=/workspace/.tools/dotnet-home
export NUGET_PACKAGES=/workspace/.tools/nuget
export DOTNET_CLI_TELEMETRY_OPTOUT=1
npm ci --cache /tmp/viewx-npm-cache --no-audit --no-fund
npm run build
npm test
dotnet restore tests/ViewX.Server.Tests/ViewX.Server.Tests.csproj --locked-mode
dotnet build server/ViewX.Server.csproj --no-restore
dotnet test tests/ViewX.Server.Tests/ViewX.Server.Tests.csproj --no-restore
