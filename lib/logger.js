var fs = require("fs");
var path = require("path");

var Readable = require("stream").Readable;
var EventEmitter = require("events").EventEmitter;

var Logger = function(options) {
	var logs = [];
	var saveLog = false;
	var logDirectory, logfileNamePattern;

	var emitter = new EventEmitter();
	emitter.setMaxListeners(0);

	saveLog = options.saveLog;
	logPath = options.logPath;
	logfileNamePattern = options.logfileNamePattern;

	function addLog(type, ip, message) {
		var now = new Date();
		var time = formatDate(now, "%Y-%m-%d %H:%i:%s");

		var symbols = {
			"error": "!",
			"log": " ",
			"info": "?"
		};
		var symbol = symbols[type];
		var logData = "[" + time + "] [" + ip + "] [" + symbol + "] " + message + "\n";

		logs.push({
			id: logs.length,
			type: type,
			ip: ip,
			time: time,
			message: message
		});

		if(saveLog) {
			var logfileName = formatDate(now, logfileNamePattern);
			var logfilePath = path.join(logPath, logfileName);

			fs.appendFileSync(logfilePath, logData, { encoding: "utf8" });
		}

		var ret = logs.length - 1;

		// process event
		emitter.emit("add", ret, logs[ret]);

		return ret;
	}

	function zeroPad(num, length) {
		var output = "" + num;
		while(output.length < length) output = "0" + num;
		return output;
	}

	function formatDate(time, format) {
		var output = format;
		output = output.replace(/%Y/g, zeroPad(time.getFullYear(), 4));
		output = output.replace(/%m/g, zeroPad(time.getMonth()+1,  2));
		output = output.replace(/%d/g, zeroPad(time.getDate(),     2));
		output = output.replace(/%H/g, zeroPad(time.getHours(),    2));
		output = output.replace(/%i/g, zeroPad(time.getMinutes(),  2));
		output = output.replace(/%s/g, zeroPad(time.getSeconds(),  2));

		return output;
	}

	function getLog(operand, index, limit) {
		if(typeof operand === "undefined" || typeof index === "undefined") {
			return false;
		}

		if(operand === "=") {
			return [logs[index]];
		}

		if(typeof limit === "undefined") {
			return false;
		}

		if(index === "last") {
			index = logs.length - 1;
		}

		var sliceStart, sliceEnd;

		switch(operand) {
		case ">=":
			sliceStart = index;
			sliceEnd = sliceStart + limit;
			break;
		case ">":
			sliceStart = index + 1;
			sliceEnd = sliceStart + limit;
			break;
		case "<":
			sliceEnd = index;
			sliceStart = sliceEnd - limit;
			if(sliceStart < 0) sliceStart = 0;
			break;
		case "<=":
			sliceEnd = index + 1;
			sliceStart = sliceEnd - limit;
			if(sliceStart < 0) sliceStart = 0;
			break;
		default:
			return false;
		}

		return logs.slice(sliceStart, sliceEnd);
	}

	return {
		add: addLog,
		get: getLog,
		on: function(event, listener) { return emitter.on(event, listener); },
		once: function(event, listener) { return emitter.once(event, listener); },
		off: function(event, listener) { return emitter.removeListener(event, listener); },
		ee: emitter
	};
};

module.exports = Logger;