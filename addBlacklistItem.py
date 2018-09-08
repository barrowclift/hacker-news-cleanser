#!/usr/local/bin/python3
# 
# Adds the specified items to the appropriate blacklist collection

import sys
import argparse
import pymongo

parser = argparse.ArgumentParser(description="Adds the specified items to the appropriate Mongo blacklist collection")
parser.add_argument("-k", "--keyword", required=False, nargs='+', action="store", dest="keyword", metavar='string', help="Blacklist stories if their title contains this exact string (e.g. \"Trump\"). This will not block words that contain the keyword as a substring (e.g. \"trumpet\")")
parser.add_argument("-r", "--regex", required=False, nargs='+', action="store", dest="regex", metavar='string', help="Blacklist stories if their title matches this regex. Regex must be Javascript flavored")
parser.add_argument("-s", "--site", required=False, nargs='+', action="store", dest="site", metavar='string', help="Blacklist stories if they're from this source (e.g. \"newyorker.com\")")
parser.add_argument("-u", "--user", required=False, nargs='+', action="store", dest="user", metavar='string', help="Blacklist all stories added by a particular user")
args = parser.parse_args()

if not args.keyword and not args.regex and not args.user and not args.site:
    print("You must at least one item to blacklist\n")
    parser.print_help()
    sys.exit(1)

client = pymongo.MongoClient()
db = client["hackerNewsCleanserDb"]
if args.keyword or args.regex:
	blacklistedTitlesCollection = db["blacklistedTitles"]

	if args.keyword:
		keywordsToAdd = []
		for keyword in args.keyword:
			keywordDocument = {
				"keyword": keyword,
				"type": "keyword"
			}
			keywordsToAdd.append(keywordDocument)
		blacklistedTitlesCollection.insert_many(keywordsToAdd)
	if args.regex:
		regexsToAdd = []
		for r in args.regex:
			regexDocument = {
				"regex": r,
				"type": "regex"
			}
			regexsToAdd.append(regexDocument)
		blacklistedTitlesCollection.insert_many(regexsToAdd)
if args.site:
	blacklistedSitesCollection = db["blacklistedSites"]
	sitesToAdd = []
	for site in args.site:
		siteDocument = {
			"site": site
		}
		sitesToAdd.append(siteDocument)
	blacklistedSitesCollection.insert_many(sitesToAdd)
if args.user:
	blacklistedUsersCollection = db["blacklistedUsers"]
	usersToAdd = []
	for user in args.user:
		userDocument = {
			"user": user
		}
		usersToAdd.append(userDocument)
	blacklistedUsersCollection.insert_many(usersToAdd)
