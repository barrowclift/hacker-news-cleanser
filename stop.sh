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

# If all necessary ingredients aren't running, then there's nothing to stop
if [ -z "$CLEANSER_RUNNING" ] && [ -z "$MONGODB_NOHUP_RUNNING" ] && [ -z "$MONGODB_SERVICE_RUNNING" ]; then
    echo -e "${RED}Hacker News Cleanser is not running${RESET}"
    exit 0
fi

echo "Stopping Hacker News Cleanser:"

# Ask to Stop MongoDB
if [ -n "$MONGODB_NOHUP_RUNNING" ] || [ -n "$MONGODB_SERVICE_RUNNING" ]; then
    read -p "Do you want to stop MongoDB? (y/n): " -r
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        read -p "Do you also want to clean MongoDB? (y/n): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]
        then
            echo -e "Cleaning MongoDB..."
            ./cleanMongoDb.sh 1
            sleep 1
        fi

        echo -e "Stopping MongoDB..."
        ./stopMongoDb.sh
    fi
else
    echo -e "MongoDB is not running"
fi
if [ -n "$CLEANSER_RUNNING" ]; then
    ./stopCleanser.sh
else
    echo -e "Hacker News Cleanser is not running"
fi

echo -e "\n${GREEN}HACKER NEWS CLEANSER HAS BEEN STOPPED${RESET}"
