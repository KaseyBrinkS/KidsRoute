import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')
const iconSvg = readFileSync(join(publicDir, 'icon.svg'))

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  const png = await sharp(iconSvg).resize(size, size).png().toBuffer()
  writeFileSync(join(publicDir, name), png)
  console.log(`Wrote public/${name} (${size}x${size})`)
}
