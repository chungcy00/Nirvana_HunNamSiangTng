# 富贵山庄正式后台（第一阶段）

独立 React / TypeScript / Vite 应用，沿用已确认黑白 HTML 的导航、动态编辑、分类排序、资料快速新增、图片及发布交互。使用真实 Supabase Auth、`api` RPC 和私有 Storage；没有产品演示数据、模拟角色或本地产品数据库。云南善堂只有占位页面。

## 本地运行

需要 Node 22、Docker 和本仓库的本地 Supabase 测试服务。在仓库根目录执行：

```sh
npm ci --prefix supabase/tests
npm run catalog:security:start
npm run catalog:security:migrate:local
npm ci --prefix apps/admin
npm run setup:local --prefix apps/admin
npm run admin:dev
```

访问 http://127.0.0.1:3002 。本地迁移命令只读取 `supabase/deployment-manifest.json`，拒绝远端连接和未登记历史，不会执行室内／室外待审迁移。已有本地库保留数据；不执行 reset。首次服务启动也只暂存清单中的迁移。

`setup:local` 只从被忽略的本地服务状态文件生成 `.env.local`，不会连接云端。登录必须使用真实 Auth 用户且存在有效 `private.admin_members` 绑定。运行集成测试后，本地测试账户保存在被忽略的 `work/catalog-security/admin-browser.json`，不得提交或贴到聊天中。

## 验证

开发服务运行时，从仓库根目录执行：

```sh
npm run admin:build
npm test --prefix apps/admin
npm run test:integration --prefix apps/admin
npm run test:e2e --prefix apps/admin
npm run catalog:security:test
npm run catalog:media:check
```

首次浏览器验收若缺少 Chromium，在 `apps/admin` 中运行 `npx playwright install chromium`。集成测试仅允许 localhost，创建明确标记 TEST 的独立资料、账户和测试图片；浏览器测试依赖前一步生成的账户。重复执行会保留本地测试资料，便于排查；不得将测试资料导入云端。测试包括真实数据库故障及版本竞争，不使用网络模拟代替保存。三份安全结果文件在 `tests/`。

## 环境变量与服务端边界

`.env.example` 中 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY` 可以进入浏览器。`SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY` 和 `SUPABASE_SERVICE_ROLE_KEY` 仅供同源服务端文件复制／清理接口读取。高权限密钥绝不能使用 `VITE_` 前缀或放入源码。缺少服务端配置时复制／清理明确失败，不会回退为共享图片引用或假成功。

本地开发的 Vite middleware 与 Vercel `api/` 使用同一实现，先验证用户 JWT 和有效成员，再访问私有文件。复制采用独立 UUID 路径，失败补偿；删除由数据库引用保护拦截竞争条件。浏览器没有高权限密钥，所有产品保存及发布仍由调用者 JWT、RPC、RLS 和现有事务处理。

未引用的上传文件会尝试即时清理；失败时保留重试入口。维护命令默认只读预演；`node scripts/catalog-security/cleanup-media.mjs --apply` 仅清理本地超过 24 小时、合法产品 UUID 路径下的无引用文件。远端维护还要求 `--remote` 与专用被忽略配置。第一阶段未启用远端定时任务。

## 部署准备与阶段边界

Vercel 后台项目根目录为 `apps/admin`，安装 `npm ci`，构建 `npm run build`，输出 `dist`，保留 `api/` 服务端函数及 SPA rewrite。正式环境变量、Auth 回调、真实管理员密码登录、域名与发布验收属于后续阶段；第一阶段没有创建部署、切换域名或删除旧前台。

现有云端仅部署了后台所需接口和权限增量，没有重建 18 表、添加业务字段或修改产品数据。室内／室外编辑入口明确未开放，其待审迁移未执行。前台仍保持原有实现，公开数据库接入在第五阶段。

详见仓库 `docs/第一阶段后台开发与测试报告.md` 和原实施计划。


## 第二阶段：认证验收与回调

登录、邀请／恢复链接支持固定 `/auth/callback` 与 `/reset-password`。保留 PKCE 回调，并提供“粘贴邮件链接验证”：复制尚未打开的最新恢复邮件按钮链接，使用官方 `verifyOtp({token_hash,type:'recovery'})` 验证，可跨浏览器存储使用。只接受当前项目 recovery 链接，不访问其地址或 redirect 参数，不记录链接；已消费的旧链接不能重用。原有邀请的 implicit token 也兼容。回调立即移除地址中的凭据、验证实际用户和数据库成员，禁止外部 `next` 跳转。设置密码后退出并重新登录。

跨浏览器恢复回归测试：`node apps/admin/tests/recovery-cross-browser.mjs`。依赖本地真实 Supabase、Mailpit，以及 3003 端口、使用本地公开连接且 `VITE_AUTH_VERIFICATION_ONLY=true` 的独立后台。不要更改 3002 云端验收预览的连接。测试账号只在本地创建并清理。

开发回调精确登记 `http://127.0.0.1:3002/auth/callback`、`http://127.0.0.1:3002/reset-password`，及对应 `localhost` 两项，不使用通配符。正式后台域名需在第四阶段取得后另行登记与复验。

`VITE_AUTH_VERIFICATION_ONLY=true` 是云端本人登录验收开关，仍使用真实 Auth、成员 RPC 与只读产品接口，只显示身份、角色和产品总数，没有产品操作入口；不用于正常后台部署。正常后台构建保持 `false`。验收时公开连接可指向现有云端，但不配置云端高权限密钥。

恢复本地开发：`npm run setup:local --prefix apps/admin` 会重建本地环境文件并移除验证开关，开发服务器自动重启。重新执行本地集成／浏览器测试前必须完成此步骤，不能在云端验证模式跑产品写入测试。`npm run test:auth --prefix apps/admin` 为第二阶段真实本地安全测试，依赖运行于 3002 的正常本地后台，以及由启动命令启用的本地收信箱 `http://127.0.0.1:56324`。测试邮件只留在本机，验证码和邮件链接不得提交。

本地配置中 `[auth].enable_signup=false` 禁止公开注册，`[auth.email].enable_signup=true` 保持 Email 登录提供方启用。CLI 2.78.1 若同时将两者设为 false，会连邮件登录一并关闭；不要混淆这两项。

## 第三阶段：独立资料真实集成测试

本次本地测试后台独立使用 3004，未覆盖 3002 云端验收连接。后台接口测试支持 `ADMIN_TEST_URL=http://127.0.0.1:3004`，且只接受 localhost；浏览器测试读取接口测试生成的本机私有 fixture。

云端测试 `node --import tsx tests/phase3-hosted.mjs prepare|run|cleanup` 必须从 `apps/admin` 执行；它只使用当前运行的独立白名单草稿，连接的项目 ID 固定为现有测试目标。临时服务器文件中存放服务端密钥（0600），不得使用 `VITE_` 变量；临时成员仅绑定本次测试账号。发布事务脚本必须显式回滚，避免公开测试产品；完整公开 HTTP 和图片生命周期在独立本地 Supabase 验证。复测前后必须核对原有行摘要、清理独立草稿和文件、撤销临时会话并删除测试用户、删除临时密钥及凭据。

详见 `docs/第三阶段真实Supabase集成测试报告.md` 和 `tests/phase3-hosted-*-result.json`。不要把默认本地产品写入测试直接改成云端 URL，也不要执行室内／室外待审迁移。
