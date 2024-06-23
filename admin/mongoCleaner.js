"use strict";

// DEPENDENCIES
// ------------
// External
import path from "path";
import url from "url";
// Local
const FILENAME = url.fileURLToPath(import.meta.url);
const CLEANSER_ROOT_DIRECTORY_PATH = path.join(path.dirname(FILENAME), "../");
const PropertyManager = await import (path.join(CLEANSER_ROOT_DIRECTORY_PATH, "server/PropertyManager.js"));
const MongoClient = await import (path.join(CLEANSER_ROOT_DIRECTORY_PATH, "server/MongoClient.js"));


// CONSTANTS
// ---------
const PROPERTIES_FILE_NAME = path.join(CLEANSER_ROOT_DIRECTORY_PATH, "server/cleanser.properties");


// GLOBALS
// -------
var propertyManager = null;


async function cleanDbAndClose() {
    var mongoClient = new MongoClient.default(propertyManager);
    await mongoClient.connect();
    await mongoClient.dropCollectionBlacklistedTitles();
    await mongoClient.dropCollectionBlacklistedSites();
    await mongoClient.dropCollectionBlacklistedUsers();
    await mongoClient.dropCollectionCleansedItems();
    await mongoClient.dropCollectionWeeklyReportsLog();
    await mongoClient.close();
}

async function main() {
    propertyManager = new PropertyManager.default();
    await propertyManager.load(PROPERTIES_FILE_NAME);

    await cleanDbAndClose();
}

main();