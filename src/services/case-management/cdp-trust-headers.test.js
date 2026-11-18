import { createHmac } from 'node:crypto'
import { describe, expect, test } from 'vitest'

import { buildCaseManagementTrustHeaders } from './cdp-trust-headers.js'

describe('buildCaseManagementTrustHeaders', () => {
  test('sets identity headers from session user', () => {
    const headers = buildCaseManagementTrustHeaders({
      sessionUser: {
        id: 'user-1',
        name: 'Alex Regulator',
        email: 'alex@example.com',
        nationId: 1
      },
      clientId: 'frontend',
      sharedSecret: ''
    })

    expect(headers).toEqual({
      'x-cdp-client-id': 'frontend',
      'x-cdp-user-id': 'user-1',
      'x-cdp-user-name': 'Alex Regulator',
      'x-cdp-user-nation': 'ENGLAND',
      'x-cdp-user-email': 'alex@example.com'
    })
  })

  test('adds HMAC headers when sharedSecret is set', () => {
    const headers = buildCaseManagementTrustHeaders({
      sessionUser: {
        id: 'user-1',
        name: 'Alex Regulator',
        email: 'alex@example.com',
        nationId: 4
      },
      clientId: 'frontend',
      sharedSecret: 'test-secret'
    })

    expect(headers['x-cdp-auth-timestamp']).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    )
    expect(headers['x-cdp-auth-nonce']).toBeTruthy()
    expect(headers['x-cdp-user-nation']).toBe('WALES')

    const payload = [
      'v3',
      'frontend',
      'user-1',
      'Alex Regulator',
      '',
      'WALES',
      'alex@example.com',
      headers['x-cdp-auth-timestamp'],
      headers['x-cdp-auth-nonce']
    ].join('\n')
    const expected = createHmac('sha256', 'test-secret')
      .update(payload)
      .digest('base64')

    expect(headers['x-cdp-auth-signature']).toBe(expected)
  })
})
