# HomeMind Web 开发计划

> 收到“继续开发”时，选择“下一步”中依赖已满足的第一个 `待做` 任务。若没有详细任务表，先按本文件任务表格式补全，再修改代码。API 字段级事实只来自运行中的 Swagger 与 Controller DTO；缺少已发布契约时停止在受控不可用状态，不 mock、不猜测字段。

## 下一步

| 顺序 | 任务 | 领域 | 状态 | 说明 |
| --- | --- | --- | --- | --- |
| 1 | R1-W1 | Web 表面收敛 | 完成 | 已固定五模块侧边栏和路由；未核验模块统一受控不可用 |
| 2 | R1-W2 | 旧领域代码退役 | 阻塞 | 目标文件包含未提交和未跟踪改动，需先确认可删除范围 |
| 3 | P1-W1 | 仪表盘与设备管理 | 完成 | 已接入 Household State 与 Development 只读模拟家庭数据；页面标注模拟边界 |
| 4 | P1-W2 | 场景配置与系统设置 | 阻塞 | 等待 Scenario/Trust 的 Swagger 请求与响应 DTO |
| 5 | P2-W1 | 记忆治理与审计 | 阻塞 | 等待 M0 候选、保留策略和审计契约；不得复用旧 memories |

## 产品阶段

| 阶段 | 范围 | 完成定义 |
| --- | --- | --- |
| R1 Web 收敛 | 下线旧领域，固定五模块导航与受控不可用边界 | 无旧入口、无模拟数据、文档与路由一致 |
| P1 Web 基础配置 | 仪表盘、HA 设备管理、场景配置、信任和系统设置 | Swagger 核验、显式 DTO、四态、幂等与确认流齐备 |
| P2 深度治理 | 记忆候选、保留策略、规则、自动化健康与执行审计 | 批量治理、来源/时间、失败步骤重试和权限边界正确 |

## V3-M0 Vue 3 升级与公共组件执行计划

| ID | 状态 | 依赖 | 编码任务 | 改动位置 | 完成标准与验证 |
| --- | --- | --- | --- | --- | --- |
| V3-M0-1 | 完成 | 当前 Vue 2 工程 | 将 Vue、Vue Router、Vuex、Element UI、测试工具升级到 Vue 3 兼容版本，改造应用入口、路由与状态管理 | `package.json`、`package-lock.json`、`src/main.js`、`src/router/`、`src/store/` | 使用 `createApp`、Vue Router 4、Vuex 4 与 Element Plus；会话刷新、路由守卫保持行为一致 |
| V3-M0-2 | 完成 | V3-M0-1 | 全量迁移 Vue 2 模板和生命周期语法，替换 `.sync`、具名 slot、`slot-scope` 与 Vue 2 销毁钩子 | `src/**/*.vue`、`tests/unit/**/*.spec.js` | 无 Vue 2 专用模板或生命周期 API；所有页面可由 Vue 3 编译 |
| V3-M0-3 | 完成 | V3-M0-1 | 抽取重复页面状态、确认对话框、表格状态标签与时间格式为公共组件/工具 | `src/components/common/`、`src/utils/`、相关页面 | 可复用 UI 只保留一处实现，保持现有权限、敏感数据与四态边界 |
| V3-M0-4 | 完成 | V3-M0-2、V3-M0-3 | 更新 Vue 3 测试配置与测试桩，回写开发、产品与 UI 文档并完成验证 | `tests/`、`docs/` | lint、全量单测、生产构建成功；迁移说明和公共组件责任已登记 |

## R1-W Web 表面收敛执行计划

