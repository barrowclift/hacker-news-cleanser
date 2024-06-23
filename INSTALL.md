# Install

The following instructions have been tested on macOS (for development) and Rocky 9 (for production). While it's certainly possible to host or test the Hacker News Cleanser on different environments, it may require adjustments to the installation steps.

## Requirements

* An "always on" server at home or a virtual machine provided by [AWS](https://aws.amazon.com), [DigitalOcean](https://www.digitalocean.com), or other providers. I use a DigitalOcean ["Droplet"](https://www.digitalocean.com/products/droplets/).
* A Linux flavor. I use [Rocky 9](https://rockylinux.org), but other distributions should work just fine. macOS also works fine for development or production (assuming "always on"). Windows *probably* works fine, but is untested and may require additional setup.
* [node.js](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-a-centos-7-server): I used v20, though newer versions should be fine. Older versions may or may not work.
* [mongod](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-red-hat/#configure-the-package-management-system-yum): I used v7, though newer versions should be fine. Older versions may or may not work.
* The [pm2](http://pm2.keymetrics.io) process manager for node.js to make it easy to have the Cleanser automatically start on system boot (among other QOL improvements from having it "service"-fied). I used v5, though newer versions should be fine. Older versions may or may not work. If you don't want this, you can skip this dependency and set `export USE_PM2=false` in `admin/init.sh`.
	* If you want both pm2 & the Cleanser to start on boot, ensure `export USE_PM2=true` is set in `admin/init.sh`, start the Cleanser (or restart if already running), execute `pm2 save` to have pm2 start the process automatically on pm2 start, and finally execute `pm2 startup` to have pm2 itself start on system boot.
* [python](https://www.python.org) & [pip](https://pypi.org/project/pip/) (which are used for various administrative scripts to make it easy to add blacklist items or gather statistics). Once in place, install the [pymongo](https://api.mongodb.com/python/current/) package with `pip install pymongo` (Version 3.10.1 or newer required). Python 3 (not 2.7) is implied, as 2 is end of life. If you'd rather add blacklist items manually into MongoDB yourself, you can skip these dependencies.

## Setup

After preparing the requirements and cloning a copy of the project from Github, you'll first want to execute `npm install` in the project's root to download the various required packages.

Then, some minor configuration is required in `server/cleanser.properties`. Please set your credentials for the `hacker.news.username` and `hacker.news.password` properties, and set the other optional ones to your liking.

Next, run `npm install` in the project's root directory to pull all Hacker News Cleanser's dependencies.

Finally, you'll need to decide a directory you want Mongo to use for writing the Hacker News Cleanser DB. Once you've decided on a location, set that full directory path to `MONGO_DB` in `admin/init.sh`. If you want to create a directory somewhere that typically requires root permissions (such as in `/var/lib`), you **must** manually create the directory with the necessary permissions in advance with a command such as `sudo mkdir /var/lib/mongo ; sudo chown -R $(whoami) /var/lib/mongo`. Alternatively, you can choose a directory your user account is guarenteed to have write permissions to, such somewhere in your home directory.