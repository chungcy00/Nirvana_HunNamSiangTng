# Cloudflare 前台重新部署验收

日期：2026-10-23（Asia/Kuching）。按用户授权重新部署，仅前台；Vercel 前后台保留，无域名切换、数据库写入或迁移。

## 部署配置

- 前台：https://nirvana-hnst.pages.dev/
- 仓库：chungcy00/Nirvana_HunNamSiangTng，仅此仓库授权给 Cloudflare Workers and Pages；用户完成 GitHub 验证。
- Pages 项目：nirvana-hnst，main 自动部署，仓库根目录，`npm run build`，输出 `dist`。
- 已验收部署：be14044b-840b-4653-af7e-b8d628e5f169，代码提交 6c2be4624c6fe0d0f6eb597ac356bc2365997168。
- 构建变量：VITE_SUPABASE_URL、VITE_SUPABASE_PUBLISHABLE_KEY、BUN_VERSION=1.4.4。仅公开连接配置；未配置管理员或服务端密钥。
- 首次构建因默认 Bun 1.2.15 无法读取仓库 v2 锁文件而失败；设定兼容版本后构建和部署成功，没有修改依赖或锁文件。
- public/_headers 复用现有 noindex、nosniff、strict-origin-when-cross-origin，并为带哈希的 /assets/ 输出保留一年 immutable 缓存。SPA 使用 Pages 默认回退，不新增 404.html。

## 验收结果

- 前台类型检查、100 项自动测试及构建通过；页面预加载检查通过，20 个清单资源文件存在，/assets/ 文件均带哈希。
- 历史页面拆分体积脚本仍固定校验旧 CSS 哈希 DvXrRKQF，因已有清理提交 3f44868 的 CSS 更新而失败。本次未改 CSS，也未把此项计为通过。Cloudflare 与当前本地构建的入口 JS 及 CSS 文件名一致。
- 首页、目录、筛选列表、殡仪详情、联系、关于、云南善堂共七条 HTTP 路由返回 200，具备预期安全响应头；JS/CSS 返回 200 并具备 immutable 缓存。
- 域名部署生效期间，提前发出的根路径及详情请求曾收到 522；待部署完成后，带校验查询及无查询普通路径均重新取得 200。浏览器正常直达首页，殡仪详情直接刷新成功。
- 浏览器从目录切换殡仪分类并打开现有公开详情，实际读取 Supabase 产品、价格、包含项目；适用方式显示“火化／土葬皆适用”，无图片区域。
- 问卷选择殡仪／佛教／提前规划／预算未定，显示一项真实公开结果；进入详情后浏览器后退，答案与结果均恢复。没有提交咨询或发送消息。
- 首页主图正常；页面、图片、卡片、字体、配色、动效未修改。未进行新增一轮移动 4G 性能评估或声称完整云端权限回归。

## 保留地址

- Vercel 前台：https://nirvana-hnst.vercel.app/
- Vercel 后台：https://admin-nirvana-hnst.vercel.app/

以上项目和后台 Auth 回调保持不变；没有将前台 Pages 域名加入后台登录回调。
