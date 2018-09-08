"use strict"

const CLASS_NAME = "cleanser"

/**
 * Dependencies
 */
// Third-Party Dependencies
var request = require("request")
var url = require("url")
var jsdom = require("jsdom")
const { JSDOM } = jsdom
// Local Dependencies
var logger = require("./logger")
var mongoConnection = require("./mongoConnection")
var CONFIG = require("./config")
var tables = require("./tables")
var emailReport = require("./emailReport")

/**
 * Cleansing frequency
 */
var frequencyString = "minute"
if (CONFIG.frequencyInMinutes > 1) {
	frequencyString = CONFIG.frequencyString + " minutes"
}
logger.logInfo(CLASS_NAME, "Cleaning Hacker News every " + frequencyString + "...")

/**
 * Request templates
 */
var loginRequest = {
	url: CONFIG.hackerNewsBaseUrl + "/login",
	followAllRedirects: true,
	jar: true,
	form: {
		acct: CONFIG.username,
		pw: CONFIG.password,
		goto: "news"
	},
	headers: {
		"User-Agent": CONFIG.userAgent
	}
}
var homePageRequest = {
	url: CONFIG.hackerNewsBaseUrl,
	followAllRedirects: true,
	jar: true,
	headers: {
		"User-Agent": CONFIG.userAgent
	}
}
var hideRequest = {
	url: CONFIG.hackerNewsBaseUrl + "/hide",
	followAllRedirects: true,
	jar: true,
	form: {
		id: "",
		goto: "news",
		auth: ""
	},
	headers: {
		"User-Agent": CONFIG.userAgent
	}
}
var regexesToSkip = new Set() // If there are any regex that won't compile, then skip then for future cleansings
var titleBlacklistTypesToSkip = new Set() // If there are any title blacklist types we don't expect, skip them for future cleansings

var totalCleansedStories = 0


/******************************************
 ***             CLEANSER               ***
 ******************************************/

/**
 * Parse URL parameter values by key
 * 
 * https://stackoverflow.com/users/1045296/jolly-exe
 * https://stackoverflow.com/a/901144
 */
function getParameterByName(name, url) {
	if (!url) url = window.location.href
	name = name.replace(/[\[\]]/g, "\\$&")
	var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		results = regex.exec(url)
	if (!results) return null
	if (!results[2]) return ''
	return decodeURIComponent(results[2].replace(/\+/g, " "))
}

/**
 * Hitting Mongo for every story isn't ideal, but since the interval this will
 * be executed and the number of stories we're doing this for is trivial, it
 * can remain for now.
 *
 * If this was expected to be executed on a larger data set or at a much
 * higher frequency, Mongo's contents should be cached between the
 * frequencies.
 */
function shouldCleanseStory(title, user, source, callback) {
	mongoConnection.findAll(tables.BLACKLISTED_TITLES, function(error, titleDocuments) {
		mongoConnection.findAll(tables.BLACKLISTED_SITES, function(error, siteDocuments) {
			mongoConnection.findAll(tables.BLACKLISTED_USERS, function(error, userDocuments) {
				for (var i in userDocuments) {
					var userDocument = userDocuments[i]
					if (userDocument.user == user) {
						return callback(true, tables.BLACKLISTED_USERS)
					}
				}
				for (var i in siteDocuments) {
					var siteDocument = siteDocuments[i]
					if (siteDocument.site == source) {
						return callback(true, tables.BLACKLISTED_SITES)
					}
				}
				for (var i in titleDocuments) {
					var titleDocument = titleDocuments[i]
					if (titleDocument.type == "keyword") {
						if (new RegExp("\\b" + titleDocument.keyword + "\\b", "i").test(title)) {
							return callback(true, tables.BLACKLISTED_TITLES)
						}
					} else if (titleDocument.type == "regex") {
						if (!regexesToSkip.has(titleDocument.regex)) {
							try {
								if (new RegExp(titleDocument.regex).test(title)) {
									return callback(true, tables.BLACKLISTED_TITLES)
								}
							} catch (e) {
								logger.logError(CLASS_NAME, "shouldCleanseStory", "Couldn't parse title blacklist regex \"" + titleDocument.regex + "\", skipping")
								regexesToSkip.add(titleDocument.regex)
							}
						}
					} else {
						if (!titleBlacklistTypesToSkip.has(titleDocuments)) {
							logger.logWarning(CLASS_NAME, "Unidentified title blacklist type \"" + titleDocument.type + "\" found, skipping")
							titleBlacklistTypesToSkip.add(titleDocument.type)
						}
					}
				}
				return callback(false)
			})
		})
	})
}

