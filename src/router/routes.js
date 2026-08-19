import AuthLayout from '../layouts/AuthLayout.vue'
import AppLayout from '../layouts/AppLayout.vue'
import ConsoleLayout from '../layouts/ConsoleLayout.vue'
import Login from '../views/auth/Login.vue'
import Overview from '../views/app/Overview.vue'
import Confirmations from '../views/app/Confirmations.vue'
import Activities from '../views/app/Activities.vue'
import Family from '../views/app/Family.vue'
import LearningMemories from '../views/app/LearningMemories.vue'
import Favorites from '../views/app/Favorites.vue'
import Connections from '../views/app/Connections.vue'
import MyExperts from '../views/app/MyExperts.vue'
import MySkills from '../views/app/MySkills.vue'
import QuickEdit from '../views/app/QuickEdit.vue'
import MediaClips from '../views/app/MediaClips.vue'
import Mindmap from '../views/app/Mindmap.vue'
import XhsWorkspace from '../views/app/XhsWorkspace.vue'
import RunDetail from '../views/app/RunDetail.vue'
import Setup from '../views/console/Setup.vue'
import Connectors from '../views/console/Connectors.vue'
import ConnectorDetail from '../views/console/ConnectorDetail.vue'
import Authorizations from '../views/console/Authorizations.vue'
import Automations from '../views/console/Automations.vue'
import Experts from '../views/console/Experts.vue'
import OAuthCallback from '../views/common/OAuthCallback.vue'
import PagePlaceholder from '../views/common/PagePlaceholder.vue'
import Forbidden from '../views/common/Forbidden.vue'
import NotFound from '../views/common/NotFound.vue'

const appChildren = [
  { path: 'overview', name: 'app-overview', component: Overview, meta: { title: '家庭概览', permission: 'smart_home.read' } },
  { path: 'confirmations', name: 'app-confirmations', component: Confirmations, meta: { title: '确认中心', permission: 'confirmation.read' } },
  { path: 'activities', name: 'app-activities', component: Activities, meta: { title: '管家动态', permission: 'steward.activity.read' } },
  { path: 'family', name: 'app-family', component: Family, meta: { title: '家庭成员与知识', permission: 'family.read' } },
  { path: 'memories', name: 'app-memories', component: LearningMemories, meta: { title: '学习记忆库', permission: 'memory.read' } },
  { path: 'life/favorites', name: 'app-favorites', component: Favorites, meta: { title: '我的偏好', permission: 'life.favorite.read' } },
  { path: 'connections', name: 'app-connections', component: Connections, meta: { title: '我的连接', permission: 'connector.read' } },
  { path: 'experts', name: 'app-experts', component: MyExperts, meta: { title: '我的专家', permission: 'ai.read' } },
  { path: 'skills', name: 'app-skills', component: MySkills, meta: { title: '我的技能', permission: 'ai.skills.read' } },
  { path: 'media/quick-edit', name: 'app-quick-edit', component: QuickEdit, meta: { title: '快速剪辑', permission: 'media.read' } },
  { path: 'media/clips', name: 'app-media-clips', component: MediaClips, meta: { title: '历史剪辑', permission: 'media.read' } },
  { path: 'tools/mindmap', name: 'app-mindmap', component: Mindmap, meta: { title: '思维导图', permission: 'mindmap.read' } },
  { path: 'runs/:id', name: 'app-run-detail', component: RunDetail, meta: { title: '运行详情', permission: 'ai.run' } },
  { path: 'profile', name: 'app-profile', component: PagePlaceholder, meta: { title: '账户与会话', permission: 'identity.read', feature: '账户设置' } },
  { path: 'connections/xhs', name: 'app-xhs-workspace', component: XhsWorkspace, meta: { title: '小红书工作台', permission: 'connector.read' } }
]

const consoleChildren = [
  { path: 'setup', name: 'console-setup', component: Setup, meta: { title: '首次部署', permission: 'connector.write' } },
  { path: 'connectors', name: 'console-connectors', component: Connectors, meta: { title: '家庭连接器', permission: 'connector.read' } },
  { path: 'connectors/:id', name: 'console-connector-detail', component: ConnectorDetail, meta: { title: '连接器详情', permission: 'connector.read' } },
  { path: 'authorizations', name: 'console-authorizations', component: Authorizations, meta: { title: '成员授权', permission: 'connector.write' } },
  { path: 'automations', name: 'console-automations', component: Automations, meta: { title: '自动化', permission: 'automation.read' } },
  { path: 'experts', name: 'console-experts', component: Experts, meta: { title: '专家与 Skill', permission: 'ai.read' } },
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
  { path: '/oauth/callback', name: 'oauth-callback', component: OAuthCallback, meta: { public: true, title: 'OAuth 回调' } },
  { path: '/403', name: 'forbidden', component: Forbidden, meta: { public: true, title: '无权访问' } },
  { path: '/', redirect: '/app/overview' },
  { path: '*', name: 'not-found', component: NotFound, meta: { public: true, title: '页面不存在' } }
]
