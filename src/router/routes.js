import AuthLayout from '../layouts/AuthLayout.vue'
import AppLayout from '../layouts/AppLayout.vue'
import ConsoleLayout from '../layouts/ConsoleLayout.vue'
import Login from '../views/auth/Login.vue'
import Overview from '../views/app/Overview.vue'
import Confirmations from '../views/app/Confirmations.vue'
import Activities from '../views/app/Activities.vue'
import PagePlaceholder from '../views/common/PagePlaceholder.vue'
import Forbidden from '../views/common/Forbidden.vue'
import NotFound from '../views/common/NotFound.vue'

const appChildren = [
  { path: 'overview', name: 'app-overview', component: Overview, meta: { title: '家庭概览', permission: 'smart_home.read' } },
  { path: 'confirmations', name: 'app-confirmations', component: Confirmations, meta: { title: '确认中心', permission: 'confirmation.read' } },
  { path: 'activities', name: 'app-activities', component: Activities, meta: { title: '管家动态', permission: 'steward.activity.read' } },
  { path: 'family', name: 'app-family', component: PagePlaceholder, meta: { title: '家庭成员与知识', permission: 'family.read', feature: '家庭协同' } },
  { path: 'life/favorites', name: 'app-favorites', component: PagePlaceholder, meta: { title: '我的偏好', permission: 'life.favorite.read', feature: '个人偏好' } },
  { path: 'connections', name: 'app-connections', component: PagePlaceholder, meta: { title: '我的连接', permission: 'connector.read', feature: '连接授权' } },
  { path: 'profile', name: 'app-profile', component: PagePlaceholder, meta: { title: '账户与会话', permission: 'identity.read', feature: '账户设置' } }
]

const consoleChildren = [
  { path: 'setup', name: 'console-setup', component: PagePlaceholder, meta: { title: '首次部署', permission: 'connector.write', feature: '部署向导' } },
  { path: 'connectors', name: 'console-connectors', component: PagePlaceholder, meta: { title: '家庭连接器', permission: 'connector.read', feature: '连接器管理' } },
  { path: 'authorizations', name: 'console-authorizations', component: PagePlaceholder, meta: { title: '成员授权', permission: 'connector.write', feature: '成员授权' } },
  { path: 'automations', name: 'console-automations', component: PagePlaceholder, meta: { title: '自动化', permission: 'automation.read', feature: '自动化管理' } },
  { path: 'experts', name: 'console-experts', component: PagePlaceholder, meta: { title: '专家与 Skill', permission: 'ai.read', feature: '专家与 Skill' } },
  { path: 'audit', name: 'console-audit', component: PagePlaceholder, meta: { title: '家庭审计', permission: 'family.read', feature: '家庭审计' } }
]

export const routes = [
  {
    path: '/auth',
    component: AuthLayout,
    children: [{ path: 'login', name: 'login', component: Login, meta: { public: true, title: '登录' } }]
  },
  {
    path: '/app',
    component: AppLayout,
    redirect: '/app/overview',
    children: appChildren
  },
  {
    path: '/console',
    component: ConsoleLayout,
    redirect: '/console/connectors',
    children: consoleChildren
  },
  { path: '/403', name: 'forbidden', component: Forbidden, meta: { public: true, title: '无权访问' } },
  { path: '/', redirect: '/app/overview' },
  { path: '*', name: 'not-found', component: NotFound, meta: { public: true, title: '页面不存在' } }
]
