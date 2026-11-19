#!/usr/bin/env sh
# AI review of local changes, following .agents/skills/pr-review.
#
#   npm run review                          branch vs origin/main + uncommitted work
#   npm run review -- origin/main...HEAD    a specific git range
#
# Choose the agent (env var wins over git config):
#   PR_REVIEW_AGENT / git config pr-review.agent      claude | codex | gemini
#   PR_REVIEW_CMD   / git config pr-review.command    any command; the prompt
#                                                     is passed as its last argument
# With neither set, the first of claude, codex, gemini on PATH is used.
#
# Exit codes: 0 no Blocking findings, 1 Blocking findings, 2 review did not run.

range=$1

git fetch origin main --quiet 2>/dev/null || true

agent=${PR_REVIEW_AGENT:-$(git config --get pr-review.agent || true)}
command=${PR_REVIEW_CMD:-$(git config --get pr-review.command || true)}

if [ -z "$command" ] && [ -z "$agent" ]; then
  for candidate in claude codex gemini; do
    if command -v "$candidate" >/dev/null 2>&1; then
      agent=$candidate
      break
    fi
  done
fi

if [ -z "$command" ]; then
  case "$agent" in
    claude)
      command='claude -p --output-format stream-json --verbose --allowedTools "Read,Glob,Grep,Bash(git diff:*),Bash(git log:*),Bash(git show:*),Bash(git status:*)" --'
      formatter='node scripts/pr-review-claude-stream.mjs'
      ;;
    codex)
      command='codex exec --sandbox read-only'
      ;;
    gemini)
      command='gemini --allowed-tools "run_shell_command(git diff),run_shell_command(git log),run_shell_command(git show),run_shell_command(git status)" -p'
      ;;
    "")
      echo "pr-review: no AI agent found (set PR_REVIEW_AGENT or PR_REVIEW_CMD)"
      exit 2
      ;;
    *)
      echo "pr-review: unknown PR_REVIEW_AGENT '$agent' (use PR_REVIEW_CMD for other agents)"
      exit 2
      ;;
  esac
fi

if [ -n "$range" ]; then
  scope="the changes in git range $range"
else
  scope="the current branch against origin/main, plus uncommitted work"
fi

prompt="Review $scope by following the instructions in .agents/skills/pr-review/SKILL.md (and checklist.md beside it). Arguments: $range --verdict. This is a non-interactive run: do not ask questions, and end your output with the REVIEW_RESULT line the skill describes."

echo "pr-review: reviewing $scope with ${agent:-custom command} ..."
output_file=$(mktemp)
status_file=$(mktemp)
trap 'rm -f "$output_file" "$status_file"' EXIT
trap 'exit 130' INT TERM

# Stream output as it arrives; the pipe hides the agent's exit status, so it
# goes through a file instead.
{ eval "$command \"\$prompt\"" </dev/null || echo $? >"$status_file"; } |
  ${formatter:-cat} | tee "$output_file"

result=$(grep -E '^REVIEW_RESULT: (BLOCKING|PASS)$' "$output_file" | tail -n 1) || true

if [ -s "$status_file" ] || [ -z "$result" ]; then
  echo "pr-review: review did not complete"
  exit 2
fi

case "$result" in
  *BLOCKING*) exit 1 ;;
esac

exit 0
