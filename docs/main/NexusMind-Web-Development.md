# NexusMind Web端 开发设计

> **项目目录：** `D:\HomeMind\admin`
> **技术基线：** Vue 2 + Element UI 2 + Vue Router 3 + Vuex 3 + Axios
> **后端依据：** `D:\HomeMind\core\docs\main\NexusMind-Backend-Development.md`、`docs/api-implementation.md`、`docs/frontend-api-integration.md`
> **产品依据：** `D:\HomeMind\core\docs\main\NexusMind-Product-Master-Design.md`
> **专项依据：** `D:\HomeMind\core\docs\main\NexusMind-Hermes-MCP-Fusion-Analysis.md`
> **状态：** 已完成现有 Web 工程与已发布 API 的前端实现；学习记忆库（M3/W-M3）前端已交付，等待后端 M3 真实环境联调。
> **最后更新：** 2026-08-14

## 1. 产品定位

NexusMind Web 是家庭成员和家庭管理员在 PC 使用的控制台，不替代移动端的日常管家体验。它适合大屏的设置、审核、连接管理、专家与运行记录，并遵循：理解与建议 -> 展示影响 -> 用户确认 -> 执行结果与审计。

| 入口 | 面向角色 | 主要目标 | 明确不做 |
| --- | --- | --- | --- |
| 用户端 | 当前家庭的 owner、admin、member、viewer | 家庭状态、个人偏好、待确认事项、已授权连接、运行记录、我的专家（自建/维护） | 保存家庭密钥、查看他人凭据、直连第三方 |
| 开发端 | 当前家庭的 owner、admin、部署者 | 家庭级 Connector、同步、成员授权、自动化、专家/Skill 管理 | 跨租户运维、凭据浏览、直连 MySQL、HA 或 MCP SQLite |

开发端不是超级管理员后台。所有请求都从 JWT 推导 `tenant_id`；浏览器只消费 `/api/v1` 脱敏 DTO，绝不持有第三方 API Key、Cookie、HA Token 或 OAuth 客户端密钥。

## 2. 账号、家庭与连接器

### 2.1 三层模型

| 概念 | 归属 | Web 责任 |
| --- | --- | --- |
| NexusMind 用户账号 | 每人独立，手机号/邮箱登录 | 登录、会话、本人资料 |
| 家庭成员关系 | 用户加入一个 `tenant_id` 对应家庭并获角色 | 成员、家庭知识、家庭权限 |
| Connector 实例 | 家庭租户内授权的外部服务 | 按范围显示、授权和受控管理；永不展示凭据 |

家庭成员用不同账户登录，但共享同一 `tenant_id` 中被授权的空间、设备状态、场景、家庭知识和家庭级 Connector。个人偏好仍按成员隔离，例如 `personal_favorites.owner_member_id`。跨家庭资源由服务端返回 `404`，前端不允许用户提交或切换 `tenant_id`。

### 2.2 连接器范围与现状

| 范围 | 例子 | 配置者 | 可用者 | 当前状态 |
| --- | --- | --- | --- | --- |
| 家庭级 | Home Assistant、天气、高德配额、家庭共读内容源 | owner/admin 在开发端 | 获授权的家庭成员 | 已有 `workspace_connectors`、Tool、成员授权 API |
| 个人级 | 个人邮箱、日历、内容发布、个人创作者数据 | 成员本人 OAuth | 仅绑定成员本人 | V2.4 B18 已确认模型与 API，待迁移/服务/安全验证发布后实现 |
| 本机开发工具 | `HomeMind.CreatorMcp` 本地 SQLite 缓存 | N97/开发机操作者 | 仅本机 Agent | 不属于 Web 或家庭 Connector |

当前后端的 `connector_permission_grants` 只表示成员可否使用一个**家庭级**实例，不能代表“该成员绑定了自己的第三方账号”。因此，家庭共读的小红书可以由 owner/admin 创建一个家庭实例并授权成员；个人发布必须是独立个人实例，不能复用另一个成员的 OAuth 授权。

“本地 MCP 数据库路径是家庭级 Connector”的说法不纳入产品。现有 Creator MCP 是显式同步的只读开发缓存，不是家庭知识库，也没有供 Web 调用的 API。

### 2.3 首次安装与日常授权

```text
部署者/owner：N97 上架 -> 部署 NexusMind 与 HA -> 开发端创建家庭级 Connector
成员：注册/登录 -> 通过邀请加入家庭 -> 使用获授权的家庭能力
成员：需要个人服务 -> 用户端发起 OAuth -> 后端回调保存 credential_ref -> 仅本人可用
```

首次部署向导只编排已发布的 Connector 创建、测试、发现和同步 API。个人 OAuth 的 callback、令牌加密、刷新、撤销和审计全部在服务端完成。

## 3. 权限与安全

后端权限是唯一裁决，前端只负责菜单裁剪、禁用提示和安全降级。

| 功能 | owner/admin | member | viewer |
| --- | --- | --- | --- |
| 家庭概览、活动、设备健康 | 按读权限可用 | 按读权限可用 | 只读 |
| 本人偏好与未来个人授权 | 本人 | 本人 | 本人可见范围内只读 |
| 确认项 | 按 `confirmation.write` | 按 `confirmation.write` | 不可写 |
| 家庭成员、知识、决策 | 管理 | 按 `family.read/write` | 只读 |
| 学习记忆库 | 可查看本人记忆及有 `family.read` 权限的家庭记忆 | 可查看本人记忆及被授权家庭记忆 | 只读可见范围 |
| 家庭 Connector 创建、测试、发现、同步、成员授权 | 可管理 | 仅已授权项只读 | 仅已授权项只读 |
| 自动化、Skill/Expert 管理 | 按服务端策略 | 只读或无权 | 无权 |
| Token、Cookie、`credential_ref`、供应商实体 ID | 永不显示 | 永不显示 | 永不显示 |

当前 API 的 `connector.write` 创建、测试、发现、同步和成员授权仅允许 owner/admin。`401` 触发一次安全刷新后回登录；`403` 显示无权限；`404` 不区分资源不存在与跨家庭无权；`409` 刷新资源；`422` 呈现字段校验；`5xx` 仅给重试入口，不展示原始异常。

## 4. 信息架构

登录后用 `GET /api/v1/auth/me` 的角色和权限装配路由。入口切换不改变家庭作用域。

### 用户端 `/app`

