"use strict";

// DEPENDENCIES
// ------------
// External
import nodePropertyLoader from "properties";
// Local
import Logger from "./Logger.js";
import util from "./util.js";


// CONSTANTS
// ---------
const CLASS_NAME = "PropertyManager";

// Property default values
const DEFAULT_HACKER_NEWS_BASE_URL = "https://news.ycombinator.com";
const DEFAULT_HACKER_NEWS_USERNAME = null;
const DEFAULT_HACKER_NEWS_PASSWORD = null;

const DEFAULT_CLEANSER_FREQUENCY_IN_MINUTES = 1;
const DEFAULT_USER_AGENT_BASE = "HackerNewsCleanser/2.8 +https://github.com/barrowclift/hacker-news-cleanser"

const DEFAULT_MONGO_HOST = "localhost";
const DEFAULT_MONGO_PORT = 27017;
const DEFAULT_DB = "hackerNewsCleanserDb";
const DEFAULT_COLLECTION_BLACKLISTED_TITLES = "blacklistedTitles";
const DEFAULT_COLLECTION_BLACKLISTED_SITES = "blacklistedSites";
const DEFAULT_COLLECTION_BLACKLISTED_USERS = "blacklistedUsers";
const DEFAULT_COLLECTION_CLEANSED_ITEMS = "cleansedItems";
const DEFAULT_COLLECTION_WEEKLY_REPORTS_LOG = "weeklyReportsLog";

const DEFAULT_EMAIL_REPORT_ENABLED = false;
const DEFAULT_EMAIL_REPORT_FREQUENCY_IN_DAYS = 7;
const DEFAULT_EMAIL_REPORT_SENDER = null;
const DEFAULT_EMAIL_REPORT_SENDER_PASSWORD = null;
const DEFAULT_EMAIL_REPORT_RECIPIENTS = [];


// GLOBALS
// -------
let log = new Logger(CLASS_NAME);


/**
 * Working with properties is a pain. You have to check for existance, have
 * default values defined, etc. This detracts from what the code using those
 * values actually wants: a sane default if not present, no boilerplate hiding
 * the core of their own logic.
 *
 * Thus, any and ALL Hacker News Cleanser properties are pre-loaded and
 * validated here, and if not provided or present fall back to sane defaults.
 * Thus, letting calling code get back to what's *actually* important to them:
 * their own work.
 */
export default class PropertyManager {

    /**
     * Does not automatically load any properties file, but simply initializes
     * all Hacker News Cleanser properties to their default values. To load
     * `cleanser.properties`, call load().
     */
    constructor() {
        this.hackerNewsBaseUrl = DEFAULT_HACKER_NEWS_BASE_URL;
        this.hackerNewsUsername = DEFAULT_HACKER_NEWS_USERNAME;
        this.hackerNewsPassword = DEFAULT_HACKER_NEWS_PASSWORD;

        this.cleanserFrequencyInMinutes = DEFAULT_CLEANSER_FREQUENCY_IN_MINUTES;
        this.userAgentBase = DEFAULT_USER_AGENT_BASE;

        // MongoDB
        this.mongoHost = DEFAULT_MONGO_HOST;
        this.mongoPort = DEFAULT_MONGO_PORT;
        this.db = DEFAULT_DB;
        this.collectionBlacklistedTitles = DEFAULT_COLLECTION_BLACKLISTED_TITLES;
        this.collectionBlacklistedSites = DEFAULT_COLLECTION_BLACKLISTED_SITES;
        this.collectionBlacklistedUsers = DEFAULT_COLLECTION_BLACKLISTED_USERS;
        this.collectionCleansedItems = DEFAULT_COLLECTION_CLEANSED_ITEMS;
        this.collectionWeeklyReportsLog = DEFAULT_COLLECTION_WEEKLY_REPORTS_LOG;

        // Email Report
        this.emailReportEnabled = DEFAULT_EMAIL_REPORT_ENABLED;
        this.emailReportFrequencyInDays = DEFAULT_EMAIL_REPORT_FREQUENCY_IN_DAYS;
        this.emailReportSender = DEFAULT_EMAIL_REPORT_SENDER;
        this.emailReportSenderPassword = DEFAULT_EMAIL_REPORT_SENDER_PASSWORD;
        this.emailReportRecipients = DEFAULT_EMAIL_REPORT_RECIPIENTS;
    }

