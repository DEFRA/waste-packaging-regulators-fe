// Resets the in-process mock backends to their base fixture state so a journey
// test can start from the same pending records. The dynamic import keeps the
// mock module out of the graph when the app is not running with useMockApi; the
// route is only registered in that mode, so the import always resolves here.
export const mockResetController = {
  async handler(_request, h) {
    const { resetMockData } = await import('#mocks/server.js')
    resetMockData()
    return h.response().code(204)
  }
}
