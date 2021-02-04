#!/bin/bash

export RED='\033[0;31m'
export RESET='\033[0m'
export YELLOW='\033[0;33m'
export GREEN='\033[0;32m'

export REPO=$(dirname "${ADMIN_DIR}")
export SERVER_DIR="${REPO}"/server
export LOGS_DIR="${REPO}"/logs
export MONGO_DB=set/me/somewhere

export USE_PM2=true