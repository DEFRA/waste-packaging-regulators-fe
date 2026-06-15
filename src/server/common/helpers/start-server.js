import { createServer } from '../../server.js'

async function startServer() {
  const server = await createServer()
  await server.start()

  const port = config.get('port')
  const origin = `${server.info.protocol}://localhost:${port}`

  server.logger.info('Server started successfully')
<<<<<<< HEAD
  server.logger.info(`Access your frontend on ${server.info.uri}`)
=======
  server.logger.info(`Access your frontend on ${origin}`)
  server.logger.info(
    `Direct producers: ${origin}/certificates-of-compliance?type=direct-producers&tab=pending`
  )
  server.logger.info(
    `Compliance schemes: ${origin}/certificates-of-compliance?type=compliance-schemes&tab=pending`
  )
>>>>>>> ec54979 (AMCR-244 - Update start-server to include frontend access link and certificates URL)

  return server
}

export { startServer }
