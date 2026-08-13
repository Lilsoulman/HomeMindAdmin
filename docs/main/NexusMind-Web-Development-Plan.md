# NexusMind Web端开发计划

> **产品依据：** `D:\HomeMind\core\docs\main\NexusMind-Product-Master-Design.md`
> **Web 设计依据：** [NexusMind-Web-Development.md](NexusMind-Web-Development.md)
> **接口依据：** `D:\HomeMind\core\docs\frontend-api-integration.md`
> **计划性质：** 当前实施快照。仅维护已完成项和下一步，不保留迭代历史，也不改变产品或接口契约。

最近同步：2026-08-13
当前目标：P5 剪辑任务持久化与 B36 四引擎事件前端验收已完成；等待后端部署后以非敏感本地样片完成参数调整、部分重做、全量重做联调。美团旅行作为平台许可、真实 Token 与本地后端 MTR-1a 通过后的下一业务候选，N100 迁移在本地闭环通过后单独验收。HA MCP Web 体验按后端 H1-H5、M1-M2 契约分片解锁；小红书功能因平台警告风险暂停开发，不进入当前排期，也不继续联调或发布。

## 1. 不变基线

- Vue 2 Options API、Element UI 2、Vue Router 3、Vuex 3、Axios；不混入另一套 UI 或状态框架；
- 页面只依赖 `api/` 的 DTO/ViewModel 边界；HTTP 仅通过 `utils/request.js`，页面和组件不得自行拼接 URL 或处理 `ApiResponse`；
- 信息架构固定为用户端“家庭概览 / 确认中心 / 管家动态 / 家庭成员与知识 / 我的偏好 / 我的连接”和 owner/admin 的开发控制台；
- 所有受保护接口都使用 Bearer access token。浏览器不保存第三方 Key、Cookie、HA Token、OAuth Client Secret、`credential_ref`、Prompt、思考过程、供应商实体 ID 或原始 Adapter 事件；
- access token 仅存入 `sessionStorage`；在当前后端仍将 refresh token 返回给前端的阶段，refresh token 只保留运行内存，刷新页面或进程重启后不能静默续期。生产切换到 Secure/HttpOnly/SameSite Cookie 刷新契约后再调整；
- 所有写操作创建新的 UUID 幂等键；确认、连接器同步和 Run 轮询必须在离开页面或终态时清理；
- 所有异步界面必须具备 loading、empty、error、retry。每个阶段通过 `npm run lint`、`npm run test:unit` 和 `npm run build`。
- HA/MCP 只作为 Connector 内部实现：普通成员不看到第二套工具入口，浏览器不直连 HA/MCP，也不展示原始 entity_id、service、Tool 参数、manifest schema 或 `state_changed` 载荷。

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
| 家庭协同与个人偏好 | 已完成 | 家庭成员（创建/编辑/终态更正原因+二次确认）、家庭知识（7 档分类、来源成员、冲突策略、删除二次确认）、决策记录（游标分页、仅追加）与收藏（分类/可见性筛选、增删改二次确认、private 过滤）已交付；角色禁用（viewer 只读）、409 刷新、403/422/retry 状态齐备；不发送或切换 tenant ID；`npm run lint`、`npm run test:unit`（24 项）与 `npm run build` 通过 |
| 家庭级 Connector 控制台 | 已完成 | Provider 目录、实例列表/创建（Vault 未启用时 503 可读消息）、测试/发现/同步（202→轮询至终态，离开页停止）、成员授权（1-32 范围，保存即替换）、我的连接（脱敏状态）已交付；表单仅接受白名单字段，绝不回显 URL/Token/`credentialRef`/供应商 ID；`npm run lint`、`npm run test:unit`（32 项）与 `npm run build` 通过 |
| 自动化、专家与 Run | 已完成 | 自动化规则（列表/新建/编辑/启停，审批策略说明与影响预览、更新带 RowVersion、409 刷新）、专家目录与详情（版本/Persona/Methodology/ToolPolicy 摘要，PromptTemplate 不消费不展示）、Run 详情（公开阶段映射、事件时间线仅可读消息、Action 确认带幂等键、终态停轮询、离开页停止）已交付；动态详情含 RunId 时提供运行入口；`npm run lint`、`npm run test:unit`（42 项）与 `npm run build` 通过 |
| 质量与可访问性 | 已完成 | 权限守卫角色×权限矩阵、确认幂等（页面级新键）、同步/Run 终态轮询（终态/离开页/失败停止）、页面 loading/empty/error+retry 组件测试齐备（`npm run test:unit` 149 项）；键盘可达性（专家列表可聚焦+Enter、focus-visible 样式）、窄屏断点（授权矩阵 900px 单列）已补；静态扫描确认源码与构建产物无敏感字段硬编码、无第三方直连、PromptTemplate 未被前端消费；修复 `this.homeId` 方法引用当值使用的真实缺陷；工程基线补充 `@vue/vue2-jest` 与 jest preset 支持组件测试 |
| 个人 Connector/OAuth | 已完成 | 我的连接（仅本人可见）脱敏展示个人实例、Provider 选择发起授权（`POST /connector-providers/{code}/authorizations` + 整页跳转 `AuthorizationUrl`，会话 ID 存 `sessionStorage` 仅用于回跳定位）、`/oauth/callback` 回调路由（查询一次会话状态后回连接页）、撤销（二次确认 + `DELETE /connector-authorizations/{id}`，幂等）与 revoked 重新授权；`connector.authorize` 加入 member 角色矩阵；Setup 向导文案指向个人授权入口；`npm run lint`、`npm run test:unit`（161 项）与 `npm run build` 通过；本地全链路联调依赖后端 `ConnectorOAuth:AllowedRedirectUris` 配置（含 `http://localhost:8080/oauth/callback`） |
| 我的专家 | 已完成 | 用户端 `/app/experts` 仅列出本人自建专家（`scope=mine`，不泄露他人）；新建表单必填名称/分类/说明/角色设定/提示词，能力策略 JSON 前端校验；更新带 RowVersion、409 刷新；删除二次确认；PromptTemplate 永不回显（编辑需重新输入）；`expert.mine.write` 加入 member 角色矩阵；`npm run lint`、`npm run test:unit`（177 项）与 `npm run build` 通过 |
| 快速剪辑 Skill（P2 对话式优化） | 已完成 | 工作台升级为分步对话式引导（素材→目标→方案→确认→导出）：素材支持浏览器上传（`POST /api/v1/clipping/materials`，FormData 去 JSON header、上传进度、素材卡片含时长/分辨率/大小、可移除）或路径输入（回填 `media_location`）；对话经 `POST /api/v1/clipping/chat` 无状态推进（context 回传、suggestions 快捷按钮：生成方案/确认方案/修改目标重新生成/重新剪辑）；方案以结构化时间线渲染（PlanTimeline：片段序列/总时长）；「修改目标重新生成」经 `POST /skills/runs/{runId}/revise`（幂等键）；确认/下载复用 B25 链路（readUrl 相对路径拼接 API 基址修正）；轮询/幂等/终态/离开页停止保留；`media.read` 与 `media.write` 加入 member 角色矩阵；源码与构建产物无 MCP 路径/Prompt 泄露；`npm run lint`、`npm run test:unit`（207 项）与 `npm run build` 通过；真实 MySQL 全链路联调通过（上传→chat→run→时间线→revise→确认→readToken 下载） |
| 快速剪辑 Skill（P5 V2.8 界面适配） | 已完成 | 剪辑对话请求透传 `task_id`；运行 DTO 消费可公开的 `engineStage`、版本号与 `versionHistory`，不消费引擎内部数据；时间线下提供调整时长/风格/片头/顺序/片段/素材/重生成快捷修改入口，仍复用 `POST /skills/runs/{runId}/revise` 与 UUID 幂等键；B36 仅按公开事件的 `video_use/seedance/hyperframes/remotion/draft` 和状态渲染进度，跳过或未配置不表示视频已生成；Seedance 默认关闭，须主动勾选并确认成本后才传 `allowSeedance=true`。Node 20.18 环境下 `lint`、233 项 `unit` 与 `build` 已通过；本地后端部署验证待执行。 |
| 思维导图工具（P3） | 已完成 | `/app/tools/mindmap` 支持粘贴 Markdown 与 FileReader 本地读取 `.md`（不上传文件）；浏览器内以本地化 `markmap-lib`/`markmap-view`/d3 vendor 转换、缩放、拖拽、折叠与适配，未进 webpack；创建 `POST /api/v1/skills/mindmap/runs` 记录 Run（UUID 幂等键），无 Prompt 渲染或本地持久化；支持 SVG、PNG 与内联 vendor 的断网自包含 HTML 导出；`mindmap.read` 加入 member 权限矩阵，viewer 无法访问。 |
| Skill 目录查看（P4） | 已完成 | 用户端 `/app/skills` 仅以 `scope=mine` 查看本人用户级技能与只读详情（Prompt 仅该详情消费）；开发端 `/console/experts` 新增 Skill Tab，以 `scope=all` 区分平台级目录（key/分类/风险/所需权限/输入 schema）与成员技能（名称/成员/状态），不回显成员 Prompt；`ai.skills.read` 加入 member/viewer 权限矩阵，平台/all 仍由服务端角色校验。`npm run lint`、`npm run test:unit`（230 项）与 `npm run build` 通过。 |

