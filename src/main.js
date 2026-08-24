import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import AppDialog from './components/common/AppDialog.vue'
import StatusTag from './components/common/StatusTag.vue'
import router from './router'
import store from './store'
import './styles/index.scss'

const app = createApp(App)

app
  .use(store)
  .use(router)
  .use(ElementPlus)

app.component('AppDialog', AppDialog)
app.component('StatusTag', StatusTag)
app.mount('#app')