| 路由 | 页面 | 主要内容 |
| --- | --- | --- |
| `/app/overview` | 家庭概览 | Dashboard、待确认、设备健康、今日计划、场景 |
| `/app/confirmations` | 确认中心 | L1/L2/L3 筛选、确认/拒绝、受限 L1 批量确认 |
| `/app/activities` | 管家动态 | 游标分页、详情、可撤销活动 |
| `/app/family` | 家庭成员与知识 | 成员状态、知识、决策记录；M2 发布后增加待审核记忆候选 Tab |
| `/app/memories` | 学习记忆库 | 已接受、可召回的个人/家庭记忆；类型、作用域、时间与来源筛选；仅展示脱敏摘要和可见溯源 |
| `/app/life/favorites` | 我的偏好 | 餐厅/旅行/素材收藏及可见性 |
| `/app/connections` | 我的连接 | 已授权家庭 Connector 与本人个人实例（OAuth）脱敏状态；发起授权、撤销、重新授权 |
| `/app/runs/:id` | 运行详情 | 可公开事件、影响、Action 确认、专家文件（附件）、时间线、生成文件下载；M1 发布后可查看 Context Snapshot 引用摘要 |
| `/app/media/quick-edit` | 快速剪辑 | 剪辑对话页（分步对话式引导：素材→目标→方案→确认→导出）：素材上传/路径输入/自动发现、素材卡片、chat 引导（含自然语言一句话解析）、方案时间线、修改历史（版本标记）、修改指令增量更新、引擎进度指示、Action 确认、**.draft 草稿下载 + 粗剪 mp4 预览/下载（V2.9 体验重构，见 §5）** |
| `/app/tools/mindmap` | 思维导图 | 粘贴或本地 .md 文件 → 交互式思维导图（缩放/折叠）→ 导出 SVG/PNG/自包含 HTML |
| `/app/experts` | 我的专家 | 自建专家列表、新建、编辑、删除（仅创建者本人可见） |
| `/app/skills` | 我的技能 | 本人用户级技能列表与详情（Prompt 仅本人可见，只读查看） |
| `/app/profile` | 账户与会话 | 本人资料、退出 |

### 开发端 `/console`

| 路由 | 页面 | 主要内容 |
| --- | --- | --- |
| `/console/setup` | 首次部署向导 | Provider、创建家庭实例、测试、发现、同步 |
| `/console/connectors` | 家庭连接器 | 健康、授权、Tool 摘要、同步任务 |
| `/console/connectors/:id` | 连接器详情 | 非敏感配置、测试、发现、同步、成员授权；HA Provider 增加设备映射与 MCP 运行状态 Tab |
| `/console/authorizations` | 成员授权 | 成员与 Connector 的范围、确认策略 |
| `/console/automations` | 自动化 | 规则列表、新建、编辑、启停 |
| `/console/experts` | 专家与 Skill | 目录、版本、Skill 权限、运行记录 |
| `/console/audit` | 家庭审计 | 家庭成员、知识、确认、连接器的脱敏摘要 |

`/console` 只向 owner/admin 注册。未发布 API 的功能必须隐藏，不能以模拟 HTTP 接口填充。

## 5. 页面交互规则

### 用户端

- 确认卡显示标题、影响范围、风险、创建/过期时间、建议动作。L1 仅同家庭且未过期 `pending` 项可批量确认；L2/L3 永远逐项确认或拒绝。每次用户意图生成新的 UUID 幂等键，提交期间禁用按钮。
- 连接页只显示名称、Provider、`status`、`authStatus`、最后同步/健康检查时间和本人范围；不显示 Token、Cookie、URL、`credentialRef`、供应商 ID 或原始错误。
- 个人 OAuth 授权从"我的连接"页发起：选择 Provider → `POST /connector-providers/{code}/authorizations`（`redirectUri = 当前 origin + /oauth/callback`，须命中服务端白名单）→ 整页跳转服务端 `AuthorizationUrl`；回调 302 落回 `/oauth/callback`，该页仅读取会话状态、清理本地标记后返回连接页。发起前把会话 ID 写入 `sessionStorage`（仅用于回跳定位，非凭据），撤销经 `DELETE /connector-authorizations/{id}` 二次确认执行。
- 成员页展示 `active`、`away`、`permanently_left`、`deceased`；终态更正仅对有权限者开放，必须输入原因并二次确认。
- 学习记忆库（`/app/memories`）是独立的长期学习结果展示页，借鉴 Hermes Studio 的记忆可见性：按 `personal|family` 作用域、偏好/事实/决策类型、活跃/已归档状态、更新时间与来源筛选，卡片展示摘要、作用域、置信度/稳定性、最近学习时间、失效时间和来源 Run/Conversation 的脱敏引用。个人记忆只返回本人；家庭记忆由服务端按 `family.read` 过滤；受限来源仅显示计数，不显示原文、其他成员资料、完整会话、Prompt、思维过程、供应商内容或 N97 派生索引。该页只读，不直接改写记忆；纠正、接受、编辑后接受和拒绝仍只在 `/app/family` 的「记忆候选」Tab 按 M2 契约完成。
- Run 详情只显示可理解阶段、建议、Action 和结果；终态停止轮询，不显示 Prompt、思考链和原始日志。
- 我的专家页仅列出并编辑 `owner_user_id=本人` 的自建专家（`scope=mine`）；新建表单必填名称与说明，可编辑自有策略；删除为软删除并二次确认、写家庭审计；编辑期间提示词不回显。
- 快速剪辑页（剪辑对话页）以分步对话式引导推进：素材支持浏览器上传（经 `POST /api/v1/clipping/materials` 登记，服务端落盘 + ffprobe 提取元数据，上传后回填素材路径；素材卡片展示文件名/时长/分辨率，首版不生成缩略图）或本机/NAS 路径输入（可访问性由服务端校验，仅允许配置的素材根目录，越界 403）；对话经 `POST /api/v1/clipping/chat` 推进（context 随请求回传；V2.8 额外携带 `task_id` 引用 `clipping_tasks`）；对话达成目标后创建 Skill Run（UUID 幂等键）；方案以结构化时间线展示（片段序列/配乐/总时长，示意性可视化非真实视频预览）；**修改指令增量更新（V2.8）**：方案展示区提供快捷修改按钮（调整时长/更换风格/编辑片头/调整顺序/删除片段/新增素材/重新生成）与修改输入，修改指令沿用 `POST /skills/runs/{runId}/revise`（UUID 幂等键）执行，并显示服务端返回的版本标记与变更说明；**B36 引擎进度**：只消费 Run 事件中的 `stage`、`status`、可读 `message` 与时间，展示 `video_use`、可选 `seedance`、`hyperframes`、可选 `remotion`、`draft` 阶段；`skipped`、`planning` 或未配置状态绝不表示视频已生成，失败时保留安全消息与修改入口。Seedance 默认关闭，只有用户主动勾选并确认可能费用后才传 `allowSeedance=true`；运行终态或离开页面停止轮询；剪辑方案 Action 确认幂等；草稿下载使用 10 分钟 readToken；不渲染 Prompt、思考链或 MCP 内部路径。**V2.9 体验重构（B37-B40）**：① **粗剪 mp4 预览/下载**——方案确认后任务进入 `rendering` 阶段，轮询 `GET /api/v1/clipping/tasks/{taskId}` 展示「正在渲染预览…」；完成后视频播放器（`<video>`）预览 mp4 并支持下载（readToken），`.draft` 下载入口降级为「进阶：去剪映精剪」；渲染失败展示安全失败消息 + 修改入口（不伪造成功）；② **素材自动发现**——素材区新增「自动发现」分组与扫描状态，服务端扫描登记（`source_type=scan`）的素材卡片与手动上传一致（文件名/时长/分辨率），仅本人可见；③ **自然语言一句话解析**——chat 输入支持一句话（「剪成 30 秒竖屏快节奏带字幕」），服务端返回「已理解：30 秒 / 竖屏 / 快节奏 / 加字幕」确认卡（可修正）后直接生成方案；AI 配置禁用时回退为既有分步引导按钮。
- 思维导图页（`/app/tools/mindmap`）为纯客户端转换：粘贴 markdown 或本地 `.md` 文件（FileReader 本地读取为文本，不上传服务端）→ `POST /api/v1/skills/mindmap/runs` 创建 Skill Run（UUID 幂等键，同步返回 completed）→ markmap-lib 在浏览器转换渲染交互视图；导出 SVG/PNG 来自 markmap-view 实例，「自包含 HTML」内联本地 vendor 资源；Run 记录在运行详情可追溯；不渲染 Prompt。

