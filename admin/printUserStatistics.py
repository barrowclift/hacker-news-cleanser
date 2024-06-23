#!/usr/bin/env python3

import sys
import operator
from pymongo import MongoClient

client = MongoClient("localhost:27017")
db = client.hackerNewsCleanserDb

distribution = {}
cursor = db.cleansedItems.find()
for cleansedItem in cursor:
	user = cleansedItem["user"]
	if user in distribution:
		distribution[user] += 1
	else:
		distribution[user] = 1

cursor = db.blacklistedUsers.find()
for blacklistedUser in cursor:
	user = blacklistedUser["user"]
	if user in distribution:
		distribution.pop(user, None)

sortedDistribution = sorted(distribution.items(), key=operator.itemgetter(1), reverse=True)
maxPrint = 10
count = 0
for entry in sortedDistribution:
	print("%s:%d" % (entry[0], entry[1]))
	count += 1
	if count >= maxPrint:
		break
