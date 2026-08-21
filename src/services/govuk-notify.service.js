import { NotifyClient } from 'notifications-node-client'
import { config } from '#config/config.js'

const MARKDOWN_HEADING_PATTERN = /^#{1,6}\s*([^\r\n]+)$/
const MARKDOWN_BOLD_PATTERN = /\*\*([^*]+)\*\*/g
const MARKDOWN_LINK_PATTERN =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/gi
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const NOTIFY_HEADING_IN_PARAGRAPH_PATTERN = /<p>\s*#+\s*([^<]+)\s*<\/p>/gi
const HTML_TAG_PATTERN = /<[a-z]/i
const H1_TAG_PATTERN = /<\/?h1\b/gi

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function parseMarkdownHeading(line) {
  const match = line.trim().match(MARKDOWN_HEADING_PATTERN)
  return match ? match[1].trim() : null
}

function linkifyEmails(text) {
  return text.replace(EMAIL_PATTERN, (email) => {
    return `<a href="mailto:${email}">${email}</a>`
  })
}

function formatInlineMarkdown(text) {
  let formatted = escapeHtml(text)

  formatted = formatted.replace(MARKDOWN_BOLD_PATTERN, '<strong>$1</strong>')
  formatted = formatted.replace(
    MARKDOWN_LINK_PATTERN,
    (_, label, url) => `<a href="${escapeHtml(url.trim())}">${label}</a>`
  )
  formatted = linkifyEmails(formatted)

  return formatted
}

function appendPlainTextLine(line, parts, paragraphLines, flushParagraph) {
  if (line.trim() === '') {
    flushParagraph()
    return
  }

  const heading = parseMarkdownHeading(line)
  if (heading !== null) {
    flushParagraph()
    parts.push(`<h2>${formatInlineMarkdown(heading)}</h2>`)
    return
  }

  paragraphLines.push(line)
}

function formatPlainTextNotifyBody(body) {
  const parts = []
  let paragraphLines = []

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return
    }

    parts.push(
      `<p>${paragraphLines.map(formatInlineMarkdown).join('<br>')}</p>`
    )
    paragraphLines = []
  }

  for (const line of body.split(/\r?\n/)) {
    appendPlainTextLine(line, parts, paragraphLines, flushParagraph)
  }

  flushParagraph()
  return parts.join('')
}

function formatNotifyHtmlBody(html) {
  const withHeadings = html.replace(
    NOTIFY_HEADING_IN_PARAGRAPH_PATTERN,
    (_, text) => `<h2>${formatInlineMarkdown(text.trim())}</h2>`
  )

  return withHeadings.replace(H1_TAG_PATTERN, (tag) =>
    tag.replaceAll(/h1/gi, 'h2')
  )
}

export function isHtmlEmailBody(body) {
  return HTML_TAG_PATTERN.test(body ?? '')
}

export function formatEmailBodyAsHtml(body) {
  if (!body) {
    return ''
  }

  if (isHtmlEmailBody(body)) {
    return formatNotifyHtmlBody(body)
  }

  return formatPlainTextNotifyBody(body)
}

export async function previewCancellationTemplate(templateId, personalisation) {
  const apiKey = config.get('govukNotify.apiKey')
  if (!apiKey) {
    const error = new Error('GOV.UK Notify API key is not configured')
    error.code = 'notify-not-configured'
    throw error
  }

  const client = new NotifyClient(apiKey)
  const response = await client.previewTemplateById(templateId, personalisation)
  const data = response.data ?? response
  const rawBody = data.body ?? data.text ?? ''

  return {
    subject: data.subject ?? '',
    body: formatEmailBodyAsHtml(rawBody)
  }
}
