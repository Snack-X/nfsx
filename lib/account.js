var crypto = require("crypto");
var bcrypt = require("bcryptjs");
var fs = require("fs");

var Account = function() {
	var version = 1, entries = {};

	function sha256(str) {
		var hasher = crypto.createHash("sha256");
		hasher.update(str);
		var hash = hasher.digest("hex");
		return hash;
	}

	function makeHash(str) {
		var message = sha256(str);
		var hash = bcrypt.hashSync(message, 10);
		return hash;
	}

	function validateHash(str, hash) {
		var message = sha256(str);
		return bcrypt.compareSync(message, hash);
	}

	function loadFromString(str) {
		try {
			var json = JSON.parse(str);

			version = json.version;
			entries = json.entries;

			return true;
		} catch(e) {
			return false;
		}
	}

	function loadFromFile(filename) {
		try {
			var str = fs.readFileSync(filename, { encoding: "utf8" });
			return loadFromString(str);
		} catch(e) {
			return false;
		}
	}

	function saveToString() {
		var obj = {
			version: version,
			entries: entries
		};

		return JSON.stringify(obj);
	}

	function saveToFile(filename) {
		var str = saveToString();

		fs.writeFileSync(filename, str, { encoding: "utf8" });
	}

	function addAccount(username, password, isAdmin) {
		isAdmin = typeof isAdmin === "boolean" ? isAdmin : false;

		if(username === "") {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "Username is empty"
			};
		}

		if(entries[username]) {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "Duplicate"
			};
		}

		var hash = makeHash(password);

		entries[username] = {
			password: hash,
			admin: isAdmin
		};

		return true;
	}

	function getRawAccount(username) {
		if(username === "") {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "Username is empty"
			};
		}

		if(!entries[username]) {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "No such user"
			};
		}

		return entries[username];
	}

	function getAccount(username, password) {
		if(username === "") {
			return {
				result: false,
				errorCode: 2,
				errorMessage: "Username is empty"
			};
		}

		var account = entries[username];

		if(!account) {
			return {
				result: false,
				errorCode: 1,
				errorMessage: "ID and PW do not match"
			};
		}

		var passwordValid = validateHash(password, account.password);

		if(!passwordValid) {
			return {
				result: false,
				errorCode: 1,
				errorMessage: "ID and PW do not match"
			};
		}

		else {
			return {
				username: username,
				admin: account.admin
			};
		}
	}

	function updateAccount(username, value) {
		if(username === "") {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "Username is empty"
			};
		}

		if(!entries[username]) {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "No such user"
			};
		}

		if(value.username) {
			entries[value.username] = entries[username];
			delete entries[username];
			username = value.username;
		}

		if(value.password) {
			var hash = makeHash(value.password);

			entries[username].password = hash;
		}

		if(typeof value.admin === "boolean") {
			entries[username].admin = value.admin;
		}

		return true;
	}

	function removeAccount(username) {
		if(username === "") {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "Username is empty"
			};
		}

		if(!entries[username]) {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "No such user"
			};
		}

		delete entries[username];

		return true;
	}

	function getAllAccount() {
		return Object.keys(entries);
	}

	return {
		load: loadFromString,
		loadFile: loadFromFile,
		save: saveToString,
		saveFile: saveToFile,
		add: addAccount,
		get: getAccount,
		getAll: getAllAccount,
		getRaw: getRawAccount,
		update: updateAccount,
		remove: removeAccount
	};
};

module.exports = Account;