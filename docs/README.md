# HomeMind Web 文档

本目录定义 HomeMind Web（Vue 3 + Element Plus）的产品边界、执行队列和后端接入规则。产品事实以 `../core/docs/product.md` 为准；接口字段、权限和状态码仅以运行中的 Core Swagger 与 Controller DTO 为准。

| 文档 | 用途 | 何时阅读 |
| --- | --- | --- |
| [Web 产品与信息架构](web-product.md) | 固定五模块、页面职责与双端分工 | 新页面、导航或权限调整前 |
| [Web 开发计划](development-plan.md) | 当前交付顺序、阻塞项和验收门槛 | 收到“继续开发”或拆分任务时 |
| [Web API 接入](api-integration.md) | Axios 请求层、认证刷新、已核验路由与阻塞规则 | 新增或修改 API 调用时 |
| [Web UI 风格指南](UI_STYLE_GUIDE.md) | 设计令牌、布局、状态与风险语义 | 调整视觉或组件时 |

Web 是稳定网络下的深度管理端，不是第二个日常遥控器。侧边栏只保留“仪表盘、设备管理、场景配置、记忆管理、系统设置”五个模块；财务、缴费、快递、宠物、日程、专家/Skill、内容工作台和旧微信授权均已下线，不得新增入口或 API 调用。

修改功能时先读本目录相关文档，再检查 `src/api`、`src/router` 和 `src/views`。接口契约不可用时使用受控不可用状态，不 mock、不猜测字段，也不保存过程日志。

## 前端基线

- 应用使用 Vue 3、Vue Router 4、Vuex 4 与 Element Plus；入口通过 `createApp` 组装应用、状态与路由。
- 通用状态提示使用 `src/components/common/PageState.vue`，通用弹层使用 `src/components/common/AppDialog.vue`，语义状态标签使用 `src/components/common/StatusTag.vue`；页面不得重新实现同类基础交互。
- 单测使用 Vue Test Utils 2，`tests/unit/setup.js` 统一适配 Vue 3 挂载与 Element Plus 测试桩。新增测试必须使用 `props`、`global.mocks`、`global.stubs` 和 `unmount()`，不再新增 Vue 2 测试 API。
