#!/usr/bin/env bash

#######################################################################################################################
# Set up development environment
#######################################################################################################################

# Set strict mode for bash
set -euo pipefail

# Set strict mode for bash
set -euo pipefail

# Get the absolute path of the script directory and project root
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "${script_dir}/../.." && pwd)"

# Change the working directory to the project root
cd "${project_dir}" || exit 1

# Load ANSI color escape sequences
source tool/dev/bash_utils/ansi-colors.sh

#######################################################################################################################

echo "${MESSAGE_COLOR}Skipping worktree tracking for ${VALUE_COLOR}node_modules/.package-lock.json${MESSAGE_COLOR}...${NO_COLOR}"
set -x
git update-index --skip-worktree node_modules/.package-lock.json
{ set +x; } 2>/dev/null
echo

echo "${MESSAGE_COLOR}Setting git hooks path to ${VALUE_COLOR}.husky${MESSAGE_COLOR}...${NO_COLOR}"
set -x
git config core.hooksPath .husky
{ set +x; } 2>/dev/null
echo

echo "${MESSAGE_COLOR}Installing dependencies...${NO_COLOR}"
set -x
npm install
{ set +x; } 2>/dev/null
echo

echo "${MESSAGE_COLOR}Setting up permissions for scripts...${NO_COLOR}"
set -x
chmod +x .husky/*
chmod +x tool/dev/*.sh
{ set +x; } 2>/dev/null
echo

echo "${MESSAGE_COLOR}Updating minor dependencies...${NO_COLOR}"
set -x
npm run dependency-management:update-minor-dependencies
{ set +x; } 2>/dev/null
echo



