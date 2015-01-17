var selectedVfsPath = "/";
var selectedLocalPath;
var navigateActivated = false;
var currentFormType;
var currentEntryType;

$(function() {
	$(".js-tree-vfs").jstree({
		core: {
			data: {
				url: function(node) {
					var path;
					if(node.id === "#") return "/admin/fs/get_root_vfs";
					else path = node.id;

					return "/admin/fs/get_list_vfs?path=" + encodeURIComponent(path);
				}
			}
		}
	}).on("select_node.jstree", function(e, selected) {
		var selectedNode = selected.node;
		var vfsPath = selectedNode.id;

		selectedVfsPath = vfsPath;

		$(".js-btn-edit-entry").show();

		var hasChild = $(document.getElementById(selectedVfsPath)).attr("nfsx-type") === "vdir";

		if(hasChild) $(".js-btn-new-entry").show();
		else $(".js-btn-new-entry").hide();
	});

	$(".js-btn-cancel-form").click(function() {
		$(".js-input-path, .js-input-name, .js-input-location").val("");
		$(".js-input-type").removeAttr("checked");
		$(".js-list-permission").empty();
		$(".js-form").hide();

		if(navigateActivated) {
			$(".panels-container").css("margin-left", 0);
			$(".js-tree-local").jstree("destroy");
			$(".js-btn-use").hide();
			navigateActivated = false;
		}
	});

	$(".js-btn-edit-entry").click(function() {
		$.getJSON("/admin/fs/get_info_vfs?path=" + encodeURIComponent(selectedVfsPath), function(data) {
			$(".js-form").show();
			$(".js-form").attr("action", "/admin/fs/save");
			$(".js-form input").removeClass("error");
			currentFormType = "edit";

			$(".js-input-path").val(selectedVfsPath);
			$(".js-span-path").text(selectedVfsPath);

			$(".js-list-permission").empty();

			var str = "<input type='checkbox' name='permission_$default'";
			if(data.permission.$default) str += " checked";
			str += ">Default<br>";
			$(".js-list-permission").append(str);

			var name;
			for(name in data.permission) {
				if(name === "$default") continue;
				str = "<input type='checkbox' name='permission_" + name + "'";
				if(data.permission[name]) str += " checked";
				str += ">" + name + "<br>";
				$(".js-list-permission").append(str);
			}

			$(".js-row-conditional").hide();
			$(".js-show-" + data.type).show();
			currentEntryType = data.type;

			// Root cannot be deleted
			if(selectedVfsPath === "/") {
				$(".js-btn-remove-entry").parent().hide();
			}

			if(data.type === "real") {
				$(".js-input-location").val(data.location);
			}
		});
	});

	$(".js-btn-new-entry").click(function() {
		$(".js-form").show();
		$(".js-form").attr("action", "/admin/fs/add");
		$(".js-form input").removeClass("error");
		currentFormType = "new";

		$(".js-input-path").val(selectedVfsPath);
		$(".js-span-path").text(selectedVfsPath);

		$(".js-list-permission").empty();

		var str = "<input type='checkbox' name='permission_$default'>Default<br>";
		$(".js-list-permission").append(str);

		var idx, name;
		for(idx in accounts) {
			name = accounts[idx];
			str = "<input type='checkbox' name='permission_" + name + "'>" + name + "<br>";
			$(".js-list-permission").append(str);
		}

		$(".js-row-conditional").hide();
		$(".js-show-create").show();
		$(".js-input-location").val("");
	});

	$(".js-input-type").change(function() {
		var checked = $(".js-input-type:checked").val();

		$(".js-row-conditional").hide();
		$(".js-show-create, .js-show-create-" + checked).show();
	});

	$(".js-btn-navigate").click(function() {
		if(navigateActivated) return;
		navigateActivated = true;

		$(".panels-container").css("margin-left", -480);
		$(".js-tree-local").jstree("destroy");
		$(".js-tree-local").jstree({
			core: {
				data: {
					url: function(node) {
						var path;
						if(node.id === "#") return "/admin/fs/get_root_local";
						else path = node.id;

						return "/admin/fs/get_list_local?path=" + encodeURIComponent(path);
					}
				}
			}
		}).on("select_node.jstree", function(e, selected) {
			var selectedNode = selected.node;
			var localPath = selectedNode.id;

			selectedLocalPath = localPath;

			$(".js-btn-use").text("Use " + localPath);
			$(".js-btn-use").show();
		});
	});

	$(".js-btn-use").click(function() {
		$(".js-input-location").val(selectedLocalPath);

		$(".panels-container").css("margin-left", 0);
		$(".js-tree-local").jstree("destroy");
		$(".js-btn-use").hide();
		navigateActivated = false;
	});

	$(".js-btn-cancel-navigate").click(function() {
		if(!navigateActivated) return;

		$(".panels-container").css("margin-left", 0);
		$(".js-tree-local").jstree("destroy");
		$(".js-btn-use").hide();
		navigateActivated = false;
	});

	$(".js-btn-submit").click(function() {
		// Validate
		var error = false;

		var valType = $(".js-input-type:checked").val();
		if(currentFormType === "new") {
			$(".js-input-type").removeClass("error");
			if(typeof valType === "undefined") {
				$(".js-input-type").addClass("error");
				error = true;
			}
		}

		// location can't be empty if (edit form and real) or (new form and real)
		var valLocation = $(".js-input-location").val();
		$(".js-input-location").removeClass("error");
		if(
			valLocation === "" && (
				(currentFormType === "edit" && currentEntryType === "real") ||
				(currentFormType === "new" && valType === "real")
			)
		) {
			$(".js-input-location").addClass("error");
			error = true;
		}

		if(currentFormType === "new") {
			var valName = $(".js-input-name").val();
			$(".js-input-name").removeClass("error");
			if(
				// Can't create /static and /admin
				((valName === "static" || valName === "admin") && selectedVfsPath === "/") ||
				(valName === "")
			) {
				$(".js-input-name").addClass("error");
				error = true;
			}
		}

		if(error) return;

		$(".js-form").submit();
	});

	$(".js-btn-remove-entry").click(function() {
		// Root cannot be deleted
		if(selectedVfsPath === "/") {
			return;
		}

		$(".js-form").attr("action", "/admin/fs/remove");
		$(".js-form").submit();
	});
});