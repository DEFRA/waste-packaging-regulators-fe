import { afterEach, describe, expect, it, vi } from 'vitest'
import { unimplementedLinkMessage } from './unimplemented-link-message.js'

function fakeElement() {
  const listeners = new Map()
  return {
    addEventListener: vi.fn((name, handler) => listeners.set(name, handler)),
    fire(name) {
      const event = { preventDefault: vi.fn() }
      listeners.get(name)(event)
      return event
    }
  }
}

function givenPage(elementsBySelector) {
  globalThis.window = { alert: vi.fn() }
  globalThis.document = {
    querySelectorAll: vi.fn((selector) => elementsBySelector[selector] ?? [])
  }
}

describe('unimplementedLinkMessage', () => {
  afterEach(() => {
    delete globalThis.window
    delete globalThis.document
  })

  it.each([
    ['link', 'a[href$="#todo"]', 'click'],
    ['form', 'form[action$="#todo"]', 'submit'],
    ['checkbox', 'input[type="checkbox"][data-todo]', 'click']
  ])('stops a %s and says it is not implemented', (_, selector, eventName) => {
    // Arrange
    const element = fakeElement()
    givenPage({ [selector]: [element] })

    // Act
    unimplementedLinkMessage()
    const event = element.fire(eventName)

    // Assert
    expect(event.preventDefault).toHaveBeenCalled()
    expect(window.alert).toHaveBeenCalledWith('Not implemented yet.')
  })
})
