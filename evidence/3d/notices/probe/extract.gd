extends SceneTree
func _initialize() -> void:
	var result := {
		"engine": Engine.get_version_info(),
		"license_text": Engine.get_license_text(),
		"licenses": Engine.get_license_info(),
		"components": Engine.get_copyright_info(),
		"default_font": ThemeDB.fallback_font.get_font_name(),
		"default_font_style": ThemeDB.fallback_font.get_font_style_name()
	}
	var file := FileAccess.open(OS.get_cmdline_user_args()[0], FileAccess.WRITE)
	if file == null:
		quit(1)
		return
	file.store_string(JSON.stringify(result, "  ") + "\n")
	file.close()
	quit()
