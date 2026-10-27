# 身后事 · 皆可托

面向电脑、平板和手机的身后规划资讯与产品咨询网站。使用 React、Vite、TypeScript 和 React Router；富贵山庄前台与独立产品管理后台均已接入现有 Supabase。

状态更新：2026-10-24。本文说明当前实现；早期原型、阶段测试及需求记录均按各自日期阅读，不代表当前产品数量、售价或发布批准。

## 已部署服务

| 服务 | 代码目录 | 地址 |
| --- | --- | --- |
| 前台 Vercel | 仓库根目录 | https://nirvana-hnst.vercel.app/ |
| 前台 Cloudflare Pages（并行保留） | 仓库根目录 | https://nirvana-hnst.pages.dev/ |
| 后台 Vercel | `apps/admin` | https://admin-nirvana-hnst.vercel.app/ |
| 数据库、登录及图片存储 | 现有 Supabase 项目 | 18 张业务表，复用现有 Auth、RLS、Storage、审计及授权 RPC |

仓库：`chungcy00/Nirvana_HunNamSiangTng`。2026-10-24 的前后台修正已合并到 `main` 并完成 Vercel 正式验收，功能提交为 `b641f1c`。前台 Pages 重新部署记录见 [Cloudflare 验收](docs/Cloudflare前台重新部署验收.md)；本轮正式浏览器验收覆盖 Vercel 前后台，不将旧 Pages 验收记录当作本轮结果。

## 当前功能与资料来源

- 富贵山庄保留七类：火化土葬、传统土葬、骨灰位、殡仪服务、祖先牌位、生基风水、宠物安葬。
- 正式目录、详情和问卷结果使用 Supabase 公开查询结果，仅显示已发布且满足公开条件的产品、宗教、价格及图片；不以本地演示资料补齐未发布产品。未配置公开连接参数时不能作为正式产品目录使用。
- 目录提供分类、人数与宗教筛选、价格排序及网格／列表模式；筛选和视图可随网址保留，详情返回与问卷恢复定位已有回归覆盖。
- 一般产品显示实际售价，不自动加“起”；骨灰位只显示最低起价；殡仪分别显示预购、即用价格及各自备注。
- 殡仪完全不使用照片；卡片及详情显示已有天数夜数。详情与后台预览显示服务地点，选项为「丧府」「殡仪礼堂」「丧府/殡仪礼堂」，未填写则隐藏。
- 包含项目可编辑分组标题、明细及排序，前台以折叠组展示。没有分组标题的旧项目仍按原资料展示，不自动替产品分组。
- 后台已实现真实登录、角色权限、编辑保存、分类独立排序、关联字典、图片管理、复制、发布／隐藏及版本冲突检查；预览读取当前未保存表单并复用前台详情正文，不自动保存或发布。
- 产品网址标识由数据库自动生成且有唯一约束；后台不再提供可编辑输入，改名不改变旧链接。「资料来源」输入已移除，「内部备注」保留且仅后台可见。
- 云南善堂前台保留资讯页面，后台暂为占位；问卷不会从静态演示数据补入云南善堂报价。

2026-10-24 只读核查为 20 件产品：19 件草稿、1 件已发布。此数量是当日快照，并非固定上限或发布批准；详见 [产品核查清单](docs/现有20件产品发布条件核查清单.md)。

## 本地启动

前台使用根目录 `bun.lock`；后台使用独立 `apps/admin/package-lock.json`。

Cloudflare Pages 使用 Bun 1.4.4 和冻结锁文件安装；Vercel 也保留根目录的 npm 锁文件。修改前台依赖后，须同步提交 `package-lock.json` 和 `bun.lock`（可执行 `bun install --lockfile-only`），并验证 `bun install --frozen-lockfile`，否则 Pages 构建失败后会继续提供旧版本。

```sh
bun install --frozen-lockfile
cp .env.example .env.local
# 填入现有项目的公开连接参数后启动
npm run dev
```

