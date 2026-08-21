import { NotifyClient } from 'notifications-node-client'
import { config } from '#config/config.js'

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parseMarkdownHeading(line) {
  const match = line.trim().match(/^#+\s*(.+)$/)
  return match ? match[1].trim() : null
}

function linkifyEmails(text) {
  return text.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (email) => `<a href="mailto:${email}">${email}</a>`
  )
}

function formatInlineMarkdown(text) {
  let formatted = escapeHtml(text)

  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const href = url.trim()
    if (/^(?:https?:\/\/|mailto:)/i.test(href)) {
      return `<a href="${escapeHtml(href)}">${label}</a>`
    }
    return `[${label}](${url})`
  })
  formatted = linkifyEmails(formatted)

  return formatted
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
    if (line.trim() === '') {
      flushParagraph()
      continue
    }

    const heading = parseMarkdownHeading(line)
    if (heading !== null) {
      flushParagraph()
      parts.push(`<h2>${formatInlineMarkdown(heading)}</h2>`)
      continue
    }

    paragraphLines.push(line)
  }

  flushParagraph()
  return parts.join('')
}

function formatNotifyHtmlBody(html) {
  const withHeadings = html.replace(
    /<p>\s*#+\s*(.+?)\s*<\/p>/gi,
    (_, text) => `<h2>${formatInlineMarkdown(text.trim())}</h2>`
  )

  return withHeadings.replace(/<\/?h1\b/gi, (tag) => tag.replace(/h1/i, 'h2'))
}

export function isHtmlEmailBody(body) {
  return /<\/?[a-z][\s\S]*>/i.test(body ?? '')
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
