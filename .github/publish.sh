#!/bin/bash
# Publish a new version of the extension to the marketplace

set -e
set -x

vsce login DivyanshuAgrawal <<< "$VSCE_PAT"

year=$(date +%Y)
month=$(date +%m)
epoch=$(date +%s)
version="$year.$month.$epoch"

vsce publish $version

echo "Published version $version"