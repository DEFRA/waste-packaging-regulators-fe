// This function adds a popup alert to make it clear during testing that this is a work in progress feature and the link
// or form is not yet expected to work.
export function unimplementedLinkMessage() {
  for (const link of document.querySelectorAll('a[href$="#todo"]')) {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      window.alert('Not implemented yet.')
    })
  }
  for (const form of document.querySelectorAll('form[action$="#todo"]')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      window.alert('Not implemented yet.')
    })
  }
}
