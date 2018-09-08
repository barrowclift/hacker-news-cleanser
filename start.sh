#!/bin/bash

source config.sh

MONGODB_NOHUP_RUNNING=$(ps -ef | grep "mongod --dbpath $MONGO_DB_DIRECTORY" | grep -v grep)
HAS_SERVICE_COMMAND=$(command -v service)
if [ -n "$HAS_SERVICE_COMMAND" ]; then
    HAS_MONGODB_INITD_SERVICE=$(ls /etc/init.d/mongod 2>/dev/null)
    HAS_MONGODB_SYSTEMCTL_SERVICE=$(ls /usr/lib/systemd/system/mongod.service 2>/dev/null)
    if [ -n "$HAS_MONGODB_INITD_SERVICE" ]; then
        MONGODB_SERVICE_RUNNING=$(service mongod status | grep 'is running\|active (running)')
    elif [ -n "$HAS_MONGODB_SYSTEMCTL_SERVICE" ]; then
        MONGODB_SERVICE_RUNNING=$(systemctl status mongod | grep 'is running\|active (running)')
    fi
fi
CLEANSER_RUNNING=$(ps -ef | grep "node ""$SERVER_SCRIPTS_DIRECTORY""/cleanser.js" | grep -v grep)

# If all necessary ingredients are running successfully, nothing to do
if [[ ( -n "$CLEANSER_RUNNING" ) && ( -n "$MONGODB_NOHUP_RUNNING" || -n "$MONGODB_SERVICE_RUNNING" ) ]]; then
	echo -e "${GREEN}Hacker News Cleanser is already running${RESET}"
    exit 0
fi

./cleanLogs.sh

echo -e "\nStarting Hacker News Cleanser:"

./startMongoDb.sh
startMongoProcess=$!
wait $startMongoProcess

./startCleanser.sh

echo -e "\n${GREEN}HACKER NEWS CLEANSER IS NOW RUNNING${RESET}"
