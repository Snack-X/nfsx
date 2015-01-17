// Requires
var fs = require("fs");
var express = require("express");
var serveStatic = require("serve-static");
var swig = require("swig");
var session = require("express-session");
var bodyParser = require("body-parser");

var vfs = require(__dirname + "/lib/vfs")();
var account = require(__dirname + "/lib/account")();
var Logger = require(__dirname + "/lib/logger");


// Variables
var config = require(__dirname + "/data/config.json");
var port = config.port;


// Initialize
var app = express();

app.set("trust proxy", config.trustProxy);
app.set("x-powered-by", false);

app.use("/static", serveStatic("static"));

swig.setDefaultTZOffset(new Date().getTimezoneOffset());
app.engine("html", swig.renderFile);
app.set("view engine", "html");
app.set("views", __dirname + "/template");

app.set("view cache", false);
swig.setDefaults({ cache: false });

app.use(session({
	secret: config.secret,
	resave: false,
	saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: false }));

var vfsFile = __dirname + "/data/fs.json";
var accountFile = __dirname + "/data/account.json";
var loadResult;

loadResult = vfs.loadFile(vfsFile);
if(!loadResult) {
	console.error("[!] Error loading vfs file");

	if(!fs.existsSync(vfsFile)) {
		console.error("[!] " + vfsFile + " is not found");
		console.log("[!] Create file with default value");
		vfs.saveFile(vfsFile);
	}
}

app.set("nfs-vfs", vfs);

loadResult = account.loadFile(accountFile);
if(!loadResult) {
	console.error("[!] Error loading account file");

	if(!fs.existsSync(accountFile)) {
		console.error("[!] " + accountFile + " is not found");
		console.log("[!] Create file with default value");
		account.add("admin", "admin", true);
		account.saveFile(accountFile);
	}
}
app.set("nfs-account", account);

var logger = new Logger({
	saveLog: true,
	logPath: __dirname + "/log",
	logfileNamePattern: "%Y-%m-%d.log"
});
app.set("nfs-logger", logger);


// Local variables
app.locals = {
	nfsx: {
		version: "v1.0.0",
		vfsFile: vfsFile,
		accountFile: accountFile
	}
};


// Routing
app.get("/static", function(request, response) {
	// Static files go to /static, and folder itself should be forbidden
	response.sendStatus(403);
});

app.get("/static/*", function(request, response) {
	// If non-existing static file is requested, it sends 404
	response.sendStatus(404);
});

app.use("/account", require("./routes/account")(app));
app.use("/admin", require("./routes/admin")(app));
app.use("/", require("./routes/list")(app)); // ALWAYS LAST


// Server
var server = app.listen(port, function() {
	console.log("[ ] NFSX is running at port " + port);
});
