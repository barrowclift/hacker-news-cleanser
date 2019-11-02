"use strict"

// DEPENDENCIES
// ------------
// External
let mongodb = require("mongodb");
// Local
let Logger = require("./Logger");
let CleanserProperties = require("./CleanserProperties");


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
     * @param {CleanserProperties} cleanserProperties
     */
    constructor(cleanserProperties) {
        this.cleanserProperties = cleanserProperties;
        this.mongo = null;

        log.debug("Initialized");
    }

    /**
     * ==============
     * PUBLIC METHODS
     * ==============
     */

    connect() {
        const THIS = this; // For referencing root-instance "this" in promises
        let mongoServerUrl = "mongodb://" + this.cleanserProperties.mongoHost + ":" + this.cleanserProperties.mongoPort + "/" + this.cleanserProperties.db;
        log.info("Connecting to Mongo at " + mongoServerUrl);
        return new Promise(function(resolve, reject) {
            mongodb.MongoClient.connect(
                mongoServerUrl, { useNewUrlParser: true,
                                  useUnifiedTopology: true }
            ).then(function(connection) {
                log.info("Connection to Mongo server at " + THIS.cleanserProperties.mongoHost + ":" + THIS.cleanserProperties.mongoPort + " established");
                THIS.connection = connection;
                THIS.mongo = connection.db(THIS.cleanserProperties.db);
                resolve();
            }).catch(function(error) {
                reject(Error(error));
            });
        });
    }

    close() {
        const THIS = this; // For referencing root-instance "this" in promises
        log.debug("Closing Mongo connection...");
        return new Promise(function(resolve, reject) {
            if (THIS.connection) {
                THIS.connection.close();
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
        return new Promise(function(resolve, reject) {
            if (collection && query != null) {
                collection.find(query).sort(sortQuery).toArray(function(error, documents) {
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
        return this.find(this.cleanserProperties.collectionWeeklyReportsLog, query, sortQuery);
    }
    findCleansedItems(query, sortQuery) {
        return this.find(this.cleanserProperties.collectionCleansedItems, query, sortQuery);
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
        return this.find(this.cleanserProperties.collectionBlacklistedTitles, {});
    }
    findAllBlacklistedSites() {
        return this.find(this.cleanserProperties.collectionBlacklistedSites, {});
    }
    findAllBlacklistedUsers() {
        return this.find(this.cleanserProperties.collectionBlacklistedUsers, {});
    }

    /**
     * Like Mongo's updateOne, but wrapping up tiresome boilerplate for
     * increased safety and ease of use. This method has strict "insert"
     * behavior (no updates).
     */
    insertOne(collectionName, documentToInsert) {
        let collection = this.mongo.collection(collectionName);
        return new Promise(function(resolve, reject) {
            if (collection && documentToInsert) {
                if ("_id" in documentToInsert) {
                    collection.insertOne({ _id: documentToInsert._id },
                                         { upsert: true },
                                         function(error) {
                        if (error) {
                            reject(Error(error));
                        } else {
                            log.debug("Inserted one document, _id=" + documentToInsert._id + ", collectionName=" + collectionName);
                            resolve();
                        }
                    });
                } else {
                    reject(Error("Invalid document, missing required '_id' field"));
                }
            } else {
                reject(Error("Invalid insertOne arguments, document='" + documentToInsert + "', collectionName=" + collectionName));
            }
        });
    }
    insertWeeklyReportLog(documentToInsert) {
        return this.insertOne(this.cleanserProperties.collectionWeeklyReportsLog, documentToInsert);
    }
    insertCleansedStory(documentToInsert) {
        return this.insertOne(this.cleanserProperties.collectionCleansedItems, documentToInsert);
    }

    /**
     * Like Mongo's deleteOne, but wrapping up tiresome boilerplate for
     * increased safety and ease of use. This method has delete ONE behavior
     * ONLY, will result in an error if no document exists with the provided _id
     */
    deleteById(collectionName, id) {
        let collection = this.mongo.collection(collectionName);
        return new Promise(function(resolve, reject) {
            if (collection && id) {
                collection.deleteOne({ _id: id },
                                     function(error) {
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
        return new Promise(function(resolve, reject) {
            if (collection) {
                collection.drop(function(error) {
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
        return this.dropCollection(this.cleanserProperties.collectionBlacklistedTitles);
    }
    dropCollectionBlacklistedSites() {
        return this.dropCollection(this.cleanserProperties.collectionBlacklistedSites);
    }
    dropCollectionBlacklistedUsers() {
        return this.dropCollection(this.cleanserProperties.collectionBlacklistedUsers);
    }
    dropCollectionCleansedItems() {
        return this.dropCollection(this.cleanserProperties.collectionCleansedItems);
    }
    dropCollectionWeeklyReportsLog() {
        return this.dropCollection(this.cleanserProperties.collectionWeeklyReportsLog);
    }

    /**
     * Like Mongo's find + count, but wrapping up tiresome boilerplate for
     * increased safety and ease of use. This method will count all matches
     * for the provided query in a particular collection. If no documents
     * match the query, a count of 0 is returned.
     */
    count(collectionName, query) {
        let collection = this.mongo.collection(collectionName);
        return new Promise(function(resolve, reject) {
            if (collection && query != null) {
                collection.find(query)
                          .count(function(error, count) {
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
        return this.countAll(this.cleanserProperties.collectionCleansedItems);
    }

}

module.exports = MongoClient;