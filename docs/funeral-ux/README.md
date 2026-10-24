# 殡仪服务详情页优化交付记录

日期：2026-10-24（Asia/Kuching）。状态：代码及本地测试完成，按用户要求提交代码；正式部署待另行确认。未部署、未修改数据库或发布产品。

## 最新批注修正

已按四条浏览器批注调整：价格卡片仅保留预购/即用之间的一条分隔线，取消备注上方的额外线条；去掉分组外框；殡仪服务不再显示“查看包含项目”链接；服务地点仅在展示时规范斜线两侧空格，原始数据不变。桌面两列基本资料、下方等宽布局、默认展开与组内双列保持。截图与9组边界验收已更新。

## 实施基线与范围

已执行 `git fetch origin`，实施前 `codex/funeral-form-preview-fixes` 与对应远端及 `origin/main` 均位于 `c920519677b2ea3dd3ec1307cb022102aefbf624`。未覆盖工作区原有未跟踪文件。

继续使用前台和后台共用的 `ProductDetailContent`、`ProductPrices`、现有 Supabase 投影和 `ConsultButton`。不改数据库结构、价格计算、印花税规则、后台保存发布流程、导航、页脚、字体或品牌色。无新依赖、照片、浮动按钮或复杂动画。

## 实际修改的文件

| 文件 | 修改用途 |
|---|---|
| [src/prototype/ProductPresentation.tsx](../../src/prototype/ProductPresentation.tsx) | 殡仪服务分组默认展开、无分组回退、手机价格摘要、备注逐行去重、缺价提示及现有咨询入口；继续共用后台预览。 |
| [src/prototype/prototype.css](../../src/prototype/prototype.css) | 仅殡仪详情相关选择器：桌面双列、移动单列、基本资料两列、下方等宽分栏、无外框分组、对比度、触控与吸顶样式。 |
| [src/prototype/useBoundedPricePanel.ts](../../src/prototype/useBoundedPricePanel.ts) | 新增有限范围吸顶测量；观察卡片/导航尺寸，过高或手机视口自动取消；卸载清理监听。 |
| [tests/funeralCorrections.test.tsx](../../tests/funeralCorrections.test.tsx) | 新增分组、数量单位、独立/共通备注、缺价与摘要回归。 |
| [tests/prototype.test.tsx](../../tests/prototype.test.tsx) | 更新旧版“无咨询按钮”断言，限定只有殡仪服务可增加按钮。 |
| [tests/publicCatalog.test.tsx](../../tests/publicCatalog.test.tsx) | 更新无分组殡仪服务的默认展开容器断言。 |
| [tests/funeral-ux/fixture.mjs](../../tests/funeral-ux/fixture.mjs) | 独立验收数据，复用现有文档快照的48项产品内容；测试分组明确标注，不进入生产数据。 |
| [tests/funeral-ux/browser.mjs](../../tests/funeral-ux/browser.mjs) | 生产构建的桌面/手机前后测量、截图及基础交互验收。 |
| [tests/funeral-ux/edge-cases.mjs](../../tests/funeral-ux/edge-cases.mjs) | 吸顶边界、空数据、重试、六类产品原样对比、对比度与未保存预览验收。 |
| [tests/funeral-ux/preview.html](../../tests/funeral-ux/preview.html) | 可交互本地验收页面，不请求或发布正式产品数据。 |
| [apps/admin/tests/funeral-ux-preview.html](../../apps/admin/tests/funeral-ux-preview.html) | 使用真实预览组件和内存表单的隔离预览测试入口。 |

此外新增本目录的交付说明、`before.json`、`after.json`、`edge-cases.json`、`contrast.json`、`validation.json` 以及 `screenshots/` 下的验收截图。

## 功能验收

| 编号 | 结果 | 证据与说明 |
|---|---|---|
| 01–05 分组、排列与顺序 | 通过 | 读取原有分组；默认全部展开、独立折叠；桌面每组两列按原DOM次序逐行阅读，低于1024px单列；无分组统一“包含项目”；保留数量和单位。 |
| 06–08 两种价格、备注及咨询 | 通过 | 预购/即用分开；独立备注保留所属类型，重复共通行只在底部显示一次；摘要不显示备注；直接咨询复用现有顾问号码与跳转。 |
| 09 限定吸顶 | 通过 | 桌面限定于详情下半区，按导航实际高度留16px间距；卡片过高、短视口或低于1024px取消；验证不越过详情区及页脚。 |
| 10 手机价格摘要 | 通过 | 标题标签下显示两种价格，完整卡片位于包含项目下方，无新增底部条。 |
| 11–12 基本资料与视觉 | 通过 | 桌面按参考图采用两列两行、标签在上内容在下；手机保持100px标签宽度，内容左对齐、细实线分隔；天数/夜数自动读取；沿用原字体、色系和字号。 |
| 13–14 可读性与操作反馈 | 通过 | 重点文字对比度6.11:1–11.79:1；返回、分组标题及咨询目标至少44px高；键盘Enter/Space可操作且有焦点反馈。 |
| 15–17 加载、空数据与错误 | 通过 | 复用现有加载组件；加载时不渲染价格；单个/全部缺价显示现有咨询提示；无备注无空占位；无项目显示说明；请求失败显示简体中文并可重试，不泄露内部错误。 |
| 18 性能 | 已记录 | 同一生产构建方式、固定数据与浏览器限速；每端各3个冷上下文，记录原始值及中位数。见下表。 |
| 19 后台预览 | 通过 | 实际iframe预览与前台的基本资料、项目、价格HTML一致；修改内存表单的天数/价格/项目即时反映，无保存或发布请求。 |
| 20 数据正确性 | 通过 | 生产组件中没有新增产品业务资料；继续使用既有公开映射和后台表单映射。 |
| 21 其他六类 | 通过 | 六个类别用相同输入对照修改前后，详情HTML完全一致；殡仪新增样式均有专属作用域。共用CSS/详情脚本体积略有增加，见性能说明。 |