## 3. 下一步

P5 后端联调（依赖后端 V2.8 切片，产品总设计 §7.1、Web 总设计 §5）：

- B35 与 B36 Web 契约已接入并验收：任务 URL 恢复、任务/Run 轮询、安全版本历史及四引擎公开事件渲染均已实现；Node 20.18 下 `lint`、`unit`（233 项）与 `build` 已通过；
- 后端部署 B36 后，以非敏感本地样片验证参数调整、部分重做、全量重做各自的服务端反馈、`failed/skipped` 安全状态与轮询终止；
- 边界不变：素材卡片首版不生成缩略图、方案时间线为示意性可视化，不做一键成片。

HA MCP Web 主线（Web 总设计 §7.8；严格跟随后端 H1-H5、M1-M2 发布，不并行虚构接口）：

| 顺序 | Web 切片 | 页面与组件 | 后端依赖 | 最小验收 |
| --- | --- | --- | --- | --- |
| W-H1 | MCP 运维只读基线 | Connector 详情「运行状态」Tab、`HaConnectorStatusCard`、`McpServerHealthPanel` | H1 runtime/manifest 脱敏 DTO | healthy/reconnecting/degraded/unavailable、重试和无权限状态可测；源码/DOM 无 Secret、命令、env 与完整 schema |
| W-H2 | HA 发现与设备映射 | Connector 详情「设备映射」Tab、`HaDeviceMappingTable` | H2 标准设备/空间/能力 DTO | 搜索筛选、映射异常、空态和重试完整；entity_id/任意 service 不进入 ViewModel |
| W-H3 | 实时状态体验 | 家庭概览设备异常摘要、设备最近状态与重连/降级条 | H3 聚合状态 DTO；SSE 或轮询契约 | 高频事件不会产生 Toast 风暴；离页清理订阅/轮询；断线恢复只呈现聚合状态 |
| W-H4 | 受控设备 Action | Run 时间线、`ActionImpactDiff`、执行结果和 `result_unknown` | H4 Run Action 标准 DTO | 阶段可理解；超时不自动重放写操作；刷新可恢复终态；不展示 MCP trace/HA 响应 |
| W-H5 | Approval Card 增强 | 确认中心与 Run 详情共用 `ConfirmationCard`/`RiskBadge` | H5 结构化 Confirmation + L1 Grant | L1 可选本 Run 同类授权；L2/L3 永远逐项；过期/409/重复提交/跨家庭/无权限覆盖 |
| W-M1 | Context Snapshot | Run 详情 `ContextSnapshotDrawer` | M1 Snapshot 只读 API | 显示版本/哈希/冻结时间/引用摘要；个人受限引用不泄露；不展示 Prompt |
| W-M2 | Memory Candidate | 家庭知识页「记忆候选」Tab、`MemoryCandidateCard` | M2 list/resolve API | personal/family 隔离；接受/编辑/拒绝幂等；敏感或冲突候选不得批量自动接受 |

