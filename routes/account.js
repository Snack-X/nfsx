var express = require("express");
var router = express.Router();

module.exports = function(app) {

var account = app.get("nfs-account");
var logger = app.get("nfs-logger");

router.get("/login", function(request, response) {
	if(request.session.loginId) {
		response.redirect("/");
		return;
	}

	var errorCode = request.query.error;
	var errorMessage = {
		1: "ID and PW do not match",
		2: "ID and PW should not be empty"
	};

	var param = {};
	if(errorCode) {
		param.errorMessage = errorMessage[errorCode];
	}

	response.render("login", param);
});

router.post("/login", function(request, response) {
	var id = request.body.id;
	var pw = request.body.pw;

	if(id === "" || pw === "") {
		response.redirect("/account/login?error=2");
		return;
	}

	var result = account.get(id, pw);

	if(typeof result.result === "boolean" && result.result === false) {
		logger.add("info", request.ip, "Login failed for user " + id);

		response.redirect("/account/login?error=" + result.errorCode);
		return;
	}
	else {
		logger.add("log", request.ip, "Login succeeded for user " + id);

		request.session.loginId = result.username;
		request.session.isAdmin = result.admin;
		response.redirect("/");
	}
});

router.get("/logout", function(request, response) {
	request.session.destroy();
	response.redirect("/");
});

return router;

};