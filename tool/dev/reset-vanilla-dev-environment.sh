#!/usr/bin/env bash

#######################################################################################################################
# Set up vanilla development environment
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

echo "${MESSAGE_COLOR}Enabling worktree tracking for ${VALUE_COLOR}node_modules/.package-lock.json${MESSAGE_COLOR}...${NO_COLOR}"
set -x
git update-index --no-skip-worktree node_modules/.package-lock.json
{ set +x; } 2>/dev/null
echo

echo "${MESSAGE_COLOR}Resetting git hooks path to ${VALUE_COLOR}.git/hooks${MESSAGE_COLOR}...${NO_COLOR}"
set -x
git config core.hooksPath .git/hooks
{ set +x; } 2>/dev/null
echo

echo "${MESSAGE_COLOR}Resetting git repository to HEAD...${NO_COLOR}"
set -x
git reset --hard HEAD
{ set +x; } 2>/dev/null
echo
