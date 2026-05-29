import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const srcDir = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm')
const dstDir = join(root, 'public', 'ffmpeg')

if (!existsSync(srcDir)) {
  console.error(`Source directory not found: ${srcDir}`)
  process.exit(1)
}

mkdirSync(dstDir, { recursive: true })

for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  copyFileSync(join(srcDir, file), join(dstDir, file))
  console.log(`Copied ${file}`)
}
