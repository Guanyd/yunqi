/**
 * 在受限环境（沙箱禁止子进程、或 Vite 的 `net use` 探测被拒绝）下运行测试。
 *
 * 用法：pnpm test:restricted
 *
 * 背景：Vite 在 Windows 上启动时会执行一次 `net use` 来探测网络驱动器映射，
 * 该子进程被拒绝时抛 `Error: spawn EPERM`，vitest 直接起不来。这里通过
 * NODE_OPTIONS 预加载一个补丁，把这次探测替换成空实现，其余行为不变。
 * 在正常环境里请直接用 `pnpm test`。
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const patch = join(here, 'vitest-sandbox-patch.cjs')

const env = {
  ...process.env,
  NODE_OPTIONS: [process.env.NODE_OPTIONS, `--require=${patch}`].filter(Boolean).join(' ')
}

const args = [
  join(here, '..', 'node_modules', 'vitest', 'vitest.mjs'),
  'run',
  '--configLoader', 'native',
  '--pool', 'threads',
  '--no-file-parallelism',
  ...process.argv.slice(2)
]

const child = spawn(process.execPath, args, { stdio: 'inherit', env })

child.on('exit', code => process.exit(code ?? 1))
