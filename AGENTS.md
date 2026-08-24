# HomeMind Web 开发（Vue 3 + Element UI）

`docs/development-plan.md` 是本仓库功能开发的执行队列。根级指令见 `../AGENTS.md`。与移动端流程一致：**读开发计划 → 读后端已发布 API 出入参 → 对接实现 → 回写文档**。

## 文档链（开发前必读）

| 文档 | 路径 | 作用 |
| --- | --- | --- |
| 产品总设计 | `../core/docs/product.md` | 功能卡、产品原则、双端分工 |
| Web 开发计划 | `docs/development-plan.md` | 执行队列：W0-W4 阶段 + 完成定义 |
| Web 产品与信息架构 | `docs/web-product.md` | 双工作区（/app 家庭空间、/console 开发控制台） |
| 跨端 API 契约 | `../core/docs/api-integration.md` | 路由索引、认证刷新、错误码、确认流 |
| UI 风格指南 | `docs/UI_STYLE_GUIDE.md` | 设计令牌、排版、布局、组件、语义色 |
| Web API 接入 | `docs/api-integration.md` | Axios 请求层、认证刷新、错误与运行流 |

**后端 API 出入参唯一事实来源**：运行中 Swagger（`http://localhost:5280/swagger`）+ `../core/HomeMind.Api/Controllers/` 的 DTO。

## 代码结构

```
src/api/        # Axios 请求层 + DTO 映射（显式，不猜命名）
src/views/      # 页面（app=家庭空间 / console=开发控制台 / auth / common）
src/router/     # index.js + routes.js（路由唯一来源）
src/store/      # Vuex 只管理跨页面状态
src/styles/     # index.scss 全局样式入口（语义变量唯一来源）
tests/unit/     # 单元测试
```

## 任务执行流程

1. 读取 `docs/development-plan.md` 选任务（W0-W4，用户指定或首个依赖满足的待做项）。
2. 核对后端 API：读 `src/api/` 现有映射；无则读 Swagger + `../core/HomeMind.Api/Controllers/<Domain>/` 确认路由/入参（camelCase）/出参（PascalCase）/权限/错误码。**后端未发布该接口 → 停止，报告缺口，不 mock。**
3. 写 API 映射：`src/api/<domain>.js` 显式 DTO 映射，遵守 `docs/api-integration.md` 请求层规则。
4. 实现页面：`src/views/` 按 web-product.md 双工作区归属；UI 遵循 UI_STYLE_GUIDE.md 令牌。
5. 状态与交互：`created`/`mounted` 发起加载；loading（v-loading）/empty（el-empty）/error/retry 四态齐备；写操作禁重复提交；幂等一次意图一个 UUID；401 触发一次刷新；删除/高风险操作二次确认；Run/确认流保存 runId 轮询到终态，刷新可恢复。
6. 验证：
   ```bash
   npm run lint
   npm run test:unit -- --run
   npm run build
   ```
7. **回写文档**（与代码同一变更）：`docs/development-plan.md` 状态、`docs/api-integration.md` 新映射登记、`docs/web-product.md` 受影响页面责任、UI 变更同步 `UI_STYLE_GUIDE.md`。

## 验收定义

- 接口已在 Core Swagger 核对（路由/权限/错误语义/数据敏感性）
- API 映射测试 + 关键页面测试通过；lint 无错误；build 成功
- 页面四态齐备；家庭隔离正确；敏感信息不展示
- 文档已回写（计划状态 + API 接入 + 产品信息架构 + UI 指南）

## Pitfalls

- 响应 `Data` 是 PascalCase、请求是 camelCase —— API 映射必须显式，不能猜测
- 页面不得直接调用 axios —— 必须经 `src/api/`；路由只在 `src/router/routes.js` 定义
- 后端未发布契约时停在受控隐藏，不 mock、不伪造成功
- 权限最终以 API 403 为准，前端隐藏只是体验优化
- UI 令牌只从 `src/styles/index.scss` 语义变量取，组件不硬编码颜色/间距

## 下一步计划协议

**用户说「按照下一步计划进行开发」（或「继续开发」）时，自动执行：**

1. 读取 `docs/development-plan.md` 的「下一步」区，选依赖已满足的首个 `待做` 任务。
2. 若该任务在文档中**尚未展开详细任务表**：先在 `docs/development-plan.md` 按「P3-F 家庭财务执行计划」表格格式生成任务表（ID/状态/依赖/编码任务/改动位置/完成标准与验证），写进文档后再开发。**禁止跳过计划直接写代码。**
3. 读 `../core/docs/product.md` 功能卡 + `docs/web-product.md` 双工作区归属；核对现有代码与测试，只做最小改动。
4. 核对后端 API：`../core/HomeMind.Api/Controllers/` + Swagger 确认路由/入参（camelCase）/出参（PascalCase）/权限/错误码；**后端未发布该接口 → 停止并报告缺口，不 mock。**
5. 写 `src/api/<domain>.js` 显式 DTO 映射 → 实现页面（loading/empty/error/retry 四态）→ 补 API 映射/页面测试。
6. 编码前任务状态改 `进行中`；验证后改 `完成`；未通过保留 `进行中` 并报告阻塞。
7. 验证：`npm run lint` → `npm run test:unit -- --run` → `npm run build`。
8. **回写文档**（与代码同一变更）：`docs/development-plan.md` 状态、`docs/api-integration.md` 新映射登记、`docs/web-product.md` 受影响页面责任；UI 变更同步 `docs/UI_STYLE_GUIDE.md`。
9. 若依赖的客户端目录或运行环境不在当前工作区，停止并说明缺少的仓库/环境；不得虚构实现。
