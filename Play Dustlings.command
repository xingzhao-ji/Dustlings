#!/bin/zsh
set -eu
task_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
exec node "$task_dir/tools/launch-rpg.mjs" "$@"