/**
 * The request object will retain whatever authentication credentials a
 * successful login creates, so all we need to do is report back if it was
 * succesful or not and use the same request object for future calls if it was
 * successful.
 */
var timeAuthWasObtained
function login(callback) {
	logger.logInfo(CLASS_NAME, "Logging into Hacker News...")
	request.post(loginRequest, function(error, response, body) {
		if (error) {
			logger.logError(CLASS_NAME, "login", error)
			return callback(error)
		} else {
			timeAuthWasObtained = new Date()
			return callback(null)
		}
	})
}

/**
 * Obtains the current Hacker News home page for the logged in user
 */
function getHomePageBody(callback) {
	logger.logInfo(CLASS_NAME, "Getting current Hacker News home page...")
	request.get(homePageRequest, function(error, response, body) {
		if (error) {
			logger.logError(CLASS_NAME, "getHomePageBody", error)
			return callback(error, null)
		} else {
			timeAuthWasObtained = new Date()
			return callback(null, body)
		}
	})
}

function hideStory(storyId, auth, callback) {
	hideRequest.form.id = storyId
	hideRequest.form.auth = auth

	request.post(hideRequest, function(error, response, body) {
		if (error) {
			logger.logError(CLASS_NAME, "hideStory", error)
			return callback(error)	
		} else {
			return callback(null)
		}
	})
}

/**
 * Given the current Hackers News page contents and the logged in request
 * session, all home page contents will be cleansed by referencing the various
 * blacklist tables filled by the user.
 */
var totalCleansedStoriesFromThisPage = 0
function cleanse(homePageBody, callback) {
	logger.logInfo(CLASS_NAME, "Checking...")

	var idOfCurrentStory = ""
	var title = "Untitled"
	var storyLink = "#"
	var source = "self"

	var readingStory = false

	var dom = new JSDOM(homePageBody)
	var rows = dom.window.document.querySelectorAll("tr")
	rows.forEach(function(row) {
		var className = row.getAttribute("class")
		if ("athing" == className) {
			idOfCurrentStory = row.getAttribute("id")	

			var titleElement = row.querySelector("a.storylink")
			title = "Untitled"
			storyLink = "#"
			if (titleElement) {
				title = titleElement.textContent
				storyLink = titleElement.getAttribute("href")
			}
			var sourceElement = row.querySelector("span.sitestr")
			source = "self"
			if (sourceElement) {
				source = sourceElement.textContent
			}

			readingStory = true
		} else if (readingStory) {
			var userElement = row.querySelector("a.hnuser")
			var user = "anonymous"
			if (userElement) {
				user = userElement.textContent
			}

			/**
			 * Is this a story we want to cleanse? Or leave where it is?
			 */
			(function(sub_title, sub_storyLink, sub_user, sub_source, sub_idOfCurrentStory) {
				shouldCleanseStory(sub_title, sub_user, sub_source, function(shouldCleanse, cleansedBy) {
					if (shouldCleanse) {
						logger.logInfo(CLASS_NAME, "Cleansing new story, title=\"" + sub_title + "\" from " + sub_source)

						var actionsRowLinks = row.querySelectorAll("a")
						var authForStory = ""
						actionsRowLinks.forEach(function(link) {
							if ("hide" == link.textContent) {
								var hideLink = link.getAttribute("href")
								authForStory = getParameterByName("auth", hideLink)
								return
							}
						})

						if (!authForStory) {
							logger.logError(CLASS_NAME, "cleanse", "No auth for story \"" + sub_title + "\", has session expired?")
							logger.logError(CLASS_NAME, "cleanse", homePageBody)
							return callback(true)
						}

						/**
						 * Save the cleansed story in Mongo and *finally* hide it!
						 */
						var storyToCleanseDocument = {
							title: sub_title,
							user: sub_user,
							source: sub_source,
							storyId: sub_idOfCurrentStory,
							cleansedBy: cleansedBy,
							link: sub_storyLink,
							hideTime: new Date().getTime()
						}
						mongoConnection.insertOne(tables.CLEANSED_ITEMS, storyToCleanseDocument, function(error) {
							if (error) {
								logger.logError(CLASS_NAME, "cleanse", "Couldn't save story we'd cleanse into Mongo. "
									+ "Since having historical records of activity is important, \"" + storyToCleanseDocument.title + "\" will NOT be cleansed")
								return callback(true)
							} else {
								hideStory(storyToCleanseDocument.storyId, authForStory, function(error) {
									if (error) {
										logger.logError(CLASS_NAME, "cleanse", "\"" + storyToCleanseDocument.title + "\" failed to be hidden on Hacker News, will remove clease document from Mongo")
										mongoConnection.remove(tables.CLEASED_ITEMS, storyToCleanseDocument)
										return callback(true)
									} else {
										totalCleansedStoriesFromThisPage += 1
									}
								})
							}
						})
					} else {
						// RETRIEVE PAGE, HIDE COMMENTS FROM ALL BLOCKED USERS
					}
				})
			})(title, storyLink, user, source, idOfCurrentStory)

			readingStory = false
		}
	})
}