## 截图

截图均来自本地隔离数据：名称、48项内容及金额取自项目已有文档测试快照；“测试分组一/二/三”是为验证后台分组输入而显式设置的测试数据，**不是对正式产品的分类建议或线上资料核验**。前端不根据项目文字推断分类。

- [桌面完整页面](screenshots/after-desktop.png)、[桌面吸顶状态](screenshots/after-desktop-sticky.png)。
- [手机首屏与价格摘要](screenshots/after-mobile-top.png)、[手机完整页面](screenshots/after-mobile.png)、[手机完整价格卡片](screenshots/after-mobile-price.png)。
- [后台未保存预览测试](screenshots/after-admin-preview.png)、[错误与重试提示](screenshots/after-error.png)。
- 修改前：[桌面默认状态](screenshots/before-desktop.png)、[桌面全部展开](screenshots/before-desktop-expanded.png)、[手机全部展开](screenshots/before-mobile-expanded.png)。

## 测试与性能

- `npm run lint`：通过。
- `npm test`：115/115通过。两条旧断言已按新需求更新。
- `npm run test --prefix apps/admin`：16/16通过。
- 前台 `npm run build`、后台 `npm run admin:build`：通过。
- Chromium生产页面基础验收：桌面/手机各3轮，独立折叠、键盘、原始项目顺序、备注、咨询URL、摘要显隐、无溢出、无页面脚本异常均通过。
- `edge-cases.mjs`：9组边界验收通过，含48项与3项配套、独立/空备注、单项/全部缺价、无项目、请求失败重试、320/768/1024px、吸顶短视口/长备注，以及六类原样对比和后台预览。
- Impeccable静态检测：无发现；`git diff --check`通过。

测量条件：Chromium无头浏览器，生产Vite preview，本地静态资源，API为隔离拦截数据；CPU 4倍降速、40ms网络延迟、10Mbps下载/5Mbps上传，每端各3个独立冷浏览器上下文。API拦截不代表真实Supabase网络耗时。以下为中位数，时间单位ms。

| 视口 | 首次内容FCP | 完整产品可见 | LCP | CLS | 观察到的交互最大时长 | 产品API请求数 |
|---|---:|---:|---:|---:|---:|---:|
| 桌面 1440×1000 | 336 → 352 | 408 → 431 | 408 → 436 | 0 → 0 | 40 → 40 | 2 → 2 |
| 手机模拟 390×844 | 328 → 340 | 394 → 418 | 396 → 416 | 0 → 0 | 40 → 40 | 2 → 2 |

“完整产品可见”是自动化检测到完整价格面板时的时间上界。“交互最大时长”来自Event Timing记录的分组点击（16ms采样门槛），并非线上INP；长任务阻塞量中位数两端前后均为0ms，不当作Lighthouse TBT评分。

页面实际加载的解码后JS合计：336,284 → 337,923字节。继续保持现有路由拆分，不新增请求、大型库或殡仪图片资源。加载时间的原始测量及中位数见上表，不以单次差异宣称提速。

相同48项内容全部展开时，桌面总高度3991 → 2641px；手机4314 → 4365px。旧版默认折叠的高度不能用来宣称新版页面更短。两端测量期间CLS均为0。

原始数据：[修改前](before.json)、[修改后](after.json)、[边界测试](edge-cases.json)、[文字对比度](contrast.json)。

## 复核入口与运行方式

本地可交互样例：[查看殡仪详情测试页](http://127.0.0.1:3001/tests/funeral-ux/preview.html)。它使用隔离样例，不连接正式产品数据库；点击直接咨询将打开现有WhatsApp渠道。

浏览器测试使用 `apps/admin` 已有的Playwright依赖，没有安装额外包。前台复测生产构建时使用 `VITE_SUPABASE_URL=https://fixture.supabase.co VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_local_review`，这两个值仅供测试拦截，**不可作为部署配置**。基线构建保留于 `/tmp/funeral-ux-before-dist`，由3101端口preview提供；修改后生产preview为3102，后台开发测试入口为3003。

```sh
node tests/funeral-ux/browser.mjs before
REVIEW_URL=http://127.0.0.1:3102 node tests/funeral-ux/browser.mjs after
node tests/funeral-ux/edge-cases.mjs
```

## 未解决事项与验证限制

没有发现阻塞本次本地验收的代码问题。手机验证使用Chromium视口及触控模拟，尚未在实体iPhone/Android或Safari执行验证；也未测量线上真实网络性能。正式Supabase的最新产品发布内容、真实产品分组及实际WhatsApp会话未进行线上端到端核验。测试只验证现有联系方式生成的URL，没有发送消息。

本次交付代码与验收证据；正式网站部署需另行确认。
