#!/usr/bin/env sh
# Fetches a Jira issue and prints it as plain text for scripts/pr-review.sh.
#
#   sh scripts/pr-review-jira.sh AMCR-123
#
# Settings (environment variables, e.g. exported in ~/.zshrc):
#   JIRA_BASE_URL      https://api.atlassian.com/ex/jira/<cloudId> for a scoped
#                      read:jira-work token (see the README)
#   JIRA_API_TOKEN     your Jira API token (or a Data Center personal access token)
#   JIRA_EMAIL         your Jira Cloud account email; leave unset for a Data Center PAT
#   JIRA_EXTRA_FIELDS  optional comma-separated extra fields, e.g. customfield_10100
#
# Exit codes: 0 printed the issue, 1 missing settings, 2 request failed.

key=$1

base_url=$JIRA_BASE_URL
email=$JIRA_EMAIL
extra_fields=$JIRA_EXTRA_FIELDS

if [ -z "$key" ] || [ -z "$base_url" ] || [ -z "$JIRA_API_TOKEN" ]; then
  echo "pr-review-jira: needs an issue key, JIRA_BASE_URL and JIRA_API_TOKEN" >&2
  exit 1
fi

fields="summary,description,issuetype,status,labels${extra_fields:+,$extra_fields}"
url="${base_url%/}/rest/api/2/issue/$key?fields=$fields&expand=names"

# Credentials go to curl on stdin so the token never appears in `ps` output.
if [ -n "$email" ]; then
  auth="user = \"$email:$JIRA_API_TOKEN\""
else
  auth="header = \"Authorization: Bearer $JIRA_API_TOKEN\""
fi

response=$(printf '%s\n' "$auth" |
  curl --silent --show-error --fail --max-time 20 \
    --header 'Accept: application/json' --config - "$url") || {
  echo "pr-review-jira: request for $key failed" >&2
  exit 2
}

printf '%s' "$response" | node --input-type=module -e '
let input = ""
for await (const chunk of process.stdin) input += chunk
const { key, fields, names = {} } = JSON.parse(input)
const extra = (process.argv[1] ?? "").split(",").filter(Boolean)

const text = (value) =>
  value == null ? "" : typeof value === "string" ? value : JSON.stringify(value)

const lines = [
  `${key}: ${fields.summary}`,
  `Type: ${fields.issuetype?.name ?? ""}   Status: ${fields.status?.name ?? ""}`,
  ...(fields.labels?.length ? [`Labels: ${fields.labels.join(", ")}`] : []),
  "",
  "Description:",
  text(fields.description) || "(none)"
]
for (const field of extra) {
  lines.push("", `${names[field] ?? field}:`, text(fields[field]) || "(none)")
}

process.stdout.write(lines.join("\n").slice(0, 20000) + "\n")
' "$extra_fields"
