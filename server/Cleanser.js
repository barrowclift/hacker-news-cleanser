"use strict";

// DEPENDENCIES
// ------------
// External
let Jsdom = require("jsdom").JSDOM;
let request = require("request-promise");
// Local
let Logger = require("./Logger");
let util = require("./util");


// CONSTANTS
// ---------
const CLASS_NAME = "Cleanser";


// GLOBALS
// -------
let log = new Logger(CLASS_NAME);


class Cleanser {

    /**
     * Initializes the cleanser, but does not automatically kick it off.
     * To start the cleanser, `start()` must be called.
     *
     * @param {PropertyManager} propertyManager
     * @param {MongoClient} mongoClient
     */
    constructor(propertyManager, mongoClient) {
        this.propertyManager = propertyManager;
        this.mongoClient = mongoClient;

        this.isStopping = false;
        this.currentlyCleansing = false;
        this.cleanseIntervalId = null;

        this.totalCleansedStories = 0;

        /**
         * If a regex pattern for matching titles was provided that does not
         * compile, we'll only attempt the once then ignore it in all future
         * cleansings in this Hacker News Cleanser instance. That way, we're
         * not reattempting to parse the regex every cleanse and clogging up
         * the log file with the same errors.
         */
        this.ignoredRegexes = new Set();

        // Initializing request templates that the Cleanser will use when started
        this.loginRequest = {
            url: this.propertyManager.hackerNewsBaseUrl + "/login",
            followAllRedirects: true,
            jar: true,
            form: {
                acct: this.propertyManager.hackerNewsUsername,
                pw: this.propertyManager.hackerNewsPassword,
                goto: "news"
            },
            headers: {
                "User-Agent": this.propertyManager.userAgent
            }
        }
        this.homePageRequest = {
            url: this.propertyManager.hackerNewsBaseUrl,
            followAllRedirects: true,
            jar: true,
            headers: {
                "User-Agent": this.propertyManager.userAgent
            }
        }
        this.hideRequest = {
            url: this.propertyManager.hackerNewsBaseUrl + "/hide",
            followAllRedirects: true,
            jar: true,
            form: {
                id: "",
                goto: "news",
                auth: ""
            },
            headers: {
                "User-Agent": this.propertyManager.userAgent
            }
        }
    }

    /**
     * ==============
     * PUBLIC METHODS
     * ==============
     */

    async start() {
        log.info("Starting...");

        const THIS = this; // For referencing root-instance "this" in promise context

        // 1. Validate that all required properties were provided
        if (!this.propertyManager.requiredPropertiesWereProvided()) {
            throw "Required Hacker News Cleanser properties were not provided, cannot startup";
        }

        // 2. Print total cleansed stories since the beginning of time
        this.totalCleansedStories = await this.mongoClient.countAllCleansedItems();
        log.info("So far, the Hacker News Cleanser has cleansed " + this.totalCleansedStories + " total stories from your feed");

        // 3. Login
        await this._login();

        // 4. Run cleanse so the user doesn't have to wait for the first frequency time to elapse before results.
        await this._cleanse();

        // 5. Finally, kick off the cleanse interval
        this.cleanseIntervalId = setInterval(async function() {
            if (THIS.isStopping) {
                log.info("Preventing cleanse, shutting down...");
            } else if (THIS.currentlyCleansing) {
                log.info("Skipping cleanse, still processing previous one...");
            } else {
                await THIS._cleanse();
            }
        }, this.propertyManager.cleanserFrequencyInMillis);
    }

    async stop() {
        this.isStopping = true;
        log.info("Stopping...");
        clearInterval(this.cleanseIntervalId);
        log.info("Stopped");
    }

    /**
     * ===============
     * PRIVATE METHODS
     * ===============
     */

    /**
     * The Node request instance will retain whatever authentication cookies
     * Hacker News returns from this login attempt, so all we need to do is
     * report back if it was successful or not and use the same request
     * instance going forward.
     */
    async _login() {
        log.info("Logging into Hacker News");

        let response = await request.post(this.loginRequest);
        if (response != null) {
            if (response.indexOf("Bad login.") > -1) {
                log.error("Hacker News login failed, user='" + this.propertyManager.hackerNewsUsername + "', pass='" + this.propertyManager.hackerNewsPassword + "'");
                throw "Hacker News login failed";
            } else if (response.indexOf("Validation required.") > -1) {
                log.error("Hacker News login failed, too many bad login attempts, Hacker News now requesting Recaptcha validation. Unfortunately, the only way to fix this is time; please ensure your credentials are correct then try again at a later time.");
                throw "Too many bad login attempts, ReCAPTCHA validation now required";
            }
        }
        this.lastAuthRefreshTime = new Date();

        let frequencyString = this.propertyManager.cleanserFrequencyInMinutes + " minutes";
        if (this.propertyManager.cleanserFrequencyInMinutes == 1) {
            frequencyString = "minute";
        }
        log.info("Login successful, will cleanse Hacker News every " + frequencyString);
    }