| ID | 状态 | 依赖 | 编码任务 | 改动位置 | 完成标准与验证 |
| --- | --- | --- | --- | --- | --- |
| R1-W1 | 完成 | `core/docs/product.md` | 路由和侧边栏已收敛为仪表盘、设备管理、场景配置、记忆管理、系统设置；没有字段级契约的模块统一显示受控不可用 | `src/router/routes.js`、`src/layouts/AppLayout.vue`、`src/layouts/MainLayout.vue`、`src/views/common/`、`tests/unit/product-surface.spec.js` | 旧领域不再通过路由或侧边栏暴露；无 API 猜测或 mock；lint、定向测试和构建通过 |
| R1-W2 | 阻塞 | R1-W1、删除范围确认 | 删除已下线领域的不可达页面、API 映射和定向测试；保留认证、请求层、权限和共享 UI | `src/views/`、`src/api/`、`tests/unit/` | 目标文件中含未提交及未跟踪改动，未获确认前不删除或覆盖用户工作 |
| R1-W3 | 待做 | R1-W1、R1-W2 | 回写产品、API、UI 文档并完成 Web 验证 | `docs/`、`tests/unit/` | `npm run lint`、`npm run test:unit -- --run`、`npm run build` 成功 |

## P1-W1 仪表盘与设备管理执行计划

| ID | 状态 | 依赖 | 编码任务 | 改动位置 | 完成标准与验证 |
| --- | --- | --- | --- | --- | --- |
| P1-W1-1 | 完成 | Core DEV0-1、DEV0-2 | 增加 Household State 与 Development mock bootstrap 的显式 PascalCase DTO 映射，标记模拟数据边界 | `src/api/household.js`、`src/api/smartHome.js`、`tests/unit/household.spec.js`、`tests/unit/smart-home.spec.js` | 路由、权限、字段和 `IsMock` 提示与 Core DTO 一致；不发送写请求 |
| P1-W1-2 | 完成 | P1-W1-1 | 实现仪表盘家庭状态摘要、来源/更新时间、降级原因和设备健康摘要四态 | `src/views/app/Overview.vue`、`tests/unit/overview-view.spec.js` | loading、empty、error/retry、模拟数据警示齐备；不把预计状态称为实时 |
| P1-W1-3 | 完成 | P1-W1-1 | 实现设备管理空间筛选、设备表格和语义健康状态展示 | `src/views/app/Devices.vue`、`src/router/routes.js`、`tests/unit/devices-view.spec.js` | 仅展示标准化字段；不展示 HA URL、令牌或原始实体 ID；四态齐备 |
| P1-W1-4 | 完成 | P1-W1-2、P1-W1-3 | 回写 Web/API/UI 文档并完成定向与全量 Web 验证 | `docs/`、`tests/unit/` | lint、unit、build 全部通过 |

## API 阻塞记录

- 2026-08-24：Core 已发布 Development 只读模拟家庭数据：`GET /api/v1/smart-home/mock/bootstrap`，需要 `smart_home.read`，固定返回 `IsMock=true`、负数样例 ID、空间/设备/场景/健康汇总；关闭时返回 `503`。前端仅用于仪表盘和设备管理展示，不得用于执行、确认或写入。
- 2026-08-24：运行中的 `http://127.0.0.1:5280/swagger/v1/swagger.json` 当前无法连接；字段依据 Core Controller 与 `SmartHomeViewModels` DTO 核对，服务恢复后需补做 Swagger 联调。
- `HouseholdStateController`、`SmartHomeController`、`ScenarioController` 和 `TrustController` 源码中的 `object` 返回不能作为 Web 字段映射依据。
- R1-W2 目标中的旧领域文件包含当前工作区未提交/未跟踪变更；在用户明确删除范围前保持不可达，不执行物理删除。

## 单项完成定义

1. 明确产品模块、路由归属和服务端权限。
2. 在 Swagger 核验请求、响应、错误与敏感字段后，才在 `src/api` 写显式映射。
3. 每个异步页面具备 loading、empty、error、retry、无权与重复提交状态。
4. 场景运行/确认保留 `runId`，写操作使用一次意图一个 UUID 幂等键，高风险操作二次确认。
5. 同步本目录受影响文档，并运行 lint、单测和构建。