### 开发端

- 家庭 Connector 创建使用 Provider 驱动表单。浏览器不录入原始第三方 Token；`credentialRef` 只能是服务端已托管引用。Provider 尚无安全服务端录入或 OAuth 流程时，显示“暂不可配置”。
- 同步返回 `202` 后轮询 `GET /api/v1/connectors/sync-jobs/{jobId}`；作业终态或离开页面立即停止。
- 成员授权只能调整家庭实例的可用范围和确认策略，不能把成员 A 的个人 OAuth 授予成员 B。
- 自动化提交前预览触发条件、目标、影响、风险和确认策略；只显示 Run/Action 的标准化结果。
- Skill/Expert 编辑仅在 `ai.skills.write` 等权限存在时开放；提示词不会出现在列表、日志、通知或错误详情。

## 6. 专家与 Skill 功能

### 6.1 领域模型

专家面向用户提供可复现的 AI 角色与策略，Skill 是其可调用、可授权的原子能力，运行记录全部以 AgentRun 落库。Web 只消费目录、版本与运行视图，不直接执行 Skill 或调用 Connector。

| 模型 | 职责 | 关键约束 |
| --- | --- | --- |
| Expert | 目录中的 AI 角色（家庭管家、个人生活专家等） | `code` 唯一、`category`、`builtin`、`owner_user_id`（空=平台基础专家，开发端维护、全家可见；非空=用户自建，用户端维护、仅创建者本人可见）；`type=expert|group` 区分单专家与团队 |
| ExpertVersion | 固化可复现策略的版本 | `system_prompt`、`skill_policy`、`output_schema`；历史 Run 必须关联此版本 |
| Skill | 原子能力而非供应商工具 | `code`、`category`、输入/输出 schema、`risk_level` |
| ExpertSkillPermission | 限制某版本可调用的 Skill | `max_calls`、`require_confirm`；默认拒绝未声明能力 |
| AgentRun | 一次专家分析或执行会话 | 状态 `draft|queued|planning|running|completed|failed|cancelled` |
| Run Event / Run Action | 可理解事件与可确认变更 | Event 不写 Prompt/思考链；Action 确认后经 Connector 执行 |

### 6.2 目录与详情

`/console/experts` 从 `GET /api/v1/experts` 装配专家与 Skill 目录，支持 `query`、`category`、`type` 筛选；详情消费 `GET /api/v1/experts/{id}`，展示版本号、persona、methodology 与 Tool/Skill 策略摘要（`type=group` 时展示团队编排策略）。目录与详情仅需 `ai.read`；Skill/Expert 编辑仅在 `ai.skills.write` 等权限存在时开放，提示词不会出现在列表、日志、通知或错误详情。

### 6.3 专家运行与 Run 详情

运行以 `POST /api/v1/expert-runs` 创建（携带幂等键），通过 `GET /api/v1/expert-runs/{id}` 与 `/events` 轮询公开事件，`/cancel`、`/retry` 处理生命周期（retry 仅限 `failed|cancelled`）。Web 只将状态映射为可理解阶段（如排队/运行中/已完成/失败），不渲染 Prompt、思维链或供应商日志。

`/app/runs/:id` 运行详情展示可公开事件、建议、Action 与结果；Action 状态为 `pending|confirmed|rejected|executing|executed|failed|cancelled`。写操作（`POST /api/v1/expert-runs/{runId}/actions/{actionId}/confirm`）必须使用新的 UUID 幂等键，提交期间禁用按钮；重复键返回既有结果，绝不重复执行。终态停止轮询；跨用户或跨租户的 Run 返回 `404`。

Skill 独立运行（SourceType=skill，如快速剪辑）复用同一运行视图与确认链路：`POST /api/v1/skills/{skillCode}/runs` 创建后按既有 Run 详情轮询，剪辑方案以结构化时间线展示（B30 视图：片段序列/配乐/总时长）；不满意可经 `POST /skills/runs/{runId}/revise` 修订指令重新生成方案（B31，UUID 幂等键；V2.8 演进为增量修改——7 维度修改指令映射 + 3 级粒度：参数调整/部分重做/全量重做，修改历史以版本标记展示）；Action 确认后登记生成文件，经 readToken 下载；素材经 `POST /api/v1/clipping/materials` 上传登记或路径输入；对话引导经 `POST /api/v1/clipping/chat` 推进（只引导不执行；V2.8 起携带 `task_id` 引用 `clipping_tasks`）；B36 轮询任务与 Run events，按公开的 `video_use|seedance|hyperframes|remotion|draft` 与 `queued|running|skipped|succeeded|failed` 渲染进度，拒绝消费原始引擎数据；**B37** 仅在任务或 Run 返回公开的 `Mp4FileId`、`mp4FileId` 或 `mp4_file_id` 后，才用该文件的 readToken 填充 `<video>` 预览与下载；文件 ID 更新时替换旧预览，签名链接申请失败仅提供安全重试；`rendering` 只显示进度，不制造可播放结果。Seedance 仅在显式成本确认后传 `allowSeedance=true`；不渲染 MCP 内部路径、Prompt 或原始 `Result`。

### 6.4 个人生活专家

`personal-life-expert`（category=`life`）是已发布的专家实例，首期交付两个意图：

| 意图 | 行为 | 确认要求 |
| --- | --- | --- |
| `recommend` 翻牌 | 结合时间/位置/口味/天气输出 Top1-2 店铺与理由（`Recommendations`） | 只读 L1，无确认动作 |
| `plan` 行程 | 生成每日行程与 `calendar_create_event` Run Action | L1 确认后逐日创建日历事件；确认前展示影响范围（N 天 → N 个事件） |

AI 对话提取收藏（`favorite.create`）与模型推理依赖 AI 运行时；AI 配置（`ai.config.enabled`）禁用时专家运行整体不可用（`42200`）；专家未初始化时返回可读 `503`。

### 6.5 专家文件与团队运行

专家文件（`expert_file.read/write`）为专家或 Run 附加上下文：创建上传会话 → 对象上传 → 扫描后 `ready|rejected`，仅 `ready` 文件可附加或读取；下载使用 10 分钟有效 `readToken`，响应绝不包含内部对象键或存储路径。

