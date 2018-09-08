#!/bin/bash

PROJECT_ABSOLUTE_PATH=/some/example/path

export MONGO_DB_DIRECTORY=/var/lib/mongo
export LOG_DIRECTORY="${PROJECT_ABSOLUTE_PATH}"/logs
export SERVER_SCRIPTS_DIRECTORY="${PROJECT_ABSOLUTE_PATH}"/server

export RESET='\033[0m'
export GREEN='\033[0;32m'
export RED='\033[0;31m'
