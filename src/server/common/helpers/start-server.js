import { createServer } from '../../server.js'

async function startServer() {
  const server = await createServer()
  await server.start()

  const hostForUrl =
    server.info.host === '0.0.0.0' ? 'localhost' : server.info.host
  const origin = `${server.info.protocol}://${hostForUrl}:${server.info.port}`

  server.logger.info('Server started successfully')
  server.logger.info(`Access your frontend on ${origin}`)
  server.logger.info(
    `Direct producers: ${origin}/certificates-of-compliance?type=direct-producers&tab=pending`
  )
  server.logger.info(
    `Compliance schemes: ${origin}/certificates-of-compliance?type=compliance-schemes&tab=pending`
  )

  return server
}

export { startServer }