团队运行（`team_run.read/write`）编排已有专家版本，模式仅 `sequential|parallel|synthesis`；服务端冻结团队并计算成员权限交集，外部副作用仍走 Run Action 确认链路；`synthesis` 结果仅在 `completed` 后提供，任何步骤都不返回中间成员输出。

### 6.6 权限与安全边界

| 操作 | 权限 |
| --- | --- |
| 查看目录、专家详情、Run 事件/Action | `ai.read`、`ai.run` |
| Skill/Expert 编辑 | `ai.skills.write` |
| 专家文件 | `expert_file.read` / `expert_file.write` |
| 团队运行 | `team_run.read` / `team_run.write` |

Web 不缓存未公开的运行上下文；Run 详情不显示原始错误与完整响应。

### 6.7 用户端自建专家

用户端 `/app/experts`（我的专家）允许成员自建专家并自行维护，仅创建者本人可见（`scope=mine`），不展示给家庭其他成员；开发端 `/console/experts` 继续维护平台基础专家（`scope=basic`），两者互不覆盖。自建专家编辑仅在 `expert.mine.write` 等权限存在时开放；删除为软删除并写家庭审计，破坏性删除必须二次确认；提示词不出现在列表、日志、通知或错误详情。自建专家与基础专家在移动端/Web 目录中按来源区分展示；对话发送仅由移动端发起，Web 只读消费会话关联的运行详情。

### 6.8 思维导图 Skill（V2.7）

`/app/tools/mindmap` 是纯客户端转换工具：输入 markdown（粘贴或本地 `.md` 文件）→ 创建 Skill Run → markmap-lib 在浏览器转换并渲染交互式思维导图（缩放、拖拽、节点折叠/展开、适配窗口）。转换与渲染全部在浏览器完成（确定性纯函数，与 `core/scripts/md2mindmap.mjs` 同源），服务端只记录 Run 与审计；因此本页不依赖 AI 运行时，`ai.config.enabled=false` 不影响使用。

- **依赖资源**：`public/vendor/markmap/` 下 `markmap-lib.js` 与 `markmap-view.js`（npm 包的 browser IIFE 产物，d3 内联；从 `dist/browser/` 拷贝提交，与本地 md2mindmap 脚本锁定同一 markmap 版本）；`<script>` 静态引入，不进 webpack 打包，规避 Vue 2/webpack 4 对 ESM 依赖的兼容问题；
- **交互**：导入后立即渲染；缩放/折叠为 markmap-view 内置能力，导出按钮置于页面底部（导出 SVG 经实例 `exportSVG()`；导出 PNG 绘制到 canvas；「自包含 HTML」将 vendor 两文件文本 + 思维导图树 JSON 内联进模板后下载，断网可开，符合产品本地优先原则）；
- **权限**：`mindmap.read`（owner/admin/member）+ `ai.run`；viewer 不注册路由与调用；
- **数据边界**：markdown 全文仅随请求发送并存入 Run RequestJson（家庭租户隔离）；不上传服务端文件、不缓存 LocalStorage、不写日志；响应不渲染 Prompt。

### 6.9 Skill 目录查看（V2.7）

产品决策：用户端只能查看本人用户级技能，开发端可查看全部（平台级目录 + 成员技能）。统一经 `GET /api/v1/skills?scope=mine|platform|all`（默认 `mine` 保持既有行为，对齐 `/experts?scope=basic|mine|all` 先例）。

- **用户端 `/app/skills`（我的技能）**：已交付 `scope=mine` 列表本人用户级技能（名称/启用状态/更新时间）及只读详情；Prompt 仅该本人详情可见；不提供新建/编辑页面（CRUD 接口既有，页面后续按需补）；
- **开发端 `/console/experts` 的「Skill」Tab**：已交付 `scope=all` 两组视图——平台级目录（key/名称/分类/风险等级/所需权限/输入 schema，只读）与成员技能（名称/成员/状态，**Prompt 不回显**）；
- 路由与菜单：用户端 `/app/skills` 仅 `scope=mine`（`ai.skills.read`，所有成员）；开发端 Tab 仅 owner/admin（`scope=platform`/`all` 服务端校验角色，member/viewer 即使持有 `ai.read` 也 403）；
- 数据边界：除本人技能详情外，任何视图不展示 Prompt 明文；平台目录不展示审计或运行时字段。

## 7. 连接器功能设计

### 7.1 功能全景

| 页面 | 职责 |
| --- | --- |
| `/console/setup` 首次部署向导 | 选择 Provider → 创建家庭实例 → 测试 → 发现 → 同步，仅编排已发布的 Connector API |
| `/console/connectors` 家庭连接器 | 列表：健康、授权状态、Tool 摘要、最后同步/健康检查时间、同步任务 |
| `/console/connectors/:id` 连接器详情 | 非敏感配置、测试、发现、同步、成员授权 |
| `/console/authorizations` 成员授权 | 成员 × 实例的范围与确认策略 |
| `/app/connections` 我的连接 | 已授权家庭 Connector 与本人个人实例（OAuth）脱敏摘要；发起授权、撤销、重新授权 |

### 7.2 创建与凭据

创建仅接受 `providerId`、`name`、`credentialRef`；未知或厂商凭据字段返回 `422`。`credentialRef` 必须属于调用者租户且为服务端已托管引用，校验后绝不返回；Secret Vault 未启用时创建返回 `503` 与可读配置消息；创建成功后实例以 `disconnected` 状态开始。Provider 尚无安全服务端录入或 OAuth 流程时显示「暂不可配置」，浏览器不录入原始第三方 Token。

### 7.3 测试与发现

- 测试：`POST /api/v1/connectors/{id}/test` 更新连接健康状态，只返回规范化的连接视图（状态、设备数、时间戳），绝不暴露 HA URL、Token 或实体信息。
- 发现：`POST /api/v1/connectors/{id}/discovery` 只将 light、switch、air-conditioner、cover、sensor 实体映射到标准设备模型并写入规范化状态快照，未知 HA 域忽略；`502` 为 HA 不可达/拒绝，`503` 为 Vault 不可用/无效密钥。

### 7.4 同步任务

`POST /api/v1/connectors/{id}/sync` 返回 `202` 后持久化后台任务，客户端轮询 `GET /api/v1/connectors/sync-jobs/{jobId}`。任务状态 `queued|running|completed|failed`，服务端 30 秒超时、最多 3 次尝试并指数退避；`queued/running` 时不得并行重试；作业终态或离开页面立即停止轮询。

### 7.5 成员授权

成员授权（`PUT /api/v1/connectors/{id}/authorizations/{memberUserId}`）只授予或替换当前租户成员的范围，请求含 1–32 个格式良好的 scope（如 `smart_home.read`、`smart_home.light.write`）与确认策略；无授权的成员读取授权信息得到 `403`，跨租户得到 `404`。只能调整家庭实例的可用范围，不能把成员 A 的个人 OAuth 授予成员 B。

### 7.6 权限与安全边界

| 操作 | 权限 |
| --- | --- |
| Provider 目录、实例列表、授权信息 | `connector.read` |
| 创建、测试、发现、同步、成员授权 | `connector.write`（owner/admin） |
| 个人授权发起、会话查询、撤销、我的连接汇总 | `connector.authorize`（owner/admin/member，前端按角色保守提示） |

