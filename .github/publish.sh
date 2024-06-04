#!/bin/bash
# Publish a new version of the extension to the marketplace

# IF no pat exit
if [ -z "$VSCE_PAT" ]; then
  echo "VSCE_PAT is not set. Exiting."
  exit 1
fi

set -e
set -x

year=$(date +%Y)
month=$(date +%-m)
epoch=$(date +%s)
version="$year.$month.$epoch"

vsce publish --allow-star-activation --no-git-tag-version $version 

echo "Published version $version"