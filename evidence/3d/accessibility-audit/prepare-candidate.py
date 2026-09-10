"""Build the narrow proposal from a hash-checked frozen Main; never edit godot/."""
from pathlib import Path
import difflib
import hashlib
import json

root = Path(__file__).resolve().parents[3]
out = Path(__file__).resolve().parent
source = (root / "godot/scripts/main.gd").read_text()
expected = "4eb4f15e2d75b6337941c6bee880e762adc8ff5f86e8d65fb5ffd63d38e4e51b"
assert hashlib.sha256(source.encode()).hexdigest() == expected, "Frozen baseline changed"
candidate = source

def replace(before, after):
    global candidate
    assert candidate.count(before) == 1, repr(before)
    candidate = candidate.replace(before, after)

replace('var modal_kind = ""\n', 'var modal_kind = ""\nvar settings_status: Label\n')
replace('func _fit_modal():\n\tif not is_instance_valid(modal): return\n', '''func _fit_modal():
\tif not is_instance_valid(modal): return
\tif modal_kind == "settings" and is_instance_valid(settings_status):
\t\tvar compact = settings_status.visible and get_viewport().get_visible_rect().size.y < 750
\t\tsettings_status.get_parent().add_theme_constant_override("separation", 8 if compact else 14)
''')
replace('\tif not save_problem.is_empty(): _body(column, save_problem)\n\tfor key in ["music", "sfx", "ambience"]:', '''\tsettings_status = _label(save_problem, 17)
\tsettings_status.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
\tsettings_status.custom_minimum_size.x = 390
\tsettings_status.visible = not save_problem.is_empty()
\tcolumn.add_child(settings_status)
\tfor key in ["music", "sfx", "ambience"]:''')
replace('func _export_save():\n', '''func _settings_notice(message: String):
\tif modal_kind != "settings" or not is_instance_valid(settings_status): return
\tsettings_status.text = message + ("\\nDevice saving is still unavailable." if not save_problem.is_empty() else "")
\tsettings_status.show()
\tcall_deferred("_fit_modal")

func _restore_settings_focus(control: Control):
\tif modal_kind == "settings" and is_instance_valid(control) and control.is_visible_in_tree(): control.grab_focus()

func _export_save():
\tvar return_focus = get_viewport().gui_get_focus_owner()
''')
replace('\t\tif save_store.export_copy(file, _payload()): _notice("A copy is saved.")\n\t\telse: _notice("The copy could not be saved. Try another folder.")\n\t\tdialog.queue_free())\n\tdialog.canceled.connect(dialog.queue_free)\n', '''\t\tif save_store.export_copy(file, _payload()): _settings_notice("A copy is saved.")
\t\telse: _settings_notice("The copy could not be saved. Try another folder.")
\t\tdialog.queue_free()
\t\t_restore_settings_focus.call_deferred(return_focus))
\tdialog.canceled.connect(func():
\t\tdialog.queue_free()
\t\t_restore_settings_focus.call_deferred(return_focus))
''')
replace('func _import_save():\n', 'func _import_save():\n\tvar return_focus = get_viewport().gui_get_focus_owner()\n')
replace('\t\telse: _notice("That is not a valid 3D courtyard save. Your progress is unchanged.")\n\t\tdialog.queue_free())\n\tdialog.canceled.connect(dialog.queue_free)\n', '''\t\telse: _settings_notice("That is not a valid 3D courtyard save. Your progress is unchanged.")
\t\tdialog.queue_free()
\t\t_restore_settings_focus.call_deferred(return_focus))
\tdialog.canceled.connect(func():
\t\tdialog.queue_free()
\t\t_restore_settings_focus.call_deferred(return_focus))
''')
(out / "main-candidate.gd").write_text(candidate)
(out / "main.patch").write_text("".join(difflib.unified_diff(source.splitlines(True), candidate.splitlines(True), fromfile="a/godot/scripts/main.gd", tofile="b/godot/scripts/main.gd")))
(out / "proposal.json").write_text(json.dumps({"baseline_main_sha256": expected, "candidate_main_sha256": hashlib.sha256(candidate.encode()).hexdigest(), "status": "Prepared; native verification pending", "scope": "Settings-local copy outcomes and dialog focus restoration; canonical runtime unchanged"}, indent=2) + "\n")
