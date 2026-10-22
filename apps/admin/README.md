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