    async _cleanse() {
        const THIS = this; // For referencing root-instance "this" in promise context

        let homePage = await this._getHomePage();
        if (!homePage) {
            return;
        }

        log.debug("Scanning home page for stories to cleanse");

        let cleansedAtLeastOneStory = false;
        let nowCheckingStory = false;
        let idOfCurrentStory = "";
        let title = "Untitled";
        let storyLink = "#";
        let source = "self";

        let dom = new Jsdom(homePage);
        let rows = dom.window.document.querySelectorAll("tr");
        for (let row of rows) {
            let className = row.getAttribute("class");
            if ("athing" == className) {
                nowCheckingStory = true;

                idOfCurrentStory = row.getAttribute("id");

                let titleElement = row.querySelector("a.storylink")
                title = "Untitled";
                storyLink = "#";
                if (titleElement) {
                    title = titleElement.textContent;
                    storyLink = titleElement.getAttribute("href");
                }
                let sourceElement = row.querySelector("span.sitestr");
                source = "self";
                if (sourceElement) {
                    source = sourceElement.textContent;
                }
            } else if (nowCheckingStory) {
                nowCheckingStory = false;

                let userElement = row.querySelector("a.hnuser");
                let user = "anonymous";
                if (userElement) {
                    user = userElement.textContent;
                }

                // "verdict" is a JSON of boolean "shouldCleanse" and string "cleansedBy";
                let verdict = await THIS._shouldCleanseStory(title, user, source);
                if (verdict.shouldCleanse) {
                    log.info("Cleansing story, title=\"" + title + "\" from " + source);

                    // Extracting auth token from "hide" href link
                    let authForStory = "";
                    let actionRowLinks = row.querySelectorAll("a");
                    for (let link of actionRowLinks) {
                        if ("hide" == link.textContent) {
                            let hideLink = link.getAttribute("href");
                            authForStory = THIS._getParameterByName("auth", hideLink);
                            break;
                        }
                    }
                    if (!authForStory) {
                        log.error("_cleanse", "No auth provided in \"" + title + "\"'s link, maybe session has expired?");
                        log.error(homePage);
                        break;
                    }

                    // Save the cleansed story in Mongo and hide it
                    let cleansedStoryDocument = {
                        _id: idOfCurrentStory,
                        title: title,
                        user: user,
                        source: source,
                        cleansedBy: verdict.cleansedBy,
                        link: storyLink,
                        hideTime: new Date().getTime()
                    };
                    await THIS.mongoClient.insertCleansedStory(cleansedStoryDocument);
                    await THIS._hideStory(idOfCurrentStory, authForStory);
                    cleansedAtLeastOneStory = true;
                }

                continue;
            }
        }

        if (!cleansedAtLeastOneStory) {
            log.debug("No stories needed cleansing");
        }
    }

    async _getHomePage() {
        log.debug("Getting current Hacker News home page");

        let response = null;
        try {
            response = await request.post(this.homePageRequest);
            this.lastAuthRefreshTime = new Date();
            log.debug("Hacker News home page obtained");
        } catch (error) {
            log.error("_getHomePage", "Failed to retrieve the Hacker News home page, error=" + error)
        }
        return response;
    }

    async _shouldCleanseStory(title, user, source, callback) {
        let blacklistedTitles = await this.mongoClient.findAllBlacklistedTitles();
        if (blacklistedTitles) {
            for (let titleDocument of blacklistedTitles) {
                if ("keyword" == titleDocument.type) {
                    if (new RegExp("\\b" + titleDocument.keyword + "\\b", "i").test(title)) {
                        return {
                            shouldCleanse: true,
                            cleansedBy: this.propertyManager.collectionBlacklistedTitles
                        };
                    }
                } else if ("regex" == titleDocument.type) {
                    if (!ignoredRegexes.has(titleDocument.regex)) {
                        try {
                            if (new RegExp(titleDocument.regex).test(title)) {
                                return {
                                    shouldCleanse: true,
                                    cleansedBy: this.propertyManager.collectionBlacklistedTitles
                                };
                            }
                        } catch (error) {
                            log.error("_shouldCleanseStory", "Failed to parse title blacklist regex \"" + titleDocument.regex + "\", ignoring and skipping");
                            ignoredRegexes.add(titleDocument.regex);
                        }
                    }
                }
            }
        }

        let blacklistedSites = await this.mongoClient.findAllBlacklistedSites();
        if (blacklistedSites) {
            for (let siteDocument of blacklistedSites) {
                if (siteDocument.site == source) {
                    return {
                        shouldCleanse: true,
                        cleansedBy: this.propertyManager.collectionBlacklistedSites
                    };
                }
            }
        }

        let blacklistedUsers = await this.mongoClient.findAllBlacklistedUsers();
        if (blacklistedUsers) {
            for (let userDocument of blacklistedUsers) {
                if (userDocument.user == user) {
                    return {
                        shouldCleanse: true,
                        cleansedBy: this.propertyManager.collectionBlacklistedUsers
                    };
                }
            }
        }

        return {
            shouldCleanse: false
        };
    }

    async _hideStory(storyId, auth) {
        this.hideRequest.form.id = storyId;
        this.hideRequest.form.auth = auth;
        await request.post(this.hideRequest);
    }

    /**
     * Parse URL parameter values by key
     *
     * https://stackoverflow.com/users/1045296/jolly-exe
     * https://stackoverflow.com/a/901144
     */
    _getParameterByName(name, url) {
        if (!url) {
            url = window.location.href
        }
        name = name.replace(/[\[\]]/g, "\\$&")
        let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
        let results = regex.exec(url);
        if (!results) {
            return null
        }
        if (!results[2]) {
            return ''
        }
        return decodeURIComponent(results[2].replace(/\+/g, " "))
    }
}

module.exports = Cleanser;
