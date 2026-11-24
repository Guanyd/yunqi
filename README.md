# 孕期记录

本地孕期产检与花费记录 PWA。所有数据存在浏览器 IndexedDB 里，不上传服务器，支持导出 ZIP 备份。

## 功能

- **建立孕期**：末次月经 / 当前孕周 / 医院预产期三种方式，之后可改
- **首页**：孕周、预产期、剩余天数、最近一次产检、下次产检、花费汇总、备份提醒
- **产检记录**：增删改、检查单、检查报告照片、本次花费，删除时级联清理
- **花费**：产检内花费 + 用品花费，按分类/按月聚合
- **阶段备忘**：17 条预置产检项目，可标记已做/本院不查、编辑、删除
- **备份**：导出 ZIP（数据 + 图片），导入前完整校验，失败不动现有数据
- **四位 PIN 锁屏**：默认关闭，只存 SHA-256 校验值，错 5 次锁 60 秒

需求见 [docs/PRD.md](docs/PRD.md)。

## 开发

```bash
pnpm install
pnpm dev        # 开发服务器
pnpm build      # 生产构建（含 PWA service worker）
pnpm preview    # 预览构建产物
pnpm test       # 单元测试（vitest）
```

技术栈：Vue 3 + Vite + vue-router（hash 模式）+ Dexie（IndexedDB）+ JSZip + vite-plugin-pwa。

### 受限环境跑测试

如果 `pnpm test` 报 `Error: spawn EPERM`（Vite 启动时会执行一次 `net use`
探测网络驱动器，子进程被沙箱或安全软件拒绝），改用：

```bash
pnpm test:restricted
```

它通过预加载 `scripts/vitest-sandbox-patch.cjs` 把这次探测替换成空实现，
被测代码不变。正常环境请直接用 `pnpm test`。

## 目录

```
src/
  utils/
    db.js            Dexie 数据库定义与读写助手
    pregnancy.js     预产期算法、孕周计算、日期工具（纯函数，有单测）
    photo.js         图片压缩（长边 1600，JPEG 0.8）与存储容量检查
    backup.js        ZIP 导出/导入（导入前逐字段校验，事务原子写入）
    backupValidate.js 备份 JSON 的逐字段校验（纯函数，有单测）
    stageDefaults.js 17 条预置产检项目
  views/             首页 / 产检 / 产检详情 / 花费 / 阶段 / 我的 / 建立孕期
  components/        TabBar、PinLock、Toast
  assets/style.css   全局样式（暖色主题）
scripts/
  gen-icons.py       生成 PWA 图标（Pillow）
  run-tests.mjs      受限环境下跑测试的包装脚本
  deploy-gh-pages.sh 一键构建并部署到 GitHub Pages
  push-proxy.mjs     git TLS 不可用时的本地推送代理
tests/
  pregnancy.test.js      预产期、孕周与孕周快照单测
  backupValidate.test.js 备份校验单测
```

## 图标

图标由 `scripts/gen-icons.py` 生成，改色或改形状后重新运行即可：

```bash
python scripts/gen-icons.py
```

会输出 `public/icon-192.png`、`public/icon-512.png`、`public/apple-touch-icon.png`
以及两个 `maskable` 版本（内容收进 80% 安全区）。

## 数据与隐私

- 数据只存在当前浏览器的 IndexedDB 中，**清除浏览器数据会全部丢失**
- 换设备、换浏览器不会自动同步，只能通过导出/导入 ZIP 迁移
- 请定期导出备份；PIN 锁屏只防随手翻阅，不防技术破解
- 备份文件包含全部检查记录与照片，注意不要外传

## 部署

线上地址：<https://guanyd.github.io/yunqi/>

纯静态站点，构建产物在 `dist/`。仓库同时提供一键部署脚本：

```bash
GH_TOKEN=ghp_xxx bash scripts/deploy-gh-pages.sh
```

它依次执行 `vite build`、把 `dist/` 打成独立的 gh-pages 提交、推送到远端
`gh-pages` 分支，GitHub Pages 会自动发布。

部署到子路径（本项目是 `/yunqi/`）时，`vite.config.js` 的 `base` 与 manifest 的
`start_url` / `scope` 必须一起改；图标路径用相对路径，随 base 一起走。

> 注意：IndexedDB 按 origin 隔离。网址一旦定下来就不能再改，
> 否则手机上已有的数据会读不到（只能靠导出 ZIP 迁移）。

若本机 git 的 TLS 后端不可用（Windows 上表现为
`schannel: AcquireCredentialsHandle failed: SEC_E_NO_CREDENTIALS`），
先跑 `GH_TOKEN=... node scripts/push-proxy.mjs` 起本地转发代理，
再 `GIT_PUSH_URL=http://127.0.0.1:5299/ bash scripts/deploy-gh-pages.sh`。

PWA 与 service worker 需要 HTTPS（`localhost` 除外）。

## 安装到 iPhone

1. Safari 打开 <https://guanyd.github.io/yunqi/>
2. 点分享按钮 → 「添加到主屏幕」
3. 之后从主屏幕图标启动，即为全屏、可离线使用的独立应用