执行规则：W-H1 可以在 H1 API 发布后独立交付；W-H2/W-H3 可连续实现；W-H4 先完成只读运行展示，再由 W-H5 开放增强审批；W-M1/W-M2 不阻塞 HA 设备主链路。每个切片都先补 `api/` 映射和 ViewModel 单测，再补页面/组件测试，最后执行 lint、unit、build；未发布字段采用“功能隐藏”而不是假数据。

后续 P2 参考项：Skill Candidate 沿用 Memory Candidate 的审核交互；Workflow DAG 只借鉴 Hermes Studio 的画布与拓扑层展示，后端仍是编排事实源。没有 Skill Curator/Workflow 版本 API 前不注册路由。

美团生活服务 Web 候选计划（Web 总设计 §7.9；未发布 API 不实现模拟页面）：

| 顺序 | Web 切片 | 页面与组件 | 后端依赖 | 最小验收 |
| --- | --- | --- | --- | --- |
| W-MTR-1 | 旅行个人连接 | `/app/connections/meituan-travel`、`MeituanTravelConnectionCard`；配置、更新、撤销和脱敏状态 | 本地 MTR-1a 连接 API、个人隔离和受控本机密钥存储已验收 | Token 仅一次性 HTTPS 提交、提交后清空；不出现在 storage/Vuex/DOM/日志；本人以外访问不泄露；撤销二次确认与重试状态完整 |
| W-MTR-2 | 家庭周末出游工作台 | `/app/life/travel`、`TravelSearchForm`、`TravelRunStatus`、`TravelPlanSummary`、`MeituanSupplyList` | 本地 MTR-1a 查询 Run；日历/待办 Action 依赖 MTR-2 | 异步 Run 轮询在终态/离页停止；AI 摘要与原始价格等供给分区；日历 L1 确认幂等；外跳只能用户点击且不显示支付成功 |
| W-MTR-3 | N100 部署回归 | 不新增页面；只验证现有旅行连接与工作台在 N100 后端环境的兼容性 | 后端 MTR-1b | API 契约、权限、轮询、错误显示与敏感字段边界均与本地 MTR-1a 一致；不为硬件差异加入前端分支 |
| W-MTP-1 | 跑腿费用预览 | 不排期 | MTP-1、账户/地址簿/POI/删除合规均通过 | 未满足前不注册路由、不请求地址簿、不展示订单入口 |
| W-MTP-2 | 跑腿订单 | 不排期 | MTP-2 与 L3/高额二次确认 API 发布 | 预览与提交参数一致性由服务端拒绝不一致请求；支付仅外跳，前端不保存订单敏感信息 |
| W-MTC-1 | 分销推广/领券 | 长期不排期 | 分销资格、条款、隐私/营销审查、订阅/退订/清除机制全部通过 | 未通过时没有入口、营销提示或主动提醒；仅记录评审结论 |

执行规则：W-MTR-1 必须先于 W-MTR-2；每个切片先完成 `api/` 的 DTO→ViewModel 映射与敏感字段静态扫描，再补页面和组件测试，最后执行 lint、unit、build。跑腿与领券不因旅行上线自动解锁。

小红书功能：**暂停**。

- 原因：平台警告风险；暂停新增功能、接口联调、发布验证与上线。
- 现有本地未提交实现仅保留在工作区，不纳入本阶段交付或验收；恢复前需先重新评估平台规则、账号风险与合规方案。

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
