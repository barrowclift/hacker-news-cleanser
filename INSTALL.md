# Install

The following instructions have been tested on macOS (for development) and CentOS 7.X (for production). While it's certainly possible to host or test the Hacker News Cleanser on different environments, it may require additional configuration.

## Requirements

* An "always on" server at home or a virtual machine provided by [AWS](https://aws.amazon.com), [DigitalOcean](https://www.digitalocean.com), or other providers. I use a DigitalOcean ["Droplet"](https://www.digitalocean.com/products/droplets/).
* A Linux flavor. I used [CentOS 7](https://www.centos.org), but other distributions should work just fine. macOS also works fine for development or production (assuming "always on"). Windows *probably* works fine, but is untested and may require additional setup.
* [node.js](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-a-centos-7-server): I used v10.9.0, though newer versions should be fine. Older versions may or may not work.
* [mongod](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-red-hat/#configure-the-package-management-system-yum): I used v4.0.2, though newer versions should be fine. Older versions may or may not work.
* The [pm2](http://pm2.keymetrics.io) process manager for node.js. I used v3.0.4, though newer versions should be fine. Older versions may or may not work.

## Setup

Some minor setup is required after installation:

* (Required) Edit `PROJECT_ABSOLUTE_PATH` in `config.sh` to match the absolute path on your machine where the Hacker News Cleanser resides.
* (Required) Set the `username` and `password` fields in `config.json` to the Hacker News account to hide articles for.
* (Optional) Should you wish the Hacker News Cleanser to automatically start on startup (recommended), see [this short guide](http://pm2.keymetrics.io/docs/usage/startup/) or execute `pm2 startup` to let `pm2` handle the settings for you.
* (Optional) Adjust the `frequencyInMinutes` and `emailReport*` fields in `config.json`, if desired
