#!/bin/bash

source config.sh

if [ ! -d "$LOG_DIRECTORY" ]; then
    mkdir "$LOG_DIRECTORY";
fi

CLEANSER_RUNNING=$(ps -ef | grep "node ""$SERVER_SCRIPTS_DIRECTORY""/cleanser.js" | grep -v grep)

if [ -z "$CLEANSER_RUNNING" ]; then
    pm2 --silent start hackerNewsCleanser
    #pm2 --log "${LOG_DIRECTORY}"/cleanser.log --name hackerNewsCleanser --silent start "${SERVER_SCRIPTS_DIRECTORY}"/cleanser.js
    #nohup node "$SERVER_SCRIPTS_DIRECTORY"/cleanser.js > "$LOG_DIRECTORY"/cleanser.log 2>&1 &
    SUCCESS=$?
    
    if [ $SUCCESS -eq 0 ]; then
        echo -e "${GREEN}Hacker News Cleanser started${RESET}"
    else
        echo -e "${RED}Hacker News Cleanser failed to start${RESET}"
    fi
else
    echo -e "Hacker News Cleanser already running"
fi

