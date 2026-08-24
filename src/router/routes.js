import AuthLayout from '../layouts/AuthLayout.vue'
import AppLayout from '../layouts/AppLayout.vue'
import Login from '../views/auth/Login.vue'
import ProductSurfaceUnavailable from '../views/common/ProductSurfaceUnavailable.vue'
import Overview from '../views/app/Overview.vue'
import Devices from '../views/app/Devices.vue'
import Forbidden from '../views/common/Forbidden.vue'
import NotFound from '../views/common/NotFound.vue'

const appChildren = [
  { path: 'dashboard', name: 'app-dashboard', component: Overview, meta: { title: '仪表盘', permission: 'smart_home.read', feature: '家庭状态与自动化健康' } },
  { path: 'devices', name: 'app-devices', component: Devices, meta: { title: '设备管理', permission: 'smart_home.read', feature: 'HA 设备与空间管理' } },
  { path: 'scenes', name: 'app-scenes', component: ProductSurfaceUnavailable, meta: { title: '场景配置', permission: 'smart_home.read', feature: '场景模板、预演与执行审计' } },
  { path: 'memories', name: 'app-memories', component: ProductSurfaceUnavailable, meta: { title: '记忆管理', permission: 'memory.read', feature: '家庭记忆候选与治理' } },
  { path: 'settings', name: 'app-settings', component: ProductSurfaceUnavailable, meta: { title: '系统设置', permission: 'smart_home.write', feature: '家庭信任与系统设置' } }
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
    redirect: '/app/dashboard',
    children: appChildren
  },
  { path: '/403', name: 'forbidden', component: Forbidden, meta: { public: true, title: '无权访问' } },
  { path: '/', redirect: '/app/dashboard' },
  { path: '*', name: 'not-found', component: NotFound, meta: { public: true, title: '页面不存在' } }
]
