(function(exports) {

	exports.BLACKLISTED_TITLES = "blacklistedTitles";
	exports.BLACKLISTED_SITES = "blacklistedSites";
	exports.BLACKLISTED_USERS = "blacklistedUsers";
	exports.CLEANSED_ITEMS = "cleansedItems";
	exports.WEEKLY_REPORTS_LOG = "weeklyReportsLog";

	// ADD ANY NEW TABLES ABOVE TO THIS ARRAY!
	exports.TABLES = [exports.BLACKLISTED_TITLES,
	                  exports.BLACKLISTED_SITES,
	                  exports.BLACKLISTED_USERS,
	                  exports.CLEANSED_ITEMS,
	                  exports.WEEKLY_REPORTS_LOG];

})(typeof exports === 'undefined' ? this['tables'] = {} : exports);