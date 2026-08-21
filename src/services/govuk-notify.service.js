import { NotifyClient } from 'notifications-node-client'
import { config } from '#config/config.js'

const MAX_MARKDOWN_HEADING_LEVEL = 6
const EMAIL_LOCAL_SPECIAL_CHARS = new Set(['.', '_', '%', '+', '-'])

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function isAsciiLetter(char) {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z')
}

function isDigit(char) {
  return char >= '0' && char <= '9'
}

function isEmailLocalPartChar(char) {
  if (isAsciiLetter(char) || isDigit(char)) {
    return true
  }

  return EMAIL_LOCAL_SPECIAL_CHARS.has(char)
}

function isEmailDomainChar(char) {
  return isEmailLocalPartChar(char)
}

function isValidEmailShape(email) {
  const at = email.indexOf('@')
  if (at <= 0 || at === email.length - 1) {
    return false
  }

  const domain = email.slice(at + 1)
  const dot = domain.lastIndexOf('.')
  return dot > 0 && dot < domain.length - 1
}

function parseMarkdownHeading(line) {
  const trimmed = line.trim()
  if (!trimmed.startsWith('#')) {
    return null
  }

  let hashCount = 0
  while (
    hashCount < trimmed.length &&
    hashCount < MAX_MARKDOWN_HEADING_LEVEL &&
    trimmed[hashCount] === '#'
  ) {
    hashCount += 1
  }

  if (hashCount === 0) {
    return null
  }

  const headingText = trimmed.slice(hashCount).trimStart()
  return headingText.length > 0 ? headingText : null
}

function formatBold(text, index = 0, result = '') {
  if (index >= text.length) {
    return result
  }

  const open = text.indexOf('**', index)
  if (open === -1) {
    return result + text.slice(index)
  }

  const close = text.indexOf('**', open + 2)
  if (close === -1) {
    return result + text.slice(index)
  }

  const boldHtml = `<strong>${text.slice(open + 2, close)}</strong>`
  return formatBold(
    text,
    close + 2,
    result + text.slice(index, open) + boldHtml
  )
}

function isSafeMarkdownUrl(url) {
  const normalised = url.trim().toLowerCase()
  return (
    normalised.startsWith('https://') ||
    normalised.startsWith('http://') ||
    normalised.startsWith('mailto:')
  )
}

function formatMarkdownLinkSegment(text, index, result) {
  const openBracket = text.indexOf('[', index)
  if (openBracket === -1) {
    return result + text.slice(index)
  }

  const closeBracket = text.indexOf(']', openBracket + 1)
  const openParen =
    closeBracket === -1 ? -1 : text.indexOf('(', closeBracket + 1)
  const closeParen = openParen === -1 ? -1 : text.indexOf(')', openParen + 1)

  const isValidLink =
    closeBracket !== -1 && openParen === closeBracket + 1 && closeParen !== -1

  if (!isValidLink) {
    return formatMarkdownLinkSegment(
      text,
      openBracket + 1,
      result + text.slice(index, openBracket + 1)
    )
  }

  const label = text.slice(openBracket + 1, closeBracket)
  const url = text.slice(openParen + 1, closeParen)
  const replacement = isSafeMarkdownUrl(url)
    ? `<a href="${escapeHtml(url.trim())}">${label}</a>`
    : text.slice(openBracket, closeParen + 1)

  return formatMarkdownLinkSegment(
    text,
    closeParen + 1,
    result + text.slice(index, openBracket) + replacement
  )
}

function formatMarkdownLinks(text) {
  return formatMarkdownLinkSegment(text, 0, '')
}

function linkifyEmails(text) {
  let result = ''
  let index = 0

  while (index < text.length) {
    const at = text.indexOf('@', index)
    if (at === -1) {
      return result + text.slice(index)
    }

    let start = at - 1
    while (start >= 0 && isEmailLocalPartChar(text[start])) {
      start -= 1
    }
    start += 1

    let end = at + 1
    while (end < text.length && isEmailDomainChar(text[end])) {
      end += 1
    }

    let email = text.slice(start, end)
    while (email.length > 0 && '!.,;:?'.includes(email.at(-1))) {
      email = email.slice(0, -1)
      end -= 1
    }

    if (isValidEmailShape(email)) {
      result += text.slice(index, start)
      result += `<a href="mailto:${email}">${email}</a>`
      index = end
    } else {
      result += text.slice(index, at + 1)
      index = at + 1
    }
  }

  return result
}

function formatInlineMarkdown(text) {
  let formatted = escapeHtml(text)
  formatted = formatBold(formatted)
  formatted = formatMarkdownLinks(formatted)
  formatted = linkifyEmails(formatted)
  return formatted
}

function appendPlainTextLine(line, parts, paragraphLines, flushParagraph) {
  if (line.trim() === '') {
    flushParagraph()
  } else {
    const heading = parseMarkdownHeading(line)
    if (heading !== null) {
      flushParagraph()
      parts.push(`<h2>${formatInlineMarkdown(heading)}</h2>`)
    } else {
      paragraphLines.push(line)
    }
  }
}

function splitNotifyBodyLines(body) {
  return body.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')
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

  for (const line of splitNotifyBodyLines(body)) {
    appendPlainTextLine(line, parts, paragraphLines, flushParagraph)
  }

  flushParagraph()
  return parts.join('')
}

function normaliseH1Tags(html) {
  return html
    .replaceAll('<h1>', '<h2>')
    .replaceAll('<H1>', '<h2>')
    .replaceAll('</h1>', '</h2>')
    .replaceAll('</H1>', '</h2>')
}

function convertParagraphHeadingSegment(html, lowerHtml, index, result) {
  const openTag = '<p>'
  const closeTag = '</p>'
  const paragraphStart = lowerHtml.indexOf(openTag, index)
  if (paragraphStart === -1) {
    return result + html.slice(index)
  }

  const contentStart = paragraphStart + openTag.length
  const paragraphEnd = lowerHtml.indexOf(closeTag, contentStart)
  if (paragraphEnd === -1) {
    return result + html.slice(index)
  }

  const inner = html.slice(contentStart, paragraphEnd).trim()
  const heading = parseMarkdownHeading(inner)
  const paragraphHtml =
    heading !== null
      ? `<h2>${formatInlineMarkdown(heading)}</h2>`
      : html.slice(paragraphStart, paragraphEnd + closeTag.length)

  return convertParagraphHeadingSegment(
    html,
    lowerHtml,
    paragraphEnd + closeTag.length,
    result + html.slice(index, paragraphStart) + paragraphHtml
  )
}

function convertParagraphMarkdownHeadings(html) {
  return convertParagraphHeadingSegment(html, html.toLowerCase(), 0, '')
}

function formatNotifyHtmlBody(html) {
  return normaliseH1Tags(convertParagraphMarkdownHeadings(html))
}

export function isHtmlEmailBody(body = '') {
  const tagStart = body.indexOf('<')
  if (tagStart === -1 || tagStart === body.length - 1) {
    return false
  }

  return isAsciiLetter(body[tagStart + 1])
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
