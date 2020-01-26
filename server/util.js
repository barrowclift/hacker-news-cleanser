"use strict";

exports.minutesToMillis = function(minutes) {
    return minutes * 60000;
};
exports.daysToMillis = function(days) {
    return days * 86400000;
};

/**
 * Forcing request-promise to return both the image AND the headers (in case
 * an image is not returned as expected)
 */
exports.includeHeaders = function(body, response, resolveWithFullResponse) {
    return {
        headers: response.headers,
        data: body
    };
};