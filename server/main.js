"use strict";

// DEPENDENCIES
// ------------
// External
let path = require("path");
// Local
let MongoClient = require("./MongoClient");
let Logger = require("./Logger");
let paths = require("./paths");
let CleanserProperties = require("./CleanserProperties");
let Cleanser = require("./Cleanser");


// CONSTANTS
// ---------
const CLASS_NAME = "main"


// GLOBALS
// -------
let cleanserProperties = null;
let mongoClient = null;
let cleanser = null;

let log = new Logger(CLASS_NAME);
let propertiesFileName = path.join(paths.SERVER_DIRECTORY_PATH, "cleanser.properties");


// STARTUP
// -------
log.info("Starting up...");

async function startup() {
	// 1. Load properties
	cleanserProperties = new CleanserProperties();
	await cleanserProperties.load(propertiesFileName);

	// 2. Connect to MongoDB
	mongoClient = new MongoClient(cleanserProperties);
	await mongoClient.connect();

	// 3. Start cleanser
	cleanser = new Cleanser(cleanserProperties, mongoClient);
	cleanser.start();
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
    await cleanser.stop();
    await mongoClient.close();
    log.info("Completed shutdown");
    process.exit(0);
}