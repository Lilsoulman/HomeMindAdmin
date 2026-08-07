# NexusMind Web端开发计划

> **产品依据：** `D:\HomeMind\core\docs\main\NexusMind-Product-Master-Design.md`
> **Web 设计依据：** [NexusMind-Web-Development.md](NexusMind-Web-Development.md)
> **接口依据：** `D:\HomeMind\core\docs\frontend-api-integration.md`
> **计划性质：** 当前实施快照。仅维护已完成项和下一步，不保留迭代历史，也不改变产品或接口契约。

最近同步：2026-08-07  
当前目标：在已发布的 `/api/v1` 契约上依次交付家庭工作台、确认与家庭协同、家庭级连接器控制台。

## 1. 不变基线

- Vue 2 Options API、Element UI 2、Vue Router 3、Vuex 3、Axios；不混入另一套 UI 或状态框架；
- 页面只依赖 `api/` 的 DTO/ViewModel 边界；HTTP 仅通过 `utils/request.js`，页面和组件不得自行拼接 URL 或处理 `ApiResponse`；
- 信息架构固定为用户端“家庭概览 / 确认中心 / 管家动态 / 家庭成员与知识 / 我的偏好 / 我的连接”和 owner/admin 的开发控制台；
- 所有受保护接口都使用 Bearer access token。浏览器不保存第三方 Key、Cookie、HA Token、OAuth Client Secret、`credential_ref`、Prompt、思考过程、供应商实体 ID 或原始 Adapter 事件；
- access token 仅存入 `sessionStorage`；在当前后端仍将 refresh token 返回给前端的阶段，refresh token 只保留运行内存，刷新页面或进程重启后不能静默续期。生产切换到 Secure/HttpOnly/SameSite Cookie 刷新契约后再调整；
- 所有写操作创建新的 UUID 幂等键；确认、连接器同步和 Run 轮询必须在离开页面或终态时清理；
- 所有异步界面必须具备 loading、empty、error、retry。每个阶段通过 `npm run lint`、`npm run test:unit` 和 `npm run build`。

## 2. 已完成

| 能力 | 完成状态 | 最小验收 |
| --- | --- | --- |
| Vue 2 工程基线 | 已完成 | `package.json`、Vue CLI 配置、Babel、ESLint、Jest 与环境变量样例已建立 |
| 统一设计基线 | 已完成 | `src/styles/index.scss` 提供语义颜色、紧凑后台布局、Element 覆写、响应式规则；用户空间与控制台共用同一壳层 |
| 鉴权与请求边界 | 已完成 | 登录、当前用户、登出、单飞刷新、`ApiResponse<T>` 解包、标准错误对象、短会话存储与安装 ID 已建立 |
| 路由与权限提示 | 已完成 | 用户端和控制台路由、登录守卫、`403/404`、基于角色的菜单和前端路由裁剪已建立；后端仍为唯一权限裁决 |
| 用户端起始页 | 已完成 | 仪表板消费 `GET /api/v1/dashboard`，待确认优先、模块降级、loading/error/retry 与数据安全展示已具备 |
| 基础回归 | 已完成 | `npm run lint`、`npm run test:unit`（2 项）与 `npm run build` 已通过；依赖与锁文件已生成 |
| 本地 API 联调 | 已完成 | 注册临时账户验证登录、`auth/me`、登出、仪表板与刷新链路；`401/403/422` 状态符合基线；确认与动态接口按契约联调（跨家庭 403、非法参数 422、无令牌 401 均正确） |
| 确认中心与动态 | 已完成 | 确认中心（L1 批量仅限同家庭未过期 `pending`、L2/L3 逐项、确认/批量确认带幂等键、拒绝必填原因、409 刷新、离开页停止任务）与管家动态（游标分页、详情、可撤销操作二次确认）已交付；`npm run lint`、`npm run test:unit`（11 项）与 `npm run build` 通过 |

## 3. 下一步

| 优先级 | 交付 | 前置条件 | 最小验收 |
| --- | --- | --- | --- |
| P0 | 家庭协同与个人偏好 | B14/B15 字段级契约 | 成员、知识、决策、收藏页面具备角色禁用、终态成员更正原因和二次确认、冲突/无权限/retry 状态；不发送或切换 tenant ID |
| P1 | 家庭级 Connector 控制台 | 已发布 Provider、Connector、授权和同步任务契约；服务端托管凭据流程可用 | Provider 驱动的安全表单、列表、详情、测试、发现、同步轮询和成员授权完成；绝不回显 URL、Token、`credentialRef` 或供应商 ID |
| P2 | 自动化、专家与 Run | 字段级自动化和运行契约稳定 | 自动化预览影响、权限、风险与确认策略；Run 仅显示公开阶段、Action 与结果；终态停轮询；不显示 Prompt/思考链 |
| P3 | 质量与可访问性 | P0--P2 可运行 | API 映射、权限守卫、确认幂等、同步终态和页面状态的单元测试；键盘操作、焦点和窄屏检查；静态扫描无敏感字段或第三方直连 |
| P4 | 个人 Connector/OAuth | 产品决策、数据迁移、OAuth callback/PKCE/撤销及安全验收全部完成 | 仅本人可见和使用的个人实例；服务端处理 OAuth 令牌生命周期；前端仅显示脱敏连接状态。此前不得创建 UI 或推测 HTTP 接口 |

## 4. 工程约束

- 构建环境使用 Node ≥ 14.18（推荐 20 LTS）；Node 12 下 `html-webpack-plugin` 无法解析 `node:url`，`npm run build` 会失败；
- `api/` 负责请求参数、响应 PascalCase 到 ViewModel 的映射和错误转换；`views/`、`layouts/`、`components/` 只消费 ViewModel；
- `styles/index.scss` 是唯一全局样式入口。新增颜色、间距、状态或 Element 覆写时先增加语义变量，再消费变量；禁止页面私自引入另一套主题；
- 布局组件只管理导航和会话操作，页面业务状态归属对应 `views/` 和 Vuex 模块；
- 前端权限只用于隐藏菜单、禁用操作与减少误触。`401` 仅尝试一次当前内存会话刷新；`403` 显示无权限；`404` 不区分不存在和跨家庭无权；`422` 显示字段或业务校验；`5xx` 只给安全重试入口；
- 当前 API 的 `auth/me` 未承诺显式权限数组时，前端从 access token 的角色给出保守导航提示。服务端发布权限数组后，应替换为服务端权限快照并补齐测试；
- 不缓存无权资源、凭据、完整错误响应或未公开的运行上下文。浏览器不直连 Home Assistant、MySQL、MCP SQLite 或第三方 Provider。

## 5. 变更门禁

- 修改视觉 token、组件交互或页面状态时，同步本计划的“已完成/下一步”与 `src/styles/index.scss`；
- 修改请求、认证或 API 映射时，同步 `docs/main/NexusMind-Web-Development.md` 的 API 映射与安全边界；
- 完成状态只能在最小验收及 lint、unit、build 全部通过后回写；过时的下一步应替换，而不是累计历史；
- 个人 OAuth、邀请、家庭创建、多家庭切换、凭据录入等未发布契约不实现模拟接口，不以 LocalStorage 或前端加密代替服务端安全能力。
- 每完成一个 P 阶段并通过最小验收、lint、unit、build 后，须主动询问是否将本阶段的提交推送到 Git 仓库；用户确认则执行 `git add` + `git commit` + `git push`，未确认则保留本地改动，待下一 P 阶段完成时再次询问，期间不主动推送。
