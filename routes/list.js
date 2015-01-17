var express = require("express");
var router = express.Router();

var url = require("url");
var path = require("path");
var Util = require(__dirname + "/../lib/util");

function sendError(response, code) {
	var msg = {
		403: "Forbidden",
		404: "Not Found",
		500: "Internal Server Error"
	};

	response.status(code);

	if(msg[code]) {
		response.render("error", {title: msg[code]});
	}
	else {
		response.render("error", {title: "Error " + code});
	}
}

module.exports = function(app) {

var vfs = app.get("nfs-vfs");
var logger = app.get("nfs-logger");

router.get("*", function(request, response) {
	// Other files should be listed or served
	var parsedUrl = url.parse(request.url);
	var reqPath = decodeURIComponent(parsedUrl.pathname);
	reqPath = reqPath.replace(/\/$/, "");
	if(reqPath === "") reqPath = "/";

	// Check Permission
	var logined = request.session.loginId || "";
	var available = vfs.checkPermission(reqPath, logined);

	if(!available) {
		logger.add("error", request.ip, "Unauthorized access to " + reqPath);

		sendError(response, 403);
		return;
	}

	// Get list from vfs
	var result = vfs.get(reqPath);

	if(result.result === false) {
		logger.add("error", request.ip, "Error while getting vfs entry " + reqPath + " (" + result.errorCode + ")");

		sendError(response, result.errorCode);
		return;
	}

	if(result.type === "list") {
		var list = [];

		for(var name in result.entries) {
			var entry = result.entries[name];

			// Ignore dotfiles
			if(name.match(/^\./)) continue;

			if(entry.type === "dir") {
				list.push({
					name: name + "/",
					size: "-",
					date: entry.date
				});
			}
			else {
				list.push({
					name: name,
					size: Util.formatSize(entry.size),
					date: entry.date
				});
			}
		}

		var param = {
			directory: reqPath,
			entries: list,
			loggedIn: false,
			admin: false
		};

		if(request.session.loginId) {
			param.loggedIn = true;
		}

		if(request.session.isAdmin) {
			param.admin = true;
		}

		logger.add("log", request.ip, "Listing " + reqPath);

		response.render("list", param);
	}
	else if(result.type === "file") {
		logger.add("log", request.ip, "Serving file " + reqPath + " (" + result.location + ")");

		response.sendFile(path.basename(result.location), {
			root: path.dirname(result.location),
			dotfiles: "deny"
		}, function(err) {
			if(err) {
				if(err.code === "ECONNABORTED") {
					// Cache, not error
					return;
				}
				if(err.code === "ECONNRESET") {
					// Not error?
					return;
				}

				console.error("[!] Error while serving file " + reqPath + " (" + err.status + ")");
				console.error(response, err);
				logger.add("error", request.ip, "Error while serving file " + reqPath + " (" + err.status + ")");
				return;
			}
		});
	}
	else {
		response.sendStatus(500);
	}
});

return router;

};