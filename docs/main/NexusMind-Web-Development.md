# NexusMind Web端 开发设计

> **项目目录：** `D:\HomeMind\admin`
> **技术基线：** Vue 2 + Element UI 2 + Vue Router 3 + Vuex 3 + Axios
> **后端依据：** `D:\HomeMind\core\docs\main\NexusMind-Backend-Development.md`、`docs/api-implementation.md`、`docs/frontend-api-integration.md`
> **产品依据：** `D:\HomeMind\core\docs\main\NexusMind-Product-Master-Design.md`
> **状态：** 仅完成设计，尚未初始化前端工程或编写业务代码。
> **最后更新：** 2026-08-07

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
| `/app/family` | 家庭成员与知识 | 成员状态、知识、决策记录 |
| `/app/life/favorites` | 我的偏好 | 餐厅/旅行/素材收藏及可见性 |
| `/app/connections` | 我的连接 | 已授权家庭 Connector 与本人个人实例（OAuth）脱敏状态；发起授权、撤销、重新授权 |
| `/app/runs/:id` | 运行详情 | 可公开事件、影响、Action 确认、专家文件（附件）、时间线、生成文件下载——承接移动端移出的运行细节 |
| `/app/media/quick-edit` | 快速剪辑 | 素材位置与创作目标和指令表单、Skill 运行轮询、剪辑方案摘要、Action 确认、.draft 草稿下载 |
| `/app/experts` | 我的专家 | 自建专家列表、新建、编辑、删除（仅创建者本人可见） |
| `/app/profile` | 账户与会话 | 本人资料、退出 |

### 开发端 `/console`

| 路由 | 页面 | 主要内容 |
| --- | --- | --- |
| `/console/setup` | 首次部署向导 | Provider、创建家庭实例、测试、发现、同步 |
| `/console/connectors` | 家庭连接器 | 健康、授权、Tool 摘要、同步任务 |
| `/console/connectors/:id` | 连接器详情 | 非敏感配置、测试、发现、同步、成员授权 |
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
- Run 详情只显示可理解阶段、建议、Action 和结果；终态停止轮询，不显示 Prompt、思考链和原始日志。
- 我的专家页仅列出并编辑 `owner_user_id=本人` 的自建专家（`scope=mine`）；新建表单必填名称与说明，可编辑自有策略；删除为软删除并二次确认、写家庭审计；编辑期间提示词不回显。
- 快速剪辑页表单输入素材位置（本机/NAS 路径字符串，不做本机文件浏览，可访问性由服务端校验）与创作目标和指令；提交生成新的 UUID 幂等键；运行终态或离开页面停止轮询；剪辑方案 Action 确认幂等；草稿下载使用 10 分钟 readToken；不渲染 Prompt、思考链或 MCP 内部路径。

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

Skill 独立运行（SourceType=skill，如快速剪辑）复用同一运行视图与确认链路：`POST /api/v1/skills/{skillCode}/runs` 创建后按既有 Run 详情轮询，剪辑方案 Action 确认后登记生成文件，经 readToken 下载；不渲染 MCP 内部路径或 Prompt。

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
| Skill | `GET /api/v1/skills`、`POST /api/v1/skills/{skillCode}/runs`（`media.read`；执行前以 `api-implementation.md` 字段级契约为准） |
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

每阶段必须通过 `npm run lint`、单元测试和生产构建；覆盖 owner/admin/member/viewer 与跨家庭不泄露场景；覆盖确认、同步和 OAuth 的 loading、empty、error、retry 与轮询清理；静态扫描确保源码和构建产物不含第三方 Token、Cookie、API Key、`credential_ref`、MCP SQLite 路径或 Prompt。

## 11. 未决决策

1. 一个用户是否可加入多个家庭。当前 JWT 单家庭作用域下不实现 Web 切换家庭。
2. 首批个人 OAuth Provider、授权范围、数据保留期和撤销后的数据清理策略。
3. 首次部署凭据如何进入 Vault。Web 不应接收明文密钥，建议由 N97 本地受控部署向导或 Provider OAuth 托管。
4. 用户邀请、家庭创建、注册后加入家庭的 API 尚未发布，Web 在契约发布前不实现对应流程。
5. 可画、飞书、钉钉等 Productivity/Future Connector Provider 的接入节奏（影响专家对话框的可选连接器列表）。