所有响应绝不包含 `credentialRef`、URL、访问/刷新令牌、厂商实体 ID 或协议字段；连接页只显示名称、Provider、`status`、`authStatus`、最后同步/健康检查时间与本人范围。

### 7.7 V2.4 个人 Connector（已发布）

产品模型：`binding_scope=household|personal`，个人实例带 `owner_user_id`，经 OAuth 授权会话完成凭据生命周期（服务端处理令牌交换与撤销）。Web 已接入：

- 发起：`POST /api/v1/connector-providers/{providerCode}/authorizations`，请求体 `{ redirectUri }` 必须精确命中服务端 `ConnectorOAuth:AllowedRedirectUris` 白名单（否则 `422`；Vault 不可用 `503`+`50001`）。前端以 `window.location.origin + '/oauth/callback'` 作为 `redirectUri`，会话 ID 写入 `sessionStorage`（仅用于回跳定位），随后整页跳转响应中的 `AuthorizationUrl`（匿名 Mock 授权页 → 服务端匿名回调完成令牌交换 → 302 回 `redirectUri`，全程浏览器参与）。
- 回调：`/oauth/callback` 页面读取会话 ID → `GET /connector-authorizations/{id}` 查询一次脱敏状态 → 清理本地标记 → 返回"我的连接"。
- 状态与撤销：`GET/DELETE /connector-authorizations/{id}` 仅本人可用（撤销幂等，写审计）；`GET /connector-authorizations/my` 提供本人个人实例 + 最近会话的脱敏摘要。
- 页面仅消费脱敏状态（`Status`/`AuthStatus`/最后会话），不录入、不存储、不记录 OAuth code、access token、refresh token 或 `credentialRef`。个人实例由服务端回调自动创建，不在首次部署向导中录入。

### 7.8 V2.5 HA MCP 与智能协同工作台

本节借鉴 Hermes Studio 的信息组织和审批交互，不移植 React 代码。NexusMind Web 继续使用 Vue 2 + Element UI，并坚持“Web 只消费标准化产品模型”：浏览器不直连 HA/MCP，不看到 Long-Lived Access Token、HA URL、原始 `entity_id`、任意 service、MCP 启动命令/环境变量、原始 Tool 结果或 `state_changed` 载荷。

#### 7.8.1 页面承载与开放条件

不为 MCP 新建面向普通成员的一级导航。HA 是家庭 Connector 的一种实现，MCP/REST 是 Adapter 内部主备方式；用户看到设备、场景、确认和运行结果，owner/admin 才能在 Connector 详情查看脱敏运行状态。

| 现有页面 | 新增展示 | 可见范围 | 后端前置 |
| --- | --- | --- | --- |
| `/app/overview` | 待确认 HA Action、离线/异常设备摘要、场景执行结果 | 有对应家庭读权限的成员 | H2-H4 标准设备与 Action DTO |
| `/app/confirmations` | 结构化 Approval Card、目标/参数差异、可逆性、执行后状态 | `confirmation.read/write` | H5 Confirmation 结构化上下文 |
| `/app/runs/:id` | “解析目标→检查权限→等待确认→执行→结果复验”时间线；Context Snapshot 抽屉 | 有权读取该 Run 的成员 | H4、M1 |
| `/app/family` 的「记忆候选」Tab | 模型提出的偏好/事实候选、证据、冲突与审核 | 按 personal/family visibility 和家庭权限 | M2 |
| `/console/connectors/:id` 的「设备映射」Tab | 标准设备、空间、能力、同步健康与映射异常 | owner/admin | H2-H3 |
| `/console/connectors/:id` 的「运行状态」Tab | MCP Server 健康、transport、manifest 版本、重连/错误摘要 | owner/admin | H1；运维 DTO 发布后开放 |
| `/console/experts` | 后续 Skill Candidate 治理、团队/DAG 编辑 | owner/admin | Skill Curator / Workflow 后端切片，P2 |

未发布 API 的 Tab 不注册、不显示，不以 Mock HTTP 或浏览器 LocalStorage 伪造完成状态。H1 仅完成后端 MCP 会话时，Web 可以暂不改动；H2 起才出现 HA 专属可见能力。

#### 7.8.2 HA Connector 详情

HA Provider 的 Connector 详情沿用现有详情页，采用顶部状态摘要 + Tab 内容，而不是暴露 MCP 控制台：

1. **状态摘要**：连接状态、授权状态、当前通信模式（`MCP` / `REST 回退`，只作运维标签）、最后健康检查、最后成功同步、最后标准化状态事件、设备总数/异常数。
2. **设备映射**：按空间、设备类型、健康状态筛选；表格只显示 NexusMind 设备名、空间、标准能力、在线/异常状态、最近更新和映射状态。默认不显示 HA 实体标识；诊断下载也必须由服务端脱敏。
3. **运行状态**：显示 MCP Server `healthy|reconnecting|degraded|unavailable`、transport、manifest hash/version、已映射产品 Tool、未映射 Tool 数、最后重连和安全错误摘要。新发现且未映射的 Tool 固定为禁用，不能在 Web 一键扩权。
4. **受控操作**：`测试连接`、`发现设备`、`立即同步`复用现有 API 与轮询；未来的`刷新工具清单`、`重启本地服务`只在运维 API 发布后提供，均需二次确认、幂等键和审计。

页面状态统一映射为：`initial_setup`（待配置）、`connecting`（连接中）、`discovering`（发现中）、`healthy`（正常）、`reconnecting`（正在恢复）、`degraded`（已回退，部分能力可用）、`auth_required`（授权失效）、`unavailable`（不可用）。`reconnecting/degraded` 不弹连续错误 Toast；顶部保留状态条并展示最后一次可读错误摘要和重试入口。高频 `state_changed` 仅更新设备的“最近状态/健康”字段，不在 UI 逐条滚动展示。

#### 7.8.3 Approval Card 与确认范围

确认中心和 Run 详情共用 `ConfirmationCard`。卡片首屏必须回答“谁建议、要改什么、影响哪里、风险多高、多久失效”，字段为：Expert/Agent 名称、动作标题、L1/L2/L3 Badge、房间/设备目标、参数变更前后 Diff、影响摘要、可逆性、依据来源摘要、创建/过期时间和当前执行状态。技术 Tool 名仅在 owner/admin 的折叠诊断中显示；不得展示模型思考链和 MCP 原始参数。

| 风险 | 主操作 | 可选授权范围 | 禁止项 |
| --- | --- | --- | --- |
| L1 | 确认一次、拒绝 | 后端 H5 支持后，可选“本次 Run 内允许同 Tool + 同资源范围 + 同参数约束”；必须显示到期时间 | 卡片中直接创建永久规则 |
| L2 | 确认一次、拒绝 | 无 | 批量、Run/session 自动确认、永久允许 |
| L3 | 确认一次、拒绝；保持高风险警示可见 | 无 | 批量、Run/session 自动确认、永久允许 |

