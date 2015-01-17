module.exports = {
	formatSize: function(size) {
		var postfix = ["", "KB", "MB", "GB", "TB"];
		var idx;
		for(idx = 0 ; idx < postfix.length && size > 1024 ; size /= 1024, idx++);

		size = Math.round(size * 100) / 100;
		return "" + size + postfix[idx];
	}
};