$(function() {
	$(".js-list-account").click(function() {
		var username = $(this).text();

		$.ajax("/admin/account/info", {
			data: { username: username },
			type: "POST",
			success: function(data) {
				if(data.result === false) return;

				$(".js-form").show();
				$(".js-input").removeAttr("disabled");

				$(".js-input-orgId").val(data.username);
				$(".js-input-newId").val(data.username);
				if(data.admin) $(".js-input-newAdmin").attr("checked", "checked");
				else $(".js-input-newAdmin").removeAttr("checked");
				$(".js-btn-remove-account").show();
			}
		});
	});

	$(".js-btn-new-account").click(function() {
		$(".js-form").show();
		$(".js-input").removeAttr("disabled");

		$(".js-input-orgId").val("");
		$(".js-input-newId").val("");
		$(".js-input-newPw").val("");
		$(".js-input-newAdmin").removeAttr("checked");
		$(".js-btn-remove-account").hide();
	});

	$(".js-btn-remove-account").click(function() {
		$(".js-form").attr("action", "/admin/account/remove");
		$(".js-form").submit();
	});
});