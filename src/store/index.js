import { createStore } from 'vuex'
import auth, { installAuthRefresh } from './modules/auth'

const store = createStore({
  modules: { auth }
})

installAuthRefresh(store)

export default store
