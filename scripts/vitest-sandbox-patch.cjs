// 沙箱环境（以及部分受限 Windows 环境）禁止 Vite 启动时执行的 `net use` 探测，
// 会抛出 `Error: spawn EPERM` 让 vitest 无法启动。此预加载脚本把该探测替换成
// 空实现，让测试可以正常跑起来。仅用于本机受限环境，不改变被测代码。
const childProcess = require('node:child_process')

const originalExec = childProcess.exec
childProcess.exec = function patchedExec(command, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }
  if (typeof command === 'string' && command.trim().toLowerCase().startsWith('net use')) {
    if (typeof callback === 'function') process.nextTick(() => callback(null, '', ''))
    const { EventEmitter } = require('node:events')
    const fake = new EventEmitter()
    fake.kill = () => {}
    return fake
  }
  return originalExec.call(this, command, options, callback)
}
