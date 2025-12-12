# Merry Christmas (React + Vite + three)

一个炫酷的 3D 圣诞树 H5 页面：粒子树、萤火环、飘雪、星空、点击烟花与背景音乐，已针对移动端做性能与防闪烁优化。

**技术栈**
- `React 19` + `Vite`
- `three` + `@react-three/fiber` + `@react-three/drei`
- `@react-three/postprocessing` + `postprocessing`
- 包管理：`pnpm`

**主要功能**
- 粒子圣诞树（自转）、顶星发光、星空背景
- 萤火光环（柔边粒子，呼吸闪烁）
- 飘雪（PC：六角雪花 Shader；移动端：纹理雪花，避免方块伪影）
- 点击/触控烟花、背景音乐（本地音频，可切歌、音量）
- 移动端优化（降 DPR、简化后期、自动降粒子、隐藏控制面板）

---

**如何运行**
- 安装依赖（首次或更新后）
  - `corepack enable`（确保 pnpm 可用）
  - `pnpm install`
- 本地开发（PC）
  - `pnpm dev` → 打开 `http://localhost:5173`
- 局域网调试（让同事/手机访问）
  - `pnpm run dev:lan` → 通过你的局域网 IP 访问，例如 `http://10.8.16.4:5173`
  - 如端口被占用：`pnpm run dev:lan -- --port 5174`，然后用新端口访问

**生产构建与本地预览**
- 构建：`pnpm build`（输出到 `dist/`）
- 预览静态产物：
  - `pnpm preview`（本机）
  - `pnpm run preview:host`（对外局域网，默认端口 `4173`）

**对外访问（内网/外网）**
- 局域网直连：保证你的电脑与对方在同一网段/VPN，且系统防火墙允许 5173/4173 入站。
- HMR 在内网断连时：可在 `vite.config.js` 中配置 `server.hmr.host` 为你的 IP（已给出注释）。
- 生产发布：将 `dist/` 部署到任意静态服务（Nginx、OSS、静态站）。仓库包含 `vercel.json`，可一键部署到 Vercel（输出目录 `dist`）。

---

**项目脚本**（见 `package.json`）
- `dev`：本地开发
- `dev:lan`：监听 `0.0.0.0` 便于局域网访问
- `build`：打包构建
- `preview`：本地预览构建结果
- `preview:host`：预览并对局域网开放

**核心文件**
- 场景组合：`src/components/Scene.jsx`
- 粒子树：`src/components/Tree.jsx`
- 光环：`src/components/GroundRing.jsx`
- 雪花：`src/components/Snow.jsx`
- 烟花：`src/components/Fireworks.jsx`
- 音乐 Hook：`src/hooks/useBackgroundMusic.js`
- 入口 UI：`src/App.jsx`
- 样式：`src/index.css`
- Vite 配置（含局域网/注释）：`vite.config.js`

**移动端说明**
- 默认关闭 Bloom，粒子数量和尺寸收敛，雪花使用纹理精灵以避免方块伪影。
- 控制面板在移动端默认隐藏，仅保留音乐按钮与提示。

**常见问题**
- 访问不到：确认同一网段/VPN，或放行系统防火墙端口（macOS 在“系统设置-防火墙”中允许终端/Node）。
- HMR 频繁断线（内网）：在 `vite.config.js` 中将 `server.hmr.host` 设为你的 IP。
- 画面闪烁：移动端维持默认设置；如在 PC 仍出现，关闭 Bloom 或降低面板中的强度与特效数量。

欢迎继续提需求：截图分享、祝福语输入、PWA、HTTPS 与 CDN 音频等都可快速扩展。
