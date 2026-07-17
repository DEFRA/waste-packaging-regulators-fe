// Placeholder can links use `href="#todo"` so they're greppable and don't silently scroll to top or open new tabs.
// This function adds a popup alert to make it clear during testing that this is a work in progress feature and the link is
// not yet expected to work.
// Further explanation: https://0x5.uk/2013/05/25/unfinished-hyperlinks-add-todo/
export function unimplementedLinkMessage() {
  for (const link of document.querySelectorAll('a[href$="#todo"]')) {
    link.addEventListener('click', (event) => {
      event.preventDefault()
      window.alert('Not implemented yet.')
    })
  }
}
