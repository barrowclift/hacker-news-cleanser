"use strict"

// DEPENDENCIES
// ------------
// External
let mongodb = require("mongodb");
// Local
let Logger = require("./Logger");


// CONSTANTS
// ---------
const CLASS_NAME = "mongoConnection"


// GLOBALS
// -------
let log = new Logger(CLASS_NAME);

/**
 * A relatively low-level MongoDB client. Used instead of the generic
 * `mongodb` client to abstract away establishing the inital collection
 * and bake in preferred error handling.
 */
class MongoClient {

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
        return new Promise((resolve, reject) => {
            mongodb.MongoClient.connect(
                mongoServerUrl, { useNewUrlParser: true,
                                  useUnifiedTopology: true }
            ).then((connection) => {
                log.info("Connection to Mongo server at " + this.propertyManager.mongoHost + ":" + this.propertyManager.mongoPort + " established");
                this.connection = connection;
                this.mongo = connection.db(this.propertyManager.db);
                resolve();
            }).catch((error) => {
                reject(Error(error));
            });
        });
    }

    async close() {
        log.debug("Closing Mongo connection...");
        return new Promise((resolve, reject) => {
            if (this.connection) {
                this.connection.close();
                log.info("Closed Mongo connection");
            } else {
                log.warn("Connection already closed");
            }
        });
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
        return new Promise((resolve, reject) => {
            if (collection && query != null) {
                collection.find(query).sort(sortQuery).toArray((error, documents) => {
                    if (error) {
                        reject(Error(error));
                    } else if (!documents || documents.length == 0) {
                        log.debug("Found no results for query='" + JSON.stringify(query) + "', collectionName=" + collectionName);
                        resolve(null);
                    } else {
                        log.debug("Found 1+ documents for query='" + JSON.stringify(query) + "', collectionName=" + collectionName);
                        resolve(documents);
                    }
                });
            } else {
                reject(Error("Invalid find arguments, query='" + JSON.stringify(query) + "', collectionName=" + collectionName));
            }
        });
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
        return new Promise((resolve, reject) => {
            if (collection && documentToInsert) {
                collection.insertOne(documentToInsert,
                                     { upsert },
                                     (error) => {
                    if (error) {
                        reject(Error(error));
                    } else {
                        log.debug("Inserted one document, _id=" + documentToInsert._id + ", collectionName=" + collectionName);
                        resolve();
                    }
                });
            } else {
                reject(Error("Invalid insertOne arguments, document='" + documentToInsert + "', collectionName=" + collectionName));
            }
        });
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
        return new Promise((resolve, reject) => {
            if (collection && id) {
                collection.deleteOne({ _id: id },
                                     (error) => {
                    if (error) {
                        reject(Error(error));
                    } else {
                        log.debug("Deleted document, _id=" + id + ", collectionName=" + collectionName);
                    }
                })
            } else {
                reject(Error("Invalid deleteById arguments, _id=" + id + ", collectionName=" + collectionName));
            }
        });
    }

    /**
     * Like Mongo's drop, but wrapping up tiresome boilerplate for increased
     * safety and ease of use. This method will drop empty or full
     * collections, and will consider it a success if no collection exists
     * with the provided name.
     */
    dropCollection(collectionName) {
        let collection = this.mongo.collection(collectionName);
        return new Promise((resolve, reject) => {
            if (collection) {
                collection.drop((error) => {
                    if (error) {
                        if (error.code == 26) {
                            resolve("Collection doesn't exist, collectionName=" + collectionName);
                        } else {
                            reject(Error(error));
                        }
                    } else {
                        resolve("Dropped collectionName=" + collectionName);
                    }
                });
            } else {
                reject(Error("Cannot drop collection, collectionName=" + collectionName))
            }
        });
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
        return new Promise((resolve, reject) => {
            if (collection && query != null) {
                collection.find(query)
                          .count((error, count) => {
                    if (error) {
                        reject(Error(error));
                    } else {
                        resolve(count);
                    }
                })
            } else {
                reject(Error("Invalid count arguments, query='" + JSON.stringify(query) + "', collectionName=" + collectionName));
            }
        });
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

module.exports = MongoClient;