永久 L1 偏好只能在独立设置/授权策略中创建，必须结构化、可撤销、有到期时间，不能按自然语言或命令字符串匹配。最终风险由服务端裁决，前端不得因用户偏好降低等级。

卡片状态覆盖 `pending|submitting|confirmed|denied|expired|cancelled|executing|executed|failed|result_unknown`。提交时禁用重复操作并复用当前意图的 UUID 幂等键；`409` 立即刷新卡片；`expired/cancelled` 不再提供确认；`result_unknown` 使用中性警示“结果暂无法确认”，只允许刷新状态，不自动重放设备写操作。

#### 7.8.4 Run 时间线与 Context Snapshot

HA Run 时间线只显示产品阶段：`正在查找设备` → `正在检查权限` → `等待确认` → `正在执行` → `正在验证结果` → `已完成/失败/结果暂未知`。多个设备合并为可展开的标准设备结果，不输出原始 HA 响应、MCP trace、Token、内部路径或供应商错误。

M1 发布后，在 Run 详情提供只读 `ContextSnapshotDrawer`。它不是 Prompt 查看器，只显示：Snapshot 版本/哈希、冻结时间、家庭知识引用数、个人偏好引用数、决策记录引用、设备状态参考时间、Expert/Skill/Tool Manifest 版本及每类引用的可见摘要。Run 进行中知识变化不改变本 Snapshot；无权查看的个人引用仅显示“受限引用”计数。

#### 7.8.5 Memory Candidate 审核

M2 发布后，`/app/family` 增加「记忆候选」Tab；个人候选只对本人可见，家庭候选按 `family.read/write` 展示。`MemoryCandidateCard` 显示候选事实/偏好、类型、personal/family 可见性、来源 Run、证据摘要、置信度、敏感等级、冲突提示和生成时间，操作为`接受`、`编辑后接受`、`拒绝`。

成员身份、健康、财务、安防、位置轨迹及存在冲突的候选永远要求明确审核；页面不提供“全部自动接受”。接受前展示将写入的目标字段和覆盖/并存策略，写入后链接到家庭知识或个人偏好记录。后台复盘失败不影响原 Run，空状态文案为“暂无需要你确认的新记忆”，不能暗示模型已自动写入长期记忆。

#### 7.8.5.1 学习记忆库

M3 发布后，用户端注册独立路由 `/app/memories`，以 `LearningMemoryLibrary` 展示 M2 候选已被接受并写入事实源后形成的“AI 已学习内容”。这不是候选审核的重复入口，也不是完整记忆存储或 Prompt 调试器：候选保留其审核状态和证据，学习记忆库只提供当前可召回事实的可理解摘要及其学习溯源。

页面首屏包含个人/家庭作用域切换、类型筛选（偏好、事实、决策）、状态筛选（活跃、已归档、已失效）、关键词和更新时间排序；列表采用“摘要 + 作用域 + 类型 + 稳定性/置信度 + 最近学习时间 + 来源”卡片，详情抽屉显示允许访问的来源 Run/Conversation 标识、候选决议时间、覆盖/并存结果和失效策略。它不显示原始证据全文、完整对话、模型输入输出、Prompt、思考链、外部 Provider 原始数据、内部键或 N97 SQLite/FTS 内容。个人项只由其 owner 返回；家庭项以服务端 `family.read` 裁决；来源中包含无权个人项时仅显示“受限引用 N 项”。

路由与菜单只在 M3 API、`memory.read` 权限快照及已发布 `route_key` 同步后注册；否则不显示入口、不创建浏览器缓存或模拟数据。学习记忆库为只读；需要纠正 AI 学习结果时，引导用户到原始记忆候选或对应的家庭知识/个人偏好受控编辑流程，并由后端生成审计。

#### 7.8.6 组件、响应式与可访问性

建议组件边界如下；组件只接收 `api/` 映射后的 ViewModel，不发请求：

| 组件 | 职责 |
| --- | --- |
| `HaConnectorStatusCard` | HA/MCP 健康摘要、状态条和安全重试入口 |
| `HaDeviceMappingTable` | 标准设备/空间/能力与映射异常；窄屏切换卡片 |
| `McpServerHealthPanel` | developer-only transport、manifest、重连摘要和映射覆盖率 |
| `ConfirmationCard` + `RiskBadge` | 统一审批信息、风险语义和可用操作 |
| `ActionImpactDiff` | 结构化参数前后差异、影响范围与可逆性 |
| `RunExecutionTimeline` | 可理解执行阶段与终态，不显示内部推理 |
| `ContextSnapshotDrawer` | 冻结上下文的引用摘要与版本信息 |
| `MemoryCandidateCard` | 候选证据、冲突、接受/编辑/拒绝 |
| `LearningMemoryCard` | 已接受学习记忆的摘要、作用域、类型、稳定性和脱敏来源 |

桌面端 Connector/设备使用摘要卡 + 表格；宽度小于 900px 时表格转卡片、诊断默认折叠。确认卡在窄屏使用底部 sticky 操作区，L2/L3 风险提示始终留在可视区域，主按钮顺序固定且不能仅靠颜色区分风险。所有状态具备图标+文本，倒计时用 `aria-live=polite` 低频更新，确认 Dialog 首焦点落在标题或“拒绝”而不是危险操作。

#### 7.8.7 前端 ViewModel 与拟议 API 边界

后端字段级契约发布前不编写页面 HTTP。建议 `api/home-assistant.js`、`api/confirmations.js`、`api/runs.js`、`api/memory.js` 分别映射以下只读 ViewModel：

```text
HaConnectorRuntimeVM = { connectorId, connectionState, authState, transport,
  lastHealthAt, lastSyncAt, lastStateEventAt, deviceCount, issueCount,
  manifestVersion, manifestHash, mappedToolCount, unmappedToolCount, lastErrorSummary }
HaDeviceMappingVM = { deviceId, displayName, roomName, deviceType,
  capabilities[], healthState, mappingState, lastChangedAt }
ConfirmationActionVM = { confirmationId, runId, actionId, title, expertName,
  riskLevel, targets[], parameterDiff[], impactSummary, reversible, basis[],
  status, createdAt, expiresAt, availableDecisions[] }
ContextSnapshotVM = { snapshotId, version, hash, frozenAt, referenceGroups[],
  deviceStateAsOf, expertVersion, skillVersions[], toolManifestVersion }
MemoryCandidateVM = { candidateId, kind, proposedValue, visibility, evidence[],
  confidence, sensitivity, conflict, status, createdAt }
LearningMemoryVM = { memoryId, summary, kind, visibility, stability, status,
  learnedAt, expiresAt, sourceReferences[], resolutionSummary }
```

建议后端按现有资源路由补充：Connector runtime/设备映射只读视图、Run Context Snapshot 只读视图、Memory Candidate 列表与 resolve 写接口、L1 run-scoped Grant 的确认参数，以及 M3 的学习记忆库游标列表/详情只读视图。M3 响应只返回经 visibility 和成员权限过滤的 `LearningMemoryVM`，并提供来源受限计数而非越权内容；具体 URL、权限码、分页和错误码以 H1-H5/M1-M3 发布契约为准；Web 文档中的字段是联调目标，不构成绕过后端设计评审的临时 API。

### 7.9 美团生活服务个人连接器（规划，未发布 API）

本节对应产品总设计 §7.3 和后端设计 §21。Web 不直接安装或调用美团 CLI/MCP/API，也不处理 Token、手机号、验证码、美团账户 Token、地址簿原始内容或支付。首期仅为 `meituan-travel` 提供“个人连接配置 + 家庭周末出游工作台”；`meituan-paotui` 和分销推广/领券在后端契约、平台许可与合规评审完成前不注册页面、菜单或模拟接口。

| 页面 | 目的与内容 | 开放条件 |
| --- | --- | --- |
| `/app/connections/meituan-travel` | 本人旅行连接：配置状态、最后更新时间、更新与撤销、隐私/外跳说明 | 本地 MTR-1a 已发布连接 API；仅当前成员本人可见 |
| `/app/life/travel` | 出游需求表单、异步 Run、AI 方案摘要、美团原始供给详情、日历/待办确认与美团外跳 | 本地 MTR-1a 的查询 Run 发布；日历 Action 依赖 MTR-2 |

#### 7.9.1 Token 录入与连接状态

旅行 Token 输入框只在用户主动点击“配置/更新”后显示，使用 HTTPS 一次性提交；提交成功、失败或组件销毁后立即清空输入值。页面只显示“已配置/未配置、可用/需重新配置、更新时间”这类脱敏状态，永不回显 Token、账户名、`credential_ref`、供应商命令、日志或错误原文；不得写入 `localStorage`、`sessionStorage`、Vuex 持久化、分析事件或浏览器控制台。

撤销必须二次确认，调用服务端删除连接后刷新脱敏状态。连接未配置、已撤销、授权失效或后端不可用时，旅行入口显示解释与“去配置/重试”，而不是缓存凭据或用假数据继续运行。该流程不是 OAuth 回调，不复用浏览器重定向或第三方 Token 交换。

#### 7.9.2 家庭周末出游工作台

页面先收集城市、日期、出行人数、预算和偏好；缺失项由对话或表单明确补齐。提交创建异步 `travel.search` Run，显示排队/查询中/完成/失败/超时/已取消并按服务端 Run 轮询，离页或终态必须停止轮询。页面分成两个不可混合的区域：

- **NexusMind 方案摘要：** 只解释与已授权日历、家庭成员需求和个人偏好相关的取舍，清楚标注为 AI 建议；不把未确认信息写入家庭知识或学习记忆。
- **美团原始供给详情：** 严格按服务端脱敏后的 Provider 数据展示价格、评分、距离、库存、时效和图片/链接；这些事实字段不可被前端格式化为另一数值、补估、排序后伪称官方推荐或与 AI 文案拼接。

用户选定方案后，日历/待办仍走现有 L1 确认卡、UUID 幂等键与审计链路。预订、短信验证、最终订单确认和支付不在 NexusMind 页面完成；“在美团打开”仅为用户点击触发的外跳，外跳前说明将前往美团，页面不宣称已订购或支付成功。

#### 7.9.3 组件与拟议 API 边界

建议新增 `MeituanTravelConnectionCard`、`TravelSearchForm`、`TravelRunStatus`、`TravelPlanSummary`、`MeituanSupplyList` 与 `OpenMeituanNotice`。组件只消费 `api/meituan-travel.js` 生成的 ViewModel，不直接读取供应商响应或拼接外链：

```text
MeituanTravelConnectionVM = { status, configuredAt, updatedAt, availability, notice }
TravelSearchRunVM = { runId, status, submittedAt, completedAt, summary,
  supplyItems[], calendarActions[], safeError }
MeituanSupplyItemVM = { title, category, price, rating, distance, availability,
  imageUrl, outboundUrl, sourceUpdatedAt }
```

拟议且**未发布**的接口为 `GET/PUT/DELETE /api/v1/connector-providers/meituan-travel/connection` 和 `POST /api/v1/connector-providers/meituan-travel/runs`；先连接本地 MTR-1a 的后端服务完成开发验证，N100 迁移不改变这些客户端契约。具体请求字段、响应、权限、错误码、轮询详情与外跳 URL 均以后端 API 文档发布版本为准。未发布前不得注册以上路由或将它们加进导航。

## 8. API 映射与后端前置项

### 已发布 API

| 模块 | 接口 |
| --- | --- |
| 认证 | `POST /api/v1/auth/register`、`/login`、`/refresh`、`/logout`，`GET /api/v1/auth/me` |
| 概览 | `GET /api/v1/dashboard` |
| 家庭 | `/api/v1/homes/{homeId}/members`、`knowledge`、`decisions`、`activities`、`confirmations` |
| Connector | `GET /api/v1/connector-providers`、`GET/POST /api/v1/connectors`、测试/发现/同步/授权路由；个人 OAuth：`POST /api/v1/connector-providers/{code}/authorizations`、`GET/DELETE /api/v1/connector-authorizations/{id}`、`GET /api/v1/connector-authorizations/my` |
| 自动化 | `GET/POST/PATCH /api/v1/automation-rules` |
| 专家 | `/api/v1/experts`（`?scope=basic\|mine\|all`）、`/skills`、`/expert-runs` |
| Skill | `GET /api/v1/skills`、`POST /api/v1/skills/{skillCode}/runs`、`POST /api/v1/skills/runs/{runId}/actions/{actionId}/confirm`、`POST /api/v1/skills/runs/{runId}/revise`（B24/B25/B31，`ai.run` + `media.read`）；轮询复用 `/api/v1/expert-runs/{id}` 与 `GET /api/v1/clipping/tasks/{taskId}`；草稿与 B37 公开 `Mp4FileId` 下载经 `POST /api/v1/expert-files/{fileId}/read-token?purpose=download` 的 `ReadUrl`（10 分钟 readToken，不落库） |
| 素材与剪辑对话 | `POST/GET/DELETE /api/v1/clipping/materials`（B29，`media.read` + `media.write`，multipart 上传/列表/删除，ffprobe 元数据，路径模式仅允许素材根目录）；`POST /api/v1/clipping/chat`（B32，`ai.run` + `media.read`，无状态 context 引导） |
| 思维导图 | `POST /api/v1/skills/mindmap/runs`（B33，`ai.run` + `mindmap.read`，markdown ≤100000 字符、同步 completed、UUID 幂等键） |
| 学习记忆库 | `GET /api/v1/memories`（M3，`memory.read`，只读游标列表/详情；个人/家庭隔离、来源脱敏、受限引用仅计数，无写接口） |
| Skill 目录 | `GET /api/v1/skills?scope=mine|platform|all`（B34，默认 `mine`；mine=`ai.skills.read` 所有成员；platform/all 仅 owner/admin 角色，member/viewer 403，成员技能视图不含 Prompt） |
| 会话 | `/api/v1/conversations`、`/conversations/{id}`、`/conversations/{id}/messages` |
| 个人偏好 | `/api/v1/life/favorites` |

