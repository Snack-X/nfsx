var lastLog = -1, backlogAvailable = false;

var LASTLOG = 30, BACKLOG = 10;

$(function() {
	function getLogItem(log) {
		var $el = $("<div class='log-item'>").data("id", log.id);
		$el.append($("<span class='type'>").addClass(log.type));
		$el.append($("<span class='ip'>").text(log.ip));
		$el.append($("<span class='time'>").text(log.time));
		$el.append($("<span class='message'>").text(log.message));

		return $el;
	}

	function pollLog() {
		$.post("/admin/log/poll", { last: lastLog }, function(data) {
			if(data !== false) {
				for(var idx in data) {
					lastLog = data[idx].id;
					$(".log-area").append(getLogItem(data[idx]));
				}
			}

			pollLog();
		});
	}

	var lastlogData = {
		operand: "<=",
		index: "last",
		limit: LASTLOG
	};

	$.post("/admin/log/get", lastlogData, function(data) {
		for(var idx in data) {
			lastLog = data[idx].id;
			$(".log-area").append(getLogItem(data[idx]));
		}

		backlogAvailable = true;
		$(".js-btn-backlog").removeClass("btn-gray");

		pollLog();
	});

	$(".js-btn-backlog").click(function() {
		if(!backlogAvailable) return;

		backlogAvailable = false;
		$(".js-btn-backlog").addClass("btn-gray");

		var topLog = $(".log-area .log-item").eq(1);
		var backlogData = {
			operand: "<",
			index: topLog.data("id"),
			limit: BACKLOG
		};

		$.post("/admin/log/get", backlogData, function(data) {
			data = data.reverse();

			for(var idx in data) {
				lastLog = data[idx].id;
				$(".js-log-point").after(getLogItem(data[idx]));
			}

			backlogAvailable = true;
			$(".js-btn-backlog").removeClass("btn-gray");
		});
	});
});