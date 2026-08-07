import Vue from 'vue'
import Vuex from 'vuex'
import auth, { installAuthRefresh } from './modules/auth'

Vue.use(Vuex)

const store = new Vuex.Store({
  modules: { auth }
})

installAuthRefresh(store)

export default store
