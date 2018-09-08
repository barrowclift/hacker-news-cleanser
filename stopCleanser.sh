#!/bin/bash

source config.sh

CLEANSER_RUNNING=$(ps -ef | grep "node "${SERVER_SCRIPTS_DIRECTORY}"/cleanser.js" | grep -v grep)

if [ -n "$CLEANSER_RUNNING" ] ; then
	pm2 --silent stop hackerNewsCleanser
	#ps -ef | grep "node ""$SERVER_SCRIPTS_DIRECTORY""/cleanser.js" | grep -v grep | awk '{print $2}' | xargs kill -9
	SUCCESS=$?

	if [ $SUCCESS -eq 0 ]; then
        echo -e "${GREEN}Hacker News Cleanser stopped${RESET}"
    else
        echo -e "${RED}Hacker News Cleanser failed to stop${RESET}"
    fi
else
	echo -e "Hacker News Cleanser is not running"
fi