    /**
     * ==============
     * PUBLIC METHODS
     * ==============
     */

    async load(filename) {
        if (!filename) {
            throw "Properties filename is null";
        }

        let properties = await this._load(filename);

        if ("hacker.news.base.url" in properties) {
            this.hackerNewsBaseUrl = properties["hacker.news.base.url"];
        }
        if ("hacker.news.username" in properties) {
            this.hackerNewsUsername = properties["hacker.news.username"];
        }
        if ("hacker.news.password" in properties) {
            this.hackerNewsPassword = properties["hacker.news.password"];
        }

        if ("cleanser.frequency.in.minutes" in properties) {
            this.cleanserFrequencyInMinutes = properties["cleanser.frequency.in.minutes"];
        }
        this.cleanserFrequencyInMillis = util.minutesToMillis(this.cleanserFrequencyInMinutes);
        if ("user.agent.base" in properties) {
            this.userAgentBase = properties["user.agent.base"];
        }

        // MongoDB
        if ("mongodb.host" in properties) {
            this.mongoHost = properties["mongodb.host"];
        }
        if ("mongodb.port" in properties) {
            this.mongoPort = properties["mongodb.port"];
        }
        if ("db" in properties) {
            this.db = properties["db"];
        }
        if ("collection.blacklisted.titles" in properties) {
            this.collectionBlacklistedTitles = properties["collection.blacklisted.titles"];
        }
        if ("collection.blacklisted.sites" in properties) {
            this.collectionBlacklistedSites = properties["collection.blacklisted.sites"];
        }
        if ("collection.blacklisted.users" in properties) {
            this.collectionBlacklistedUsers = properties["collection.blacklisted.users"];
        }
        if ("collection.cleansed.items" in properties) {
            this.collectionCleansedItems = properties["collection.cleansed.items"];
        }
        if ("collection.weekly.reports.log" in properties) {
            this.collectionWeeklyReportsLog = properties["collection.weekly.reports.log"];
        }

        // Email Report
        if ("email.report.enabled" in properties) {
            this.emailReportEnabled = properties["email.report.enabled"];
        }
        if ("email.report.frequency.in.days" in properties) {
            this.emailReportFrequencyInDays = properties["email.report.frequency.in.days"];
        }
        if ("email.report.sender" in properties) {
            this.emailReportSender = properties["email.report.sender"];
        }
        if ("email.report.sender.password" in properties) {
            this.emailReportSenderPassword = properties["email.report.sender.password"];
        }
        if ("email.report.recipients" in properties) {
            this.emailReportRecipients = properties["email.report.recipients"];
        }

        // Computed
        this.userAgent = this.hackerNewsUsername + " " + this.userAgentBase;
    }

    requiredPropertiesWereProvided() {
        return this.hackerNewsUsername != null
            && this.hackerNewsPassword != null
    }

    requiredEmailReportPropertiesWereProvided() {
        return this.emailReportSender != null
            && this.emailReportSenderPassword != null
            && this.emailReportRecipients != []
    }

    /**
     * ===============
     * PRIVATE METHODS
     * ===============
     */

    async _load(filename) {
        // The properties package does not currently support promises natively
        return new Promise((resolve, reject) => {
            nodePropertyLoader.parse(filename,
                                     { path: true },
                                     (error, properties) => {
                if (error) {
                    log.error("loadProperties", "An error occurred while loading properties");
                    reject(Error(error));
                } else {
                    log.info("Loaded properties");
                    resolve(properties);
                }
            });
        });
    }

}
