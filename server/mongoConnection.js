"use strict"

var mongodb = require("mongodb")

var exitHandler = require("./exitHandler")
var logger = require("./logger")
var tables = require("./tables")

const CLASS_NAME = "mongoConnection"
const DEFAULT_MONGO_CONFIG = {
    host: "127.0.0.1",
    port: 27017,
    db: "hackerNewsCleanserDb"
}

var connection = null
var plug = null

var setConfig = function(config) {
    if (config.host) {
        config.host = config.host
    }
    if (config.port) {
        config.port = config.port
    }
}

var open = function(config, accessDb) {
    if (config) {
        setConfig(config)
    }

    var url = "mongodb://" + config.host + ':' + config.port + '/' + config.db

    var mongoClient = mongodb.MongoClient
    mongoClient.connect(url, function(error, connectionBuilder) {
        if (error) {
            logger.logError(CLASS_NAME, "open", "Failed to connect to MongoDB at " + config.host + ':' + config.port + ". Error: " + error)
            close()
        } else {
            logger.logInfo(CLASS_NAME, "Connected to MongoDB at " + config.host + ':' + config.port + '.')
            connection = connectionBuilder.db(DEFAULT_MONGO_CONFIG.db)

            exitHandler.init(function() {
                setTimeout(function() {
                    close()
                }, 300)
            })

            if (accessDb) {
                accessDb()
            }

            plug = connectionBuilder
        }
    })
}

var close = function() {
    if (plug && connection) {
        plug.close()
        connection = null
        logger.logInfo(CLASS_NAME, "MongoDB connection closed")
        if (callback) {
            return callback(false)
        }
    } else {
        logger.logWarning(CLASS_NAME, "close", "MongoDB connection already closed")
        if (callback) {
            return callback(true, "MongoDB connection already closed");
        }
    }
}

var countAll = function(tableName, callback) {
    count(tableName, {}, callback);   
}

var count = function(tableName, query, callback) {
    if (connection) {
        var table = connection.collection(tableName)
        if (table) {
            table.find(query).count(function(error, count) {
                if (error) {
                    logger.logWarning(CLASS_NAME, "count", "Failed to cound data: " + error)
                    if (callback) {
                        return callback(true)
                    }
                } else if (callback) {
                    return callback(false, count)
                }
            })
        }
    } else {
        logger.logError(CLASS_NAME, "count", "Cannot count, MongoDB connection not open")
        if (callback) {
            return callback(true, "MongoDB connection not open");
        }
    }
}

var findAll = function(tableName, callback) {
    find(tableName, {}, {}, callback);
}

var find = function(tableName, query, sort, callback) {
    if (connection) {
        var table = connection.collection(tableName)
        if (table) {
            table.find(query).sort(sort).toArray(function(error, result) {
                if (error) {
                    logger.logWarning(CLASS_NAME, "find", "Failed to find data: " + error)
                    if (callback) {
                        return callback(true)
                    }
                } else if (callback) {
                    return callback(false, result)
                }
            })
        }
    } else {
        logger.logError(CLASS_NAME, "find", "Cannot find, MongoDB connection not open")
        if (callback) {
            return callback(true, "MongoDB connection not open");
        }
    }
}

var findOne = function(tableName, query, callback) {
    if (connection) {
        var table = connection.collection(tableName)
        if (table) {
            table.findOne(query, function(error, result) {
                if (error) {
                    logger.logWarning(CLASS_NAME, "find", "Failed to find data: " + error)
                    if (callback) {
                        return callback(true)
                    }
                } else if (callback) {
                    return callback(false, result)
                }
            })
        }
    } else {
        logger.logError(CLASS_NAME, "find", "Cannot find one, MongoDB connection not open")
        if (callback) {
            return callback(true, "MongoDB connection not open");
        }
    }
}

