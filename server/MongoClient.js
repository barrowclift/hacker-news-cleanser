"use strict"

// DEPENDENCIES
// ------------
// External
import mongodb from "mongodb";
// Local
import Logger from "./Logger.js";


// CONSTANTS
// ---------
const CLASS_NAME = "mongoConnection"


// GLOBALS
// -------
let log = new Logger(CLASS_NAME);

/**
 * This was originally a "wrapper" to the old v3 `mongodb` client primarily to
 * sidestep the absolutely nightmare that was callback handling and instead
 * wrap everything in Promises so callers could simply `await` the necessary
 * calls.
 *
 * However, modern `mongodb` client versions (thankfully!) migrated natively
 * to Promises, so the vast majority of the value this wrapper class provided
 * is now moot.
 *
 * I'm keeping it around mostly for legacy reasons (it's more work to fully
 * remove than to remove the now unnecessary Promise wrapping). If this was
 * being written from scratch today with the modern `mongodb` package, I
 * wouldn't have made this class at all.
 */
export default class MongoClient {

    /**
     * @param {PropertyManager} propertyManager
     */
    constructor(propertyManager) {
        this.propertyManager = propertyManager;
        this.mongo = null;

        log.debug("Initialized");
    }

    /**
     * ==============
     * PUBLIC METHODS
     * ==============
     */

    async connect() {
        let mongoServerUrl = "mongodb://" + this.propertyManager.mongoHost + ":" + this.propertyManager.mongoPort + "/" + this.propertyManager.db;
        log.info("Connecting to Mongo at " + mongoServerUrl);
        this.connection = new mongodb.MongoClient(mongoServerUrl);
        await this.connection.connect();
        this.mongo = this.connection.db(this.propertyManager.db);
    }

    async close() {
        log.debug("Closing Mongo connection...");
        await this.connection.close();
        log.info("Closed Mongo connection");
    }

    /**
     * Like Mongo's find, but wrapping up tiresome boilerplate for increased
     * safety and ease of use. Returned document array will be "null" as well
     * when no documents exist, as that's also far easier to check for and
     * handle than an empty array.
     */
    find(collectionName, query, sortQuery) {
        if (sortQuery == null) {
            sortQuery = {};
        }

        let collection = this.mongo.collection(collectionName);
        if (collection == null || query == null) {
            throw "Invalid find arguments, query='" + JSON.stringify(query) + "', collectionName=" + collectionName;
        }

        return collection.find(query).sort(sortQuery).toArray();
    }
    findWeeklyReportLogs(query, sortQuery) {
        return this.find(this.propertyManager.collectionWeeklyReportsLog, query, sortQuery);
    }
    findCleansedItems(query, sortQuery) {
        return this.find(this.propertyManager.collectionCleansedItems, query, sortQuery);
    }

    /**
     * Equivalent to Mongo's find with an empty/blank query, but with increased
     * safety and ease of use. Returned document array will be "null" as well when
     * no documents exist, as that's also far ease
     */
    findAll(collectionName) {
        return this.find(collectionName, {});
    }
    findAllBlacklistedTitles() {
        return this.find(this.propertyManager.collectionBlacklistedTitles, {});
    }
    findAllBlacklistedSites() {
        return this.find(this.propertyManager.collectionBlacklistedSites, {});
    }
    findAllBlacklistedUsers() {
        return this.find(this.propertyManager.collectionBlacklistedUsers, {});
    }

    /**
     * Like Mongo's updateOne, but wrapping up tiresome boilerplate for
     * increased safety and ease of use. This method has strict "insert"
     * behavior (no updates).
     */
    insertOne(collectionName, documentToInsert, upsert) {
        let collection = this.mongo.collection(collectionName);
        if (collection == null || documentToInsert == null) {
            throw "Invalid insertOne arguments, document='" + documentToInsert + "', collectionName=" + collectionName;
        }
        collection.insertOne(documentToInsert, { upsert });
        log.debug("Inserted one document, _id=" + documentToInsert._id + ", collectionName=" + collectionName);
    }
    insertWeeklyReportLog(documentToInsert) {
        return this.insertOne(this.propertyManager.collectionWeeklyReportsLog, documentToInsert);
    }
    insertCleansedStory(documentToInsert) {
        return this.insertOne(this.propertyManager.collectionCleansedItems, documentToInsert, true);
    }

    /**
     * Like Mongo's deleteOne, but wrapping up tiresome boilerplate for
     * increased safety and ease of use. This method has delete ONE behavior
     * ONLY, will result in an error if no document exists with the provided _id
     */
    deleteById(collectionName, id) {
        let collection = this.mongo.collection(collectionName);
        if (collection == null || id == null) {
            "Invalid deleteById arguments, _id=" + id + ", collectionName=" + collectionName;
        }
        collection.deleteOne({ _id: id });
        log.debug("Deleted document, _id=" + id + ", collectionName=" + collectionName);
    }

    /**
     * Like Mongo's drop, but wrapping up tiresome boilerplate for increased
     * safety and ease of use. This method will drop empty or full
     * collections, and will consider it a success if no collection exists
     * with the provided name.
     */
    dropCollection(collectionName) {
        let collection = this.mongo.collection(collectionName);
        if (collection == null) {
            "Cannot drop 'null' collection";
        }
        return collection.drop();
    }
    dropCollectionBlacklistedTitles() {
        return this.dropCollection(this.propertyManager.collectionBlacklistedTitles);
    }
    dropCollectionBlacklistedSites() {
        return this.dropCollection(this.propertyManager.collectionBlacklistedSites);
    }
    dropCollectionBlacklistedUsers() {
        return this.dropCollection(this.propertyManager.collectionBlacklistedUsers);
    }
    dropCollectionCleansedItems() {
        return this.dropCollection(this.propertyManager.collectionCleansedItems);
    }
    dropCollectionWeeklyReportsLog() {
        return this.dropCollection(this.propertyManager.collectionWeeklyReportsLog);
    }

    /**
     * Like Mongo's find + count, but wrapping up tiresome boilerplate for
     * increased safety and ease of use. This method will count all matches
     * for the provided query in a particular collection. If no documents
     * match the query, a count of 0 is returned.
     */
    count(collectionName, query) {
        let collection = this.mongo.collection(collectionName);
        if (collection && query != null) {
            return collection.countDocuments(query);
        }
        throw "Invalid count arguments, query='" + JSON.stringify(query) + "', collectionName=" + collectionName;
    }

    /**
     * Equivalent to Mongo's find + count with an empty/blank query, but with
     * increased safety and ease of use. Returned count will be 0 if no
     * documents exist in the collection.
     */
    countAll(collectionName) {
        return this.count(collectionName, {});
    }
    countAllCleansedItems() {
        return this.countAll(this.propertyManager.collectionCleansedItems);
    }

}
