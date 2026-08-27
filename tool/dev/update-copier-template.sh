#!/usr/bin/env bash

#######################################################################################################################
# Update Copier template
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

echo "${MESSAGE_COLOR}Updating Copier template...${NO_COLOR}"
set -x
copier update --vcs-ref main --defaults
{ set +x; } 2>/dev/null
echo

# If there are changes, add them to git
if ! git diff --quiet; then
  echo "${MESSAGE_COLOR}Adding changes to git...${NO_COLOR}"
  set -x
  git add . -A
  { set +x; } 2>/dev/null
  echo
fi
