var fs = require("fs");

var VFS = function() {
	var version = 1, entries = {
		"": {
			type: "vdir",
			date: "1970-01-01T00:00:00.000Z",
			permission: {
				$default: true
			},
			entries: {}
		}
	};

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

	function getEntry(path) {
		var pathArr = _splitPath(path);

		var baseEntries = entries;
		var index = 0;

		while(index < pathArr.length) {
			var currentPath = pathArr[index];
			var entry = baseEntries[currentPath];

			// SHOULD exist
			if(typeof entry === "undefined") {
				return _getError(404);
			}

			// Is it a real object?
			if(entry.type === "real") {
				var realPath = entry.location;

				// SHOULD exist in real location
				if(!fs.existsSync(realPath)) {
					return _getError(410);
				}

				var stat = fs.statSync(realPath);

				// Is it a file?
				if(!stat.isDirectory()) {
					// SHOULD be end of path array
					if(index + 1 === pathArr.length) {
						return _getInfo(realPath);
					}
					else {
						return _getError(404);
					}
				}

				var pathLeft = pathArr.slice(index + 1).join("/");
				var finalPath = realPath + "/" + pathLeft;

				// SHOULD exist
				if(!fs.existsSync(finalPath)) {
					return _getError(404);
				}

				stat = fs.statSync(finalPath);

				if(stat.isDirectory()) {
					return _getList(finalPath);
				}
				else {
					return _getInfo(finalPath);
				}
			}

			// Is it a virtual directory?
			else if(entry.type === "vdir") {
				// Is it end of path array?
				if(index + 1 === pathArr.length) {
					var list = {};

					for(var name in entry.entries) {
						var tempEntry = entry.entries[name];

						if(tempEntry.type === "real") {
							try {
								list[name] = _getInfo(tempEntry.location);
							}
							catch(e) {
								console.error(e);
							}
						}
						else if(tempEntry.type === "vdir") {
							list[name] = {
								type: "dir",
								size: -1,
								date: new Date(tempEntry.date)
							};
						}
					}

					return {
						result: true,
						type: "list",
						entries: list
					};
				}

				// Forward path array's index
				index++;
				baseEntries = entry.entries;
			}
		}
	}

	function _splitPath(path) {
		var pathArr = path.match(/\/([^/]*)/g);

		pathArr = pathArr.map(function(el) {
			// Strip leading slash
			return el[0] === "/" ? el.substr(1) : el;
		});
		pathArr = pathArr.filter(function(el, idx) {
			return (
				(el !== "" || idx === 0) && // First element can be empty for root
				!el.match(/^\.+$/)          // Filter relative dot directories
			);
		});
		if(pathArr[0] !== "") {
			// Insert empty for root
			pathArr.unshift("");
		}

		return pathArr;
	}

	function _getError(errorCode) {
		var msg = {
			401: "Unauthorized",
			404: "Not found",
			410: "Gone"
		};

		return {
			result: false,
			errorCode: errorCode,
			errorMessage: msg[errorCode]
		};
	}

	function _getInfo(realPath) {
		var stat = fs.statSync(realPath);
		var ret;

		if(stat.isDirectory()) {
			ret = {
				type: "dir",
				size: -1,
				date: stat.mtime
			};
		}
		else {
			ret = {
				type: "file",
				size: stat.size,
				date: stat.mtime,
				location: realPath.replace(/\/\//g, "/")
			};
		}

		ret.result = true;

		return ret;
	}

	function _getList(realPath) {
		var _list = fs.readdirSync(realPath);
		var ret = {
			result: true,
			type: "list",
			entries: {}
		};

		for(var idx in _list) {
			var name = _list[idx];

			try {
				ret.entries[name] = _getInfo(realPath + "/" + name, false);
			}
			catch(e) { }
		}

		return ret;
	}

	function checkPermission(path, account) {
		var pathArr = _splitPath(path);

		var baseEntries = entries;
		var index = 0;
		var available = true;

		while(index < pathArr.length) {
			var currentPath = pathArr[index];
			var entry = baseEntries[currentPath];

			if(typeof entry === "undefined") break;

			var permissionList = entry.permission;

			if(typeof permissionList !== "undefined") {
				if(typeof permissionList.$default === "boolean") {
					available = permissionList.$default;
				}

				if(typeof permissionList[account] === "boolean") {
					available = permissionList[account];
				}
			}

			if(entry.type === "real") break;

			index++;
			baseEntries = entry.entries;
		}

		return available;
	}

	function getRawEntry(path) {
		var pathArr = _splitPath(path);

		var baseEntries = entries;
		var index = 0;

		while(index < pathArr.length) {
			var currentPath = pathArr[index];
			var entry = baseEntries[currentPath];

			if(typeof entry === "undefined") {
				return {
					result: false,
					errorCode: -1,
					errorMessage: "Not found"
				};
			}

			if(index + 1 === pathArr.length) {
				return entry;
			}

			if(entry.type === "real") {
				return {
					result: false,
					errorCode: -1,
					errorMessage: "Not available"
				};
			}
			else if(entry.type === "vdir") {
				index++;
				baseEntries = entry.entries;
			}
		}
	}

	function addEntry(path, newEntry, type, value) {
		if(newEntry === "") {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "New entry's name is empty"
			};
		}

		var entry = getRawEntry(path);

		if(typeof entry.result === "boolean" && entry.result === false) {
			return entry;
		}

		if(entry.type === "real") {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "Not available"
			};
		}

		if(entry.entries[newEntry]) {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "Already exists"
			};
		}

		if(type === "real") {
			entry.entries[newEntry] = {
				type: "real",
				location: value.location,
				permission: typeof value.permission === "undefined" ? {} : value.permission
			};
		}
		else if(type === "vdir") {
			entry.entries[newEntry] = {
				type: "vdir",
				date: new Date().toISOString(),
				permission: typeof value.permission === "undefined" ? {} : value.permission,
				entries: {}
			};

			entry.date = new Date().toISOString();
		}

		return true;
	}

	function updateEntry(path, value) {
		var pathArr = _splitPath(path);
		var pathParent = pathArr.slice();
		var name = pathParent.pop();

		var entry = getRawEntry("/" + pathParent.join("/"));

		if(entry.result && entry.result === false) {
			return entry;
		}

		if(entry.type === "real") {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "Not available"
			};
		}

		var targetEntry = entry.entries[name];

		if(typeof targetEntry === "undefined") {
			return {
				result: false,
				errorCode: -1,
				errorMessage: "Not found"
			};
		}

		if(value.$remove) {
			delete entry.entries[name];
			return true;
		}

		if(value.$rename) {
			if(entry.entries[value.$rename]) {
				return {
					result: false,
					errorCode: -1,
					errorMessage: "Duplicate"
				};
			}

			entry.entries[value.$rename] = targetEntry;
			delete entry.entries[name];
			targetEntry = entry.entries[value.$rename];
			name = value.$rename;
		}

		if(value.permission) {
			targetEntry.permission = value.permission;
		}

		if(targetEntry.type === "real") {
			if(value.location) {
				targetEntry.location = value.location;
			}
		}

		return true;
	}

	return {
		load: loadFromString,
		loadFile: loadFromFile,
		save: saveToString,
		saveFile: saveToFile,
		get: getEntry,
		getRaw: getRawEntry,
		checkPermission: checkPermission,
		add: addEntry,
		update: updateEntry
	};
};

module.exports = VFS;