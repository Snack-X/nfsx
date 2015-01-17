var express = require("express");
var fs = require("fs");
var router = express.Router();

module.exports = function(app) {

var account = app.get("nfs-account");
var vfs = app.get("nfs-vfs");
var logger = app.get("nfs-logger");

router.use(function(request, response, next) {
	if(!request.session.isAdmin) {
		logger.add("info", request.ip, "Unauthorized admin page access");

		response.redirect("/");
		return;
	}

	next();
});

router.get("/", function(request, response) {
	response.redirect("/admin/index");
});

router.get("/index", function(request, response) {
	response.render("admin_index");
});

router.get("/account", function(request, response) {
	var accounts = account.getAll();
	var param = {
		accounts: accounts
	};

	response.render("admin_account", param);
});

router.post("/account/info", function(request, response) {
	var username = request.body.username;
	if(typeof username === "undefined" || username === "") {
		response.jsonp({
			result: false
		});
		return;
	}

	var user = account.getRaw(username);

	if(typeof user.result === "boolean" && user.result === false) {
		response.jsonp({
			result: false
		});
		return;
	}

	response.json({
		result: true,
		username: username,
		admin: user.admin
	});
});

router.post("/account/save", function(request, response) {
	var username = request.body.orgId;
	var newId = request.body.newId;
	var newPw = request.body.newPw;
	var newAdmin = request.body.newAdmin;
	newAdmin = typeof newAdmin !== "undefined";

	var user = account.getRaw(username);
	var logout = false;

	if(username === "") {
		// new user
		if(newId !== "" && newPw !== "") {
			account.add(newId, newPw, newAdmin);
		}
		
		account.saveFile(app.locals.nfsx.accountFile);
		response.redirect("/admin/account");
	}
	else {
		// change user
		if(typeof user.result === "boolean" && user.result === false) {
			// error
			response.redirect("/admin/account");
			return;
		}

		account.update(username, { admin: newAdmin });

		if(newPw !== "") {
			account.update(username, { password: newPw });
			logout = true;
		}

		if(newId !== username) {
			account.update(username, { username: newId });
			logout = true;
		}

		account.saveFile(app.locals.nfsx.accountFile);

		if(logout) {
			response.redirect("/account/logout");
			return;
		}

		response.redirect("/admin/account");
	}
});

router.post("/account/remove", function(request, response) {
	var username = request.body.orgId;

	if(username === "") {
		response.redirect("/admin/account");
		return;
	}

	account.remove(username);
	account.saveFile(app.locals.nfsx.accountFile);

	if(request.session.loginId === username) {
		response.redirect("/account/logout");
	}
	else {
		response.redirect("/admin/account");
	}
});

router.get("/fs", function(request, response) {
	var accounts = account.getAll();
	var param = {
		accounts: accounts
	};

	response.render("admin_fs", param);
});

router.get("/fs/get_list_vfs", function(request, response) {
	var path = request.query.path;

	var result = vfs.getRaw(path);
	if(result.result === false || result.type === "real") {
		response.end();
		return;
	}

	var jstreeArr = [];

	for(var name in result.entries) {
		var entry = result.entries[name];
		var id = path + "/" + name;
		id = id.replace(/\/\//g, "/");

		jstreeArr.push({
			id: id,
			text: name,
			children: entry.type === "vdir",
			li_attr: {"nfsx-type": entry.type}
		});
	}

	response.json(jstreeArr);
});

router.get("/fs/get_list_local", function(request, response) {
	var path = request.query.path;

	var result = fs.readdirSync(path);

	var jstreeArr = [];
	for(var idx in result) {
		var name = result[idx];
		if(name[0] === ".") continue;

		var fullPath = path + "/" + name;
		fullPath = fullPath.replace(/\/\//g, "/");

		try {
			var stat = fs.statSync(fullPath);
			jstreeArr.push({
				id: fullPath,
				text: name,
				children: stat.isDirectory(),
				li_attr: {"nfsx-type": stat.isDirectory() ? "dir" : "file"}
			});
		} catch(e) { }
	}

	response.json(jstreeArr);
});

router.get("/fs/get_root_vfs", function(request, response) {
	response.json([{
		id: "/",
		text: "/",
		children: true,
		li_attr: {"nfsx-type": "vdir"}
	}]);
});

router.get("/fs/get_root_local", function(request, response) {
	var isWin = process.platform === "win32";

	var jstreeArr = [];

	if(isWin) {
		for(var i = 65 ; i <= 90 ; i++) {
			var letter = String.fromCharCode(i);

			if(fs.existsSync(letter + ":/")) {
				jstreeArr.push({
					id: letter + ":/",
					text: letter + ":/",
					children: true,
					li_attr: {"nfsx-type": "dir"}
				});
			}
		}
	}
	else {
		jstreeArr.push({
			id: "/",
			text: "/",
			children: true
		});
	}

	response.json(jstreeArr);
});

router.get("/fs/get_info_vfs", function(request, response) {
	var path = request.query.path;

	var result = vfs.getRaw(path);
	if(result.result === false) {
		response.end();
		return;
	}

	var output = {
		type: result.type,
		date: result.date,
		permission: result.permission
	};

	if(result.type === "real") {
		output.location = result.location;
	}

	var accounts = account.getAll();
	for(var idx in accounts) {
		var name = accounts[idx];
		output.permission[name] = vfs.checkPermission(path, name);
	}
	output.permission.$default = vfs.checkPermission(path, "$default");

	response.json(output);
});

router.post("/fs/save", function(request, response) {
	var path = request.body.path;
	var location = request.body.location;
	var permissions = {
		$default: typeof request.body.permission_$default !== "undefined"
	};

	var accounts = account.getAll();
	for(var idx in accounts) {
		var accountName = accounts[idx];
		permissions[accountName] = typeof request.body["permission_" + accountName] !== "undefined";
	}

	var entry = vfs.getRaw(path);

	if(entry.result && entry.result === false) {
		response.redirect("/admin/fs");
		return;
	}

	vfs.update(path, { permission: permissions });

	if(entry.type === "real") {
		// location can't be empty
		if(location === "") {
			response.redirect("/admin/fs");
			return;
		}

		if(entry.location !== location) {
			vfs.update(path, { location: location });
		}
	}

	vfs.saveFile(app.locals.nfsx.vfsFile);

	response.redirect("/admin/fs");
});

router.post("/fs/add", function(request, response) {
	var path = request.body.path;
	var name = request.body.name;
	var type = request.body.type;
	var location = request.body.location;
	var permissions = {
		$default: typeof request.body.permission_$default !== "undefined"
	};

	// Can't create /static and /admin
	if((name === "static" || name === "admin") && path === "/") {
		response.redirect("/admin/fs");
		return;
	}

	var accounts = account.getAll();
	for(var idx in accounts) {
		var accountName = accounts[idx];
		permissions[accountName] = typeof request.body["permission_" + accountName] !== "undefined";
	}

	var entry = vfs.getRaw(path);

	if(entry.result && entry.result === false) {
		response.redirect("/admin/fs");
		return;
	}

	var addValue = { permission: permissions };
	if(type === "real") {
		// location can't be empty
		if(location === "") {
			response.redirect("/admin/fs");
			return;
		}
		
		addValue.location = location;
	}
	vfs.add(path, name, type, addValue);
	vfs.saveFile(app.locals.nfsx.vfsFile);

	response.redirect("/admin/fs");
});

router.post("/fs/remove", function(request, response) {
	var path = request.body.path;

	var entry = vfs.getRaw(path);

	if(entry.result && entry.result === false) {
		response.redirect("/admin/fs");
		return;
	}

	// Root cannot be deleted
	if(path === "/") {
		response.redirect("/admin/fs");
		return;
	}

	vfs.update(path, { $remove: true });
	vfs.saveFile(app.locals.nfsx.vfsFile);

	response.redirect("/admin/fs");
});

router.get("/log", function(request, response) {
	response.render("admin_log");
});

router.post("/log/poll", function(request, response) {
	var last = request.body.last;
	last = parseInt(last, 10);

	var result = logger.get(">", last, 10);
	if(result.length > 0) {
		response.json(result);
		return;
	}

	logger.once("add", function(id, log) {
		if(response.headersSent) return;

		response.json([{
			id: id,
			type: log.type,
			ip: log.ip,
			time: log.time,
			message: log.message
		}]);
	});

	// Connection lasts 60 seconds
	setTimeout(function() {
		if(response.headersSent) return;

		response.json(false);
	}, 60 * 1000);
});

router.post("/log/get", function(request, response) {
	var operand = request.body.operand;
	var index = request.body.index;
	var limit = request.body.limit;

	if(index !== "last") index = parseInt(index, 10);
	limit = parseInt(limit, 10);

	var result = logger.get(operand, index, limit);
	response.json(result);
});

return router;

};