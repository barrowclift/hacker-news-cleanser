"use strict";

// DEPENDENCIES
// ------------
// External
let path = require("path");
// Local
let MongoClient = require("./MongoClient");
let Logger = require("./Logger");
let paths = require("./paths");
let PropertyManager = require("./PropertyManager");
let ReportMailman = require("./ReportMailman");
let Cleanser = require("./Cleanser");


// CONSTANTS
// ---------
const CLASS_NAME = "main"


// GLOBALS
// -------
let propertyManager = null;
let mongoClient = null;
let cleanser = null;
let mailman = null;

let log = new Logger(CLASS_NAME);
let propertiesFileName = path.join(paths.SERVER_DIRECTORY_PATH, "cleanser.properties");


// STARTUP
// -------
log.info("Starting up...");

async function startup() {
	// 1. Load properties
	propertyManager = new PropertyManager();
	await propertyManager.load(propertiesFileName);

	// 2. Connect to MongoDB
	mongoClient = new MongoClient(propertyManager);
	await mongoClient.connect();

	// 3. Start cleanser
	cleanser = new Cleanser(propertyManager, mongoClient);
	cleanser.start();

    // 4. Start Report Mailman
    mailman = new ReportMailman(propertyManager, mongoClient);
    mailman.start();
}

try {
	startup();
} catch (error) {
	log.error("startup", error);
}


// SHUTDOWN
// --------
["SIGHUP",
 "SIGINT",
 "SIGQUIT",
 "SIGIL",
 "SIGTRAP",
 "SIGABRT",
 "SIGBUS",
 "SIGFPE",
 "SIGUSR1",
 "SIGSEGV",
 "SIGUSR2",
 "SIGTERM"
].forEach(function(signal) {
    // Catching & handling all terminating signals
    process.on(signal, function() {
        log.info("Received signal=" + signal);
        shutdown();

        // Force a shutdown anyway if still alive after ten seconds
        setTimeout(function() {
            log.warn("Shutdown still not complete, forcing shutdown... NOW");
            process.exit(1);
        }, 10000);
    });
})
async function shutdown() {
    log.info("Shutting down...");
    if (cleanser) {
        await cleanser.stop();
    }
    if (mongoClient) {
        await mongoClient.close();
    }
    if (mailman) {
        await mailman.stop();
    }
    log.info("Completed shutdown");
    process.exit(0);
}