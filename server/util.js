"use strict";

let minutesToMillis = function(minutes) {
    return minutes * 60000;
};
let daysToMillis = function(days) {
    return days * 86400000;
};

/**
 * Forcing request-promise to return both the image AND the headers (in case
 * an image is not returned as expected)
 */
let includeHeaders = function(body, response, resolveWithFullResponse) {
    return {
        headers: response.headers,
        data: body
    };
};

let sleepForSeconds = function(seconds) {
    return new Promise(function(resolve, reject) {
        _sleepForSeconds(
            seconds
        ).then(function() {
            resolve();
        });
    });
};
function _sleepForSeconds(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export default {
    minutesToMillis,
    daysToMillis,
    includeHeaders,
    sleepForSeconds
}