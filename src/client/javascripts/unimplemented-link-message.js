const NOT_IMPLEMENTED_MESSAGE = 'Not implemented yet.'

function alertInsteadOf(eventName, elements) {
  for (const element of elements) {
    element.addEventListener(eventName, (event) => {
      event.preventDefault()
      window.alert(NOT_IMPLEMENTED_MESSAGE)
    })
  }
}

// This function adds a popup alert to make it clear during testing that this is a work in progress feature and the link,
// form or checkbox is not yet expected to work.
export function unimplementedLinkMessage() {
  alertInsteadOf('click', document.querySelectorAll('a[href$="#todo"]'))
  alertInsteadOf('submit', document.querySelectorAll('form[action$="#todo"]'))
  alertInsteadOf(
    'click',
    document.querySelectorAll('input[type="checkbox"][data-todo]')
  )
}