var insertOne = function(tableName, data, callback) {
    if (connection) {
        var table = connection.collection(tableName)
        if (table) {
            table.insertOne(data, function(error, result) {
                if (error) {
                    logger.logError(CLASS_NAME, "upsert", "Failed to upsert data: " + error)
                    if (callback) {
                        return callback(true)
                    }
                } else if (callback) {
                    return callback(false, result)
                }
            })
        }
    } else {
        logger.logError(CLASS_NAME, "upsert", "Cannot upsert, MongoDB connection not open")
        if (callback) {
            return callback(true, "MongoDB connection not open");
        }
    }
}

var upsertOne = function(tableName, query, updatedData, callback) {
    if (connection) {
        var table = connection.collection(tableName)
        if (table) {
            table.updateOne(query, {$set:updatedData}, {upsert:true}, function(error, result) {
                if (error) {
                    logger.logError(CLASS_NAME, "upsert", "Failed to upsert data: " + error)
                    if (callback) {
                        return callback(true)
                    }
                } else if (callback) {
                    return callback(false)
                }
            })
        }
    } else {
        logger.logError(CLASS_NAME, "upsert", "Cannot upsert, MongoDB connection not open")
        if (callback) {
            return callback(true, "MongoDB connection not open");
        }
    }
}

var remove = function(tableName, query, callback) {
    if (connection) {
        var table = connection.collection(tableName)
        if (table) {
            table.delete(query, function(error, result) {
                if (error) {
                    logger.logError(CLASS_NAME, "remove", "Failed to remove with query=\"" + query + "\": " + error)
                    if (callback) {
                        return callback(true)
                    }
                } else if (callback) {
                    return callback(false)
                }
            })
        }
    } else {
        logger.logError(CLASS_NAME, "remove", "Cannot remove using query=\"" + query + "\", MongoDB connection not open")
        if (callback) {
            return callback(true, "MongoDB connection not open");
        }
    }
}

var removeByMongoId = function(tableName, id, callback) {
    if (connection) {
        var table = connection.collection(tableName)
        if (table) {
            table.deleteOne({_id: id}, function(error, result) {
                if (error) {
                    logger.logError(CLASS_NAME, "removeByMongoId", "Failed to remove _id=\"" + id + "\": " + error)
                    if (callback) {
                        return callback(true)
                    }
                } else if (callback) {
                    return callback(false)
                }
            })
        }
    } else {
        logger.logError(CLASS_NAME, "removeByMongoId", "Cannot remove _id=\"" + id + "\", MongoDB connection not open")
        if (callback) {
            return callback(true, "MongoDB connection not open");
        }
    }
}

var dropTable = function(tableName) {
    if (connection) {
        var table = connection.collection(tableName)
        if (table) {
            table.drop(function(error, result) {
                if (error) {
                    logger.logWarning(CLASS_NAME, "dropTable", "Failed to drop table \"" + tableName + "\": " + error)
                    if (callback) {
                        return callback(true)
                    }
                } else if (callback) {
                    logger.logInfo(CLASS_NAME, "Dropped table \"" + tableName + "\"")
                    return callback(false)
                }
            })
        }
    } else {
        logger.logError(CLASS_NAME, "dropTable", "Cannot drop \"" + table + "\", MongoDB connection not open")
        if (callback) {
            return callback(true, "MongoDB connection not open");
        }
    }
}

var cleanDb = function() {
    if (connection) {
        for (var i = 0; i < tables.TABLES.length; i++) {
            dropTable(tables.TABLES[i])
        }
        if (callback) {
            return callback(false)
        }
    } else {
        logger.logError(CLASS_NAME, "cleanDb", "Cannot drop all tables, MongoDB connection not open")
        if (callback) {
            return callback(true, "MongoDB connection not open");
        }
    }
}

module.exports = {
    DEFAULT_MONGO_CONFIG: DEFAULT_MONGO_CONFIG,
    open: open,
    close: close,
    countAll: countAll,
    count: count,
    findAll: findAll,
    find: find,
    findOne: findOne,
    cleanDb: cleanDb,
    insertOne: insertOne,
    upsertOne: upsertOne,
    removeByMongoId: removeByMongoId,
    remove: remove,
    dropTable: dropTable
}
