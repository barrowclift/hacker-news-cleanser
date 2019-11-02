"use strict";

// DEPENDENCIES
// ------------
// External
let path = require("path");
let Properties = require("properties");
// Local
const CLEANSER_ROOT_DIRECTORY_PATH = path.join(__dirname, "..");
let CleanserProperties = require(path.join(CLEANSER_ROOT_DIRECTORY_PATH, "server/CleanserProperties"));
let CachedMongoClient = require(path.join(CLEANSER_ROOT_DIRECTORY_PATH, "server/MongoClient"));


// CONSTANTS
// ---------
const PROPERTIES_FILE_NAME = path.join(CLEANSER_ROOT_DIRECTORY_PATH, "server/shelf.properties");


// GLOBALS
// -------
var cleanserProperties = null;


async function cleanDbAndClose() {
    var mongoClient = new CachedMongoClient(cleanserProperties);
    await mongoClient.connect();
    await mongoClient.dropCollectionBlacklistedTitles();
    await mongoClient.dropCollectionBlacklistedSites();
    await mongoClient.dropCollectionBlacklistedUsers();
    await mongoClient.dropCollectionCleansedItems();
    await mongoClient.dropCollectionWeeklyReportsLog();
    await mongoClient.close();
}

async function main() {
    cleanserProperties = new CleanserProperties();
    await cleanserProperties.load(PROPERTIES_FILE_NAME);

    await cleanDbAndClose();
}

main();