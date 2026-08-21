import { NotifyClient } from 'notifications-node-client'
import { config } from '#config/config.js'

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function isAsciiLetter(char) {
  const code = char.charCodeAt(0)
  return (code >= 97 && code <= 122) || (code >= 65 && code <= 90)
}

function isEmailLocalPartChar(char) {
  const code = char.charCodeAt(0)
  return (
    isAsciiLetter(char) ||
    (code >= 48 && code <= 57) ||
    char === '.' ||
    char === '_' ||
    char === '%' ||
    char === '+' ||
    char === '-'
  )
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
    hashCount < 6 &&
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

function formatBold(text) {
  let result = ''
  let index = 0

  while (index < text.length) {
    const open = text.indexOf('**', index)
    if (open === -1) {
      result += text.slice(index)
      break
    }

    result += text.slice(index, open)
    const close = text.indexOf('**', open + 2)
    if (close === -1) {
      result += text.slice(open)
      break
    }

    result += `<strong>${text.slice(open + 2, close)}</strong>`
    index = close + 2
  }

  return result
}

function isSafeMarkdownUrl(url) {
  const normalised = url.trim().toLowerCase()
  return (
    normalised.startsWith('https://') ||
    normalised.startsWith('http://') ||
    normalised.startsWith('mailto:')
  )
}

function formatMarkdownLinks(text) {
  let result = ''
  let index = 0

  while (index < text.length) {
    const openBracket = text.indexOf('[', index)
    if (openBracket === -1) {
      result += text.slice(index)
      break
    }

    result += text.slice(index, openBracket)
    const closeBracket = text.indexOf(']', openBracket + 1)
    const openParen =
      closeBracket === -1 ? -1 : text.indexOf('(', closeBracket + 1)
    const closeParen = openParen === -1 ? -1 : text.indexOf(')', openParen + 1)

    if (
      closeBracket === -1 ||
      openParen !== closeBracket + 1 ||
      closeParen === -1
    ) {
      result += text[openBracket]
      index = openBracket + 1
      continue
    }

    const label = text.slice(openBracket + 1, closeBracket)
    const url = text.slice(openParen + 1, closeParen)
    if (isSafeMarkdownUrl(url)) {
      result += `<a href="${escapeHtml(url.trim())}">${label}</a>`
    } else {
      result += text.slice(openBracket, closeParen + 1)
    }
    index = closeParen + 1
  }

  return result
}

function linkifyEmails(text) {
  let result = ''
  let index = 0

  while (index < text.length) {
    const at = text.indexOf('@', index)
    if (at === -1) {
      result += text.slice(index)
      break
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

function convertParagraphMarkdownHeadings(html) {
  const lowerHtml = html.toLowerCase()
  const openTag = '<p>'
  const closeTag = '</p>'
  let result = ''
  let index = 0

  while (index < html.length) {
    const paragraphStart = lowerHtml.indexOf(openTag, index)
    if (paragraphStart === -1) {
      result += html.slice(index)
      break
    }

    result += html.slice(index, paragraphStart)
    const contentStart = paragraphStart + openTag.length
    const paragraphEnd = lowerHtml.indexOf(closeTag, contentStart)
    if (paragraphEnd === -1) {
      result += html.slice(paragraphStart)
      break
    }

    const inner = html.slice(contentStart, paragraphEnd).trim()
    const heading = parseMarkdownHeading(inner)
    if (heading !== null) {
      result += `<h2>${formatInlineMarkdown(heading)}</h2>`
    } else {
      result += html.slice(paragraphStart, paragraphEnd + closeTag.length)
    }

    index = paragraphEnd + closeTag.length
  }

  return result
}

function formatNotifyHtmlBody(html) {
  return normaliseH1Tags(convertParagraphMarkdownHeadings(html))
}

export function isHtmlEmailBody(body) {
  const text = body ?? ''
  const tagStart = text.indexOf('<')
  if (tagStart === -1 || tagStart === text.length - 1) {
    return false
  }

  return isAsciiLetter(text[tagStart + 1])
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
