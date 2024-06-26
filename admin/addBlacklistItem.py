#!/usr/bin/env python3
#
# Adds the specified items to the appropriate blacklist collection

import sys
import argparse
import pymongo

parser = argparse.ArgumentParser(description="Adds the specified items to the appropriate Mongo blacklist collection")
parser.add_argument("-t", "--text", required=False, nargs='+', action="store", dest="text", metavar='string', help="Blacklist stories if their title contains this text anywhere. This will block words that contain this text as a substring (e.g. the text \"gpt\" will match stories containing \"GPT\", \"GPT3.5\", etc.)")
parser.add_argument("-k", "--keyword", required=False, nargs='+', action="store", dest="keyword", metavar='string', help="Blacklist stories if their title contains this exact string. This will not block words that contain the keyword as a substring (e.g. the keyword \"trump\" will not match stories containing the word \"trumpet\")")
parser.add_argument("-r", "--regex", required=False, nargs='+', action="store", dest="regex", metavar='string', help="Blacklist stories if their title matches this regex. Regex must be Javascript flavored")
parser.add_argument("-s", "--site", required=False, nargs='+', action="store", dest="site", metavar='string', help="Blacklist stories if they're from this source (e.g. \"newyorker.com\")")
parser.add_argument("-u", "--user", required=False, nargs='+', action="store", dest="user", metavar='string', help="Blacklist all stories added by a particular user")
args = parser.parse_args()

if not args.text and not args.keyword and not args.regex and not args.user and not args.site:
    print("You must at least one item to blacklist\n")
    parser.print_help()
    sys.exit(1)

client = pymongo.MongoClient()
db = client["hackerNewsCleanserDb"]
if args.text or args.keyword or args.regex:
	blacklistedTitlesCollection = db["blacklistedTitles"]

	if args.text:
		textToAdd = []
		for text in args.text:
			exists = blacklistedTitlesCollection.count_documents({"text":text}) != 0
			if exists:
				print("Title text \"{}\" is already blacklisted".format(keyword))
			else:
				textDocument = {
					"text": text,
					"type": "text"
				}
				textToAdd.append(textDocument)
		if textToAdd:
			blacklistedTitlesCollection.insert_many(textToAdd)
	if args.keyword:
		keywordsToAdd = []
		for keyword in args.keyword:
			exists = blacklistedTitlesCollection.count_documents({"keyword":keyword}) != 0
			if exists:
				print("Title keyword \"{}\" is already blacklisted".format(keyword))
			else:
				keywordDocument = {
					"keyword": keyword,
					"type": "keyword"
				}
				keywordsToAdd.append(keywordDocument)
		if keywordsToAdd:
			blacklistedTitlesCollection.insert_many(keywordsToAdd)
	if args.regex:
		regexsToAdd = []
		for r in args.regex:
			exists = blacklistedTitlesCollection.count_documents({"regex":r}) != 0
			if exists:
				print("Title regex \"{}\" is already blacklisted".format(r))
			else:
				regexDocument = {
					"regex": r,
					"type": "regex"
				}
				regexsToAdd.append(regexDocument)
		if regexsToAdd:
			blacklistedTitlesCollection.insert_many(regexsToAdd)
if args.site:
	blacklistedSitesCollection = db["blacklistedSites"]
	sitesToAdd = []
	for site in args.site:
		exists = blacklistedSitesCollection.count_documents({"site":site}) != 0
		if exists:
			print("Site \"{}\" is already blacklisted".format(site))
		else:
			siteDocument = {
				"site": site
			}
			sitesToAdd.append(siteDocument)
	if sitesToAdd:
		blacklistedSitesCollection.insert_many(sitesToAdd)
if args.user:
	blacklistedUsersCollection = db["blacklistedUsers"]
	usersToAdd = []
	for user in args.user:
		exists = blacklistedUsersCollection.count_documents({"user":user}) != 0
		if exists:
			print("User \"{}\" is already blacklisted".format(user))
		else:
			userDocument = {
				"user": user
			}
			usersToAdd.append(userDocument)
	if usersToAdd:
		blacklistedUsersCollection.insert_many(usersToAdd)