基础地址使用构建时变量 `VUE_APP_API_BASE_URL`。Axios 拦截器统一加入 Bearer token、解析现有 `ApiResponse<T>` 信封和错误码；页面和组件不得自行拼 URL 或解析后端大小写差异。

### 个人 Connector 的后端前置条件

个人 Connector 已由产品总设计 V2.4 确认；在 B18 迁移、服务、OAuth 安全验证和字段级 API 文档发布前，Web 仍不得实现 HTTP 页面。

| 领域 | 最小要求 |
| --- | --- |
| 数据模型 | Connector 实例增加 `binding_scope=household|personal`；个人实例必须有 `owner_user_id`，家庭实例为 null；凭据继续只存 `credential_ref`。 |
| 可见性与执行 | 个人实例默认仅 owner 可见/读/写；家庭实例继续按成员授权。Run 创建、Action 执行和确认前均把 scope/owner 纳入权限快照与实时复验。 |
| OAuth | 发布发起授权、服务端 callback、状态查询、撤销 API。state/PKCE、回调白名单、令牌加密、刷新、撤销审计都在服务端，浏览器只收成功/失败状态。 |
| Provider 目录 | 声明支持范围、OAuth、读写 Tool、风险等级和是否允许家庭共读。家庭共读与个人发布必须是不同实例。 |

## 9. Vue 2 工程结构

```text
admin/
  docs/main/
  src/
    api/                 # Axios 请求、DTO 到 ViewModel 映射
    components/          # confirmation、connector、common
    layouts/             # UserLayout、ConsoleLayout、AuthLayout
    router/              # 静态路由、权限路由、守卫
    store/               # auth、permission、app、connectorJob
    styles/              # Element 主题覆写、布局、语义变量
    utils/               # request、idempotency、format、permission
    views/auth/
    views/app/
    views/console/
    App.vue
    main.js
  tests/unit/
```

- Vue 2 Options API 为默认写法；仅使用 Vue Router 3、Vuex 3、Axios 和 Element UI，禁止混入另一套 UI 或状态框架。
- `api/*.js` 处理参数、字段映射和错误转换；`views`/组件只接收 ViewModel，不直接调用 Axios。
- 生产目标为短期 access token，refresh token 使用 Secure/HttpOnly/SameSite Cookie。若后端未支持 Cookie 刷新，不得将长期 refresh token 存入 LocalStorage 后宣称具备生产安全性。
- 所有写操作由 `utils/idempotency` 创建键；网络重放使用同一键取回既有结果。离开页面时清理 Run 和同步作业轮询。
- 不缓存无权资源、凭据、Prompt、思考链、原始 Adapter 事件或完整错误响应。

## 10. 实施顺序与验收

| 阶段 | 范围 | 完成标准 |
| --- | --- | --- |
| W0 | 工程基线 | Vue 2/Element UI、环境、ESLint、测试、Axios、登录/刷新/退出、路由守卫 |
| W1 | 用户端只读 | 概览、动态、设备健康、连接摘要、收藏及 loading/empty/error/retry |
| W2 | 确认与家庭 | 确认中心、撤销、成员/知识/决策；L1 批量限制、L2/L3 逐项、幂等恢复测试 |
| W3 | 开发端 Connector | Provider、列表、详情、测试、发现、同步、授权、自动化；无凭据回显 |
| W4 | 专家与运行 | 专家/Skill、Run、Action、用户自建专家、会话运行详情；不显示 Prompt/思考链 |
| W5 | 个人 Connector | B18/B19 发布后实现授权、状态、撤销和家庭/个人 scope 隔离 |
| W6 | 思维导图工具 | `/app/tools/mindmap`：输入 → Run 创建 → markmap 渲染 → 导出；vendor 资源本地化；后端 B33 发布后实现 |
| W7 | Skill 目录查看 | 用户端 `/app/skills`（`scope=mine`，本人技能只读）+ 开发端 Skill Tab（`scope=all`，平台目录 + 成员技能脱敏视图）；后端 B34 发布后实现 |
| W-H1 | MCP 运维只读基线 | `/console/connectors/:id` 运行状态 Tab；健康/transport/manifest 脱敏 ViewModel，无启动命令与 Secret；依赖后端 H1 运维 API |
| W-H2 | HA 设备发现与映射 | 设备映射 Tab、空间/能力/异常筛选、loading/empty/error/retry；依赖 H2，原始 entity_id 不进入 Web |
| W-H3 | HA 状态同步体验 | 概览和设备列表更新最近状态、重连/降级提示；不展示原始事件流；依赖 H3 聚合状态 DTO |
| W-H4 | HA Action 与运行展示 | Run 产品阶段、设备影响 Diff、执行结果/`result_unknown`；依赖 H4 标准 Action DTO |
| W-H5 | 结构化审批体验 | Approval Card 与仅 L1 的 run-scoped 选项；L2/L3 逐项、幂等、过期、409、审计入口测试；依赖 H5 |
| W-M1 | Context Snapshot | Run 详情只读抽屉、引用权限与冻结版本展示；依赖 M1 |
| W-M2 | Memory Candidate | 家庭知识页候选 Tab、接受/编辑/拒绝、敏感与冲突事实逐项审核；依赖 M2 |
| W-MTR-1 | 美团旅行个人连接 | `/app/connections/meituan-travel` 配置/更新/撤销与脱敏状态；Token 提交后清空，不持久化；依赖本地后端 MTR-1a 发布 API |
| W-MTR-2 | 家庭周末出游工作台 | `/app/life/travel` 查询 Run、原始供给/AI 摘要分区、轮询与用户点击外跳；日历/待办确认依赖后端 MTR-2；N100 只影响正式家庭部署，不阻塞本地开发 |

每阶段必须通过 `npm run lint`、单元测试和生产构建；覆盖 owner/admin/member/viewer 与跨家庭不泄露场景；覆盖确认、同步和 OAuth 的 loading、empty、error、retry 与轮询清理；静态扫描确保源码和构建产物不含第三方 Token、Cookie、API Key、`credential_ref`、MCP SQLite 路径或 Prompt。

## 11. 未决决策

1. 一个用户是否可加入多个家庭。当前 JWT 单家庭作用域下不实现 Web 切换家庭。
2. 首批个人 OAuth Provider、授权范围、数据保留期和撤销后的数据清理策略。
3. 首次部署凭据如何进入 Vault。Web 不应接收明文密钥，建议由 N97 本地受控部署向导或 Provider OAuth 托管。
4. 用户邀请、家庭创建、注册后加入家庭的 API 尚未发布，Web 在契约发布前不实现对应流程。
5. 可画、飞书、钉钉等 Productivity/Future Connector Provider 的接入节奏（影响专家对话框的可选连接器列表）。
6. markmap-lib/view 版本锁定策略（当前 0.18.x，随 npm 安装固定，与本地 `core/scripts/md2mindmap.mjs` 保持同版本）。
7. H1-H5/M1-M2 的字段级 Web API、SSE/轮询选择与权限码；契约发布前不实现对应 HTTP 页面。
8. MCP manifest 是否需要独立运维页。当前建议先保留在 HA Connector 详情 Tab，只有多 MCP Server 运维规模出现后再拆页。