前台默认端口 3000。只将 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_PUBLISHABLE_KEY` 放入前台环境；禁止使用管理员、service_role 或其他服务端密钥。

```sh
npm ci --prefix apps/admin
cp apps/admin/.env.example apps/admin/.env.local
# 按模板配置现有项目，再启动后台
npm run admin:dev
```

后台默认绑定 `127.0.0.1:3002`，需使用现有授权管理员登录。服务端图片复制／清理所需密钥仅配置于后台服务端，不能带 `VITE_` 前缀、提交到 Git 或发送到网页。环境文件与模板按各目录用途区分。

## 页面与维护位置

| 入口 | 路径／文件 |
| --- | --- |
| 首页、云南善堂、关于、联系 | `/`、`/yunnan-siantang`、`/about`、`/contact` |
| 富贵山庄目录 | `/nirvana`，例如 `?category=4&view=list` |
| 类别页 | `/nirvana/products/:categorySlug` |
| 产品详情 | `/nirvana/products/item/:productId`，参数使用稳定产品标识 |
| 联系代理问卷 | `/contact#needs-questionnaire` |
| 后台产品管理 | 后台域名的 `/products` |
| 公开数据转换／读取 | `src/catalog/publicRepository.ts`、`publicContext.tsx` |
| 共用详情、标签、价格 | `src/prototype/ProductPresentation.tsx` |
| 后台表单与未保存预览转换 | `apps/admin/src/Editor.tsx`、`previewModel.ts` |
| 问卷逻辑、公开产品转换、恢复状态 | `src/data/questionnaire.ts`、`questionnaireCatalog.ts`、`questionnaireSession.ts` |
| 电话、WhatsApp、地区等站点资料 | `src/data/site.ts` |
| 视觉样式 | `src/index.css`、`src/prototype/prototype.css`；后台 `apps/admin/src/admin.css` |

旧 `/nirvana/packages/:slug` 地址重定向至现行详情入口，旧富贵山庄类别路径回到目录。`/prototype` 不再作为独立页面提供；`src/prototype/products.ts` 仅保留测试资料，不能当作正式数据源。

## 咨询与恢复

联系表单用于校验、预览及复制咨询内容，不会自动向后台提交留言。WhatsApp 链接只带入预填文字，由访客自行确认发送。问卷答案、选择与返回位置使用当前浏览器会话存储恢复；没有把问卷答案或姓名、电话写入产品数据库。浏览器禁用会话存储时，问卷仍可使用，但恢复能力受限。

## 检查与数据库边界

```sh
npm run lint
npm test
npm run build
npm run lint --prefix apps/admin
npm run test --prefix apps/admin
npm run admin:build
```

2026-10-24 功能验收：前台 112 项、后台 16 项测试通过；殡仪真实本地数据库集成 7 项、网址标识集成 6 项通过。前后台构建通过；另以仅安装后台依赖的干净副本验证了云端构建依赖解析。桌面、手机视口及正式后台未保存预览已检查，不等同于全部真实移动设备测试。

数据库本地集成测试需安装 `supabase/tests` 依赖及启动 Docker；先阅读 [数据库安全与测试报告](docs/数据库安全与测试报告.md) 与现有脚本，再运行指定测试。生产迁移必须核对 `supabase/deployment-manifest.json`，不能重复创建 18 张表或 reset 正式库。测试脚本可能写入独立测试资料，不要把数据库集成命令当作纯只读健康检查。

本轮文档整理仅包含 Markdown，不执行迁移、保存、发布、删除或修改产品资料。截图、临时文件、环境凭据、工具记录及待审聚仙楼资料均不在本次提交范围。

## 文档索引

- [正式开发与部署状态](docs/正式开发与双平台部署计划.md)
- [现有20件产品发布条件核查清单](docs/现有20件产品发布条件核查清单.md)
- [问卷需求及当前实现差异](docs/安葬与殡仪需求问卷.md)
- [后台及前台详情修正](docs/后台与前台详情修正验收-2026-10-24.md)
- [自动生成网址标识](docs/产品网址自动生成验收-2026-10-24.md)
- [殡仪服务地点](docs/殡仪服务地点验收-2026-10-24.md)
- [早期固定资料原型归档](docs/前台原型验收说明.md)

按日期区分历史验收和当前状态；旧需求中的示例金额、产品数、占位图片或待审建议，不构成正式商品资料或自动发布指令。
