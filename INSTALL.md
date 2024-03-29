# Install

The following instructions have been tested on macOS (for development) and CentOS 7.X (for production). While it's certainly possible to host or test the Hacker News Cleanser on different environments, it may require additional configuration.

## Requirements

* An "always on" server at home or a virtual machine provided by [AWS](https://aws.amazon.com), [DigitalOcean](https://www.digitalocean.com), or other providers. I use a DigitalOcean ["Droplet"](https://www.digitalocean.com/products/droplets/).
* A Linux flavor. I used [CentOS 7](https://www.centos.org), but other distributions should work just fine. macOS also works fine for development or production (assuming "always on"). Windows *probably* works fine, but is untested and may require additional setup.
* [node.js](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-a-centos-7-server): I used v10.9.0, though newer versions should be fine. Older versions may or may not work.
* [mongod](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-red-hat/#configure-the-package-management-system-yum): I used v4.0.13, though newer versions should be fine. Older versions may or may not work.
* The [pm2](http://pm2.keymetrics.io) process manager for node.js. I used v3.0.4, though newer versions should be fine. Older versions may or may not work.
* (For optional `addBlacklistItem.py` admin script) [python](https://www.python.org) & [pip](https://pypi.org/project/pip/). Once in place, install the [pymongo](https://api.mongodb.com/python/current/) package with `pip install pymongo` (Version 3.10.1 or newer required). Python 3 (not 2.7) is implied, as 2 is end of life.

## Setup

After preparing the requirements and cloning a copy of the project from Github, you'll first want to execute `npm install` in the project's root to download the various required packages.

Then, some minor configuration is required in `server/cleanser.properties`. Please set your credentials for the `hacker.news.username` and `hacker.news.password` properties, and set the other optional ones to your liking.

Next, run `npm install` in the project's root directory to pull all Hacker News Cleanser's dependencies.

Finally, you'll need to decide a directory you want Mongo to use for writing the Hacker News Cleanser DB. Once you've decided on a location, set that full directory path to `MONGO_DB` in `admin/init.sh`. If you want to create a directory somewhere that typically requires root permissions (such as in `/var/lib`), you **must** manually create the directory with the necessary permissions in advance with a command such as `sudo mkdir /var/lib/mongo ; sudo chown -R $(whoami) /var/lib/mongo`. Alternatively, you can choose a directory your user account is guarenteed to have write permissions to, such somewhere in your home directory.