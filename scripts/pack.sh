#!/bin/sh
# Build dist/web-labels-<version>.zip from the files that Chrome needs.
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$root"
version=$(sed -n 's/^[[:space:]]*"version":[[:space:]]*"\([^"]*\)".*/\1/p' manifest.json | head -n 1)
[ -n "$version" ] || { echo 'Cannot read version from manifest.json' >&2; exit 1; }
out="dist/web-labels-$version.zip"
mkdir -p dist
rm -f "$out"
zip -q -r "$out" manifest.json LICENSE src assets/icons -x '*.DS_Store'
echo "$out"
