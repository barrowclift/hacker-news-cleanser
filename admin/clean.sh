#!/bin/bash

export ADMIN_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
source "${ADMIN_DIR}"/init.sh

# Confirm if they really want to clean MongoDB's data store
echo "You are about to clean all Hacker News Cleanser data, and logs. This CANNOT be undone."
read -p "Are you absolutely sure you want to proceed? (y/n): " -r
if [[ $REPLY =~ ^[Yy]$ ]]
then
    "${ADMIN_DIR}"/cleanMongoDb.sh 1
    "${ADMIN_DIR}"/cleanLogs.sh
    echo -e "\n${GREEN}All Hacker News Cleanser data & logs deleted${RESET}"
fi
