"use strict";

// DEPENDENCIES
// ------------
// External
import path from "path";
import url from "url";
// Local


// CONSTANTS
// ---------

let __filename = url.fileURLToPath(import.meta.url);
let CLEANSER_ROOT_DIRECTORY_PATH = path.join(path.dirname(__filename), "../");
let SERVER_DIRECTORY_PATH = path.join(CLEANSER_ROOT_DIRECTORY_PATH, "server");

export default {
	CLEANSER_ROOT_DIRECTORY_PATH,
	SERVER_DIRECTORY_PATH
}