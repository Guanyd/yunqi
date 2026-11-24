// 推送代理：把 git 的 smart-HTTP 请求转发给 GitHub，并附上 token。
//
// 背景：本机 git 的 schannel TLS 后端不可用
// （`AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`），
// 而 Node 的 fetch（OpenSSL）可以正常访问 api.github.com / github.com。
// 因此由本代理承担 TLS 与鉴权，git 只对本机 http://127.0.0.1:PORT 说话。
//
// 用法：GH_TOKEN=ghp_xxx node scripts/push-proxy.mjs [port]
// 环境变量 GIT_REMOTE 可覆盖目标仓库地址。
const OWNER = process.env.GIT_OWNER || 'Guanyd'
const REPO = process.env.GIT_REPO || 'yunqi'
const REMOTE = process.env.GIT_REMOTE || `https://github.com/${OWNER}/${REPO}.git`
const PORT = Number(process.argv[2] || process.env.GIT_PROXY_PORT || 5299)

const token = process.env.GH_TOKEN
if (!token) {
  console.error('缺少 GH_TOKEN 环境变量（GitHub Personal Access Token，需要 repo 权限）')
  process.exit(1)
}

const { createServer } = await import('node:http')

const server = createServer(async (req, res) => {
  const chunks = []
  for await (const c of req) chunks.push(c)

  const headers = {
    Authorization: 'Basic ' + Buffer.from(`${OWNER}:${token}`).toString('base64'),
    'User-Agent': 'git/2.56.0',
  }
  for (const k of ['content-type', 'accept', 'git-protocol', 'content-encoding']) {
    if (req.headers[k]) headers[k] = req.headers[k]
  }

  try {
    const upstream = await fetch(REMOTE + req.url, {
      method: req.method,
      headers,
      body: chunks.length ? Buffer.concat(chunks) : undefined,
    })
    const buf = Buffer.from(await upstream.arrayBuffer())
    const out = {}
    for (const k of ['content-type', 'cache-control']) {
      const v = upstream.headers.get(k)
      if (v) out[k] = v
    }
    res.writeHead(upstream.status, out)
    res.end(buf)
  } catch (e) {
    res.writeHead(502).end('proxy error: ' + e.message)
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`push proxy on http://127.0.0.1:${PORT} -> ${REMOTE}`)
})
