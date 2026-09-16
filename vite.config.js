import { defineConfig } from 'vite'
import { NodePackageImporter } from 'sass-embedded'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const srcAssets = path.join(
  dirname,
  'node_modules',
  'govuk-frontend',
  'dist',
  'govuk',
  'assets'
)
const dest = path.join(dirname, 'src', 'client', 'static', 'assets')

try {
  fs.cpSync(srcAssets, dest, { recursive: true })
} catch (e) {
  console.warn('Failed to copy GOV.UK assets:', e)
}
export default defineConfig({
  base: '/public',
  publicDir: 'src/client/static',
  build: {
    outDir: '.public',
    manifest: true,
    rolldownOptions: {
      input: {
        htmlAssets: 'src/client/assets.html',
        application: 'src/client/javascripts/application.js',
        applicationCss: 'src/client/stylesheets/application.scss'
      }
    },
    sourcemap: true
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        importers: [new NodePackageImporter()],
        loadPaths: [
          '.',
          'node_modules',
          'src/client/stylesheets',
          'src/server',
          'src/server/common/components',
          'src/server/common/templates/partials'
        ],
        quietDeps: true,
        sourceMapIncludeSources: true,
        style: 'expanded'
      }
    },
    lightningcss: { errorRecovery: true }
  },
  // Dev server
  server: {}
})
