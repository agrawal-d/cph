#!/bin/bash
# Publish a new version of the extension to the marketplace

# IF no pat exit
if [ -z "$VSCE_PAT" ]; then
  echo "VSCE_PAT is not set. Exiting."
  exit 1
fi

# Print first 3 and last 3 chars of PAT
echo "VSCE_PAT: $(echo $VSCE_PAT | cut -c1-3)***$(echo $VSCE_PAT | rev | cut -c1-3 | rev)"

set -e
set -x

year=$(date +%Y)
month=$(date +%-m)
epoch=$(date +%s)
version="$year.$month.$epoch"

vsce publish $version

echo "Published version $version"