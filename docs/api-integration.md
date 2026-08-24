# HomeMind Web API 接入

## 请求与认证

所有 HTTP 调用必须经过 `src/utils/request.js` 的 Axios 实例和 `src/api/*.js` 显式映射模块。组件不得直接调用 Axios、手工拼接令牌或把原始服务端响应保存到视图状态。

- 请求体/查询参数使用 camelCase；服务端包络为 `{ Code, Message/Msg, Data }`，`Data` 字段按 Swagger 的 PascalCase 映射。
- `Code !== 0` 即使 HTTP 成功也必须按失败处理。
- 仅 HTTP `401` 且业务码 `20001` 触发单飞 `refreshSession`；原请求只重放一次，失败后清理会话并跳转登录。
- 403、404、409、422、502/503 必须显示安全的页面状态，不能输出完整服务端载荷。

## 当前契约状态

2026-08-24 在本机检查 `/swagger/v1/swagger.json` 返回 `500`。根因是 `AuthController.WeChatExchange`（已下线的微信授权 stub）没有显式 HTTP Method，导致 Swagger 不能生成 OpenAPI。虽然 Controller 源码可见新领域路径，但 `object` 响应尚不能替代字段级 OpenAPI 契约。

因此本仓库当前不得为以下尚未具备字段级契约的接口写 DTO 映射或页面请求；等待 Core 移除已下线入口并恢复 Swagger 后再核对请求体、`Data` 字段、错误码与权限。Household State 和 Development mock bootstrap 已依据 Core Controller/DTO 接入，服务恢复后需补做 Swagger 联调：

Development 期间已发布只读模拟接口 `GET /api/v1/smart-home/mock/bootstrap`（权限 `smart_home.read`）。它返回 `IsMock`、`Disclaimer`、`GeneratedAt`、`Spaces`、`Devices`、`Scenes` 和 `DeviceHealth`，样例 ID 为负数；关闭时返回 `503`。Web 仅用于仪表盘与设备管理展示，不将其作为 HA 状态，也不提交到执行、确认或写入接口。

| Web 模块 | 待核验 Core 路由 | Controller 线索 |
| --- | --- | --- |
| 设备管理 | `GET /api/v1/smart-home/spaces`、`devices`、`devices/health` | `SmartHomeController`，`smart_home.read` |
| 场景配置 | `scenarios/templates`、`instances`、预演、生命周期和执行审计路由 | `ScenarioController`，读 `smart_home.read`，写 `smart_home.write`/`ai.run` |
| 系统设置 | `homes/{homeId}/trust/policies` | `TrustController`，读取 `smart_home.read`，写 `smart_home.write` 且需家庭 owner/admin |
| 记忆管理 | M0 记忆候选、治理与保留策略 | 尚无产品匹配的已核验字段级契约；不得以旧 `memories` 接口替代 |

## 已接入映射

| Web 模块 | 文件 | 已核验路由 | 说明 |
| --- | --- | --- | --- |
| 仪表盘与设备管理 | `src/api/smartHome.js` | `GET /api/v1/smart-home/mock/bootstrap` | 显式映射模拟家庭只读 DTO，保留 `isMock` 与免责声明 |
| 仪表盘家庭上下文 | `src/api/household.js` | `GET /api/v1/homes/{homeId}/state` | 显式映射 Household State；`homeId` 仅取当前令牌家庭 |

恢复后按以下顺序接入：核对 Swagger → 在 `src/api/<domain>.js` 显式映射 → 写映射测试 → 接入页面四态 → 回写本表。对场景写操作必须传递 Core 要求的幂等 UUID；预演不调用 HA，确认/执行/重试/撤销保存并轮询对应运行 ID。

## 禁止使用的旧映射

`finance.js`、`courier.js`、`pet.js`、`schedule.js`、`expert.js`、`skill.js`、`xhs.js`、`favorite.js`、旧媒体/会话映射以及旧微信授权均已不属于产品。它们不得被新路由或新页面引用，也不得作为新 HomeMind 字段的替代来源。
