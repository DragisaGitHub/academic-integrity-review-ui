#!/bin/sh
set -eu

runtime_config_path="/usr/share/nginx/html/runtime-config.js"
api_base_url="${API_BASE_URL:-}"
escaped_api_base_url=$(printf '%s' "$api_base_url" | sed 's/[\\&]/\\&/g; s/"/\\"/g')

cat > "$runtime_config_path" <<EOF
window.__APP_CONFIG__ = {
  API_BASE_URL: "$escaped_api_base_url",
};
EOF