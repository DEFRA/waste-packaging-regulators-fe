// Formats `claude -p --output-format stream-json --verbose` for scripts/pr-review.sh:
// each tool call as a progress line on stderr, the final review on stdout.
import { createInterface } from 'node:readline'
import { relative } from 'node:path'

const cwd = process.cwd()
const started = Date.now()

function elapsed() {
  const seconds = Math.round((Date.now() - started) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function describe({ name, input = {} }) {
  const target =
    input.file_path ?? input.path ?? input.pattern ?? input.command ?? ''
  const shown = target.startsWith(cwd) ? relative(cwd, target) : target
  return `${name} ${shown}`.trim().slice(0, 120)
}

for await (const line of createInterface({ input: process.stdin })) {
  let event
  try {
    event = JSON.parse(line)
  } catch {
    continue
  }

  if (event.type === 'assistant') {
    for (const block of event.message?.content ?? []) {
      if (block.type === 'tool_use') {
        process.stderr.write(`  [${elapsed()}] ${describe(block)}\n`)
      }
    }
  }

  if (event.type === 'result') {
    process.stderr.write(`  [${elapsed()}] done\n\n`)
    process.stdout.write(`${event.result ?? ''}\n`)
    if (event.is_error) {
      process.exitCode = 1
    }
  }
}