var cleanserMain = function() {
	logger.logInfo(CLASS_NAME, "Successfully connected to MongoDB")

	mongoConnection.countAll(tables.CLEANSED_ITEMS, function(error, count) {
		totalCleansedStories = count
		logger.logInfo(CLASS_NAME, "So far, the Hacker News Cleanser has cleansed " + totalCleansedStories + " total stories from your feed")
	})


	login(function(error) {
		if (error) {
			logger.logError(CLASS_NAME, "cleanserMain", "Login failed, please check your credentials and Hacker News endpoint")
			return
		} else {
			logger.logInfo(CLASS_NAME, "Login successful, will cleanse Hacker News every " + frequencyString)

			setInterval(function() {
				if (totalCleansedStoriesFromThisPage > 0) {
					logger.logInfo(CLASS_NAME, totalCleansedStoriesFromThisPage + " stories cleansed from previous page")
					totalCleansedStories += totalCleansedStoriesFromThisPage
					logger.logInfo(CLASS_NAME, totalCleansedStories + " total stories cleansed by the Hacker News Cleanser")
					totalCleansedStoriesFromThisPage = 0
				}

				emailReport.shouldSendCleanserReport(function(shouldSend, storiesToSend) {
				 	if (shouldSend) {
				 		logger.logInfo(CLASS_NAME, "Generating weekly email report.")
				 		emailReport.sendCleanserReport(storiesToSend, totalCleansedStories)
					}
				})

				getHomePageBody(function(error, body) {
					if (error) {
						logger.logError(CLASS_NAME, "cleanserMain", "Getting most recent Hacker News page failed, will stop for investigation")
						return
					} else {
						logger.logInfo(CLASS_NAME, "Hacker News home page obtained")
						cleanse(body, function(error) {
							logger.logInfo(CLASS_NAME, totalCleansedStoriesFromThisPage + " stories cleansed from page");
							if (error) {
								logger.logError(CLASS_NAME, "cleanserMain", "Something broke during cleansing, will stop for investigation")
								return
							}
						})
					}
				})
			}, CONFIG.frequencyInMinutes * 60 * 1000)
		}
	})
}
mongoConnection.open(mongoConnection.DEFAULT_MONGO_CONFIG, cleanserMain)
