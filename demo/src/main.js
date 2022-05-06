import Vue from 'vue'
import App from './App.vue'
import store from './store'
import axios from 'axios'
import router from './routes/index'

axios.interceptors.request.use(value => {
	value.baseURL = 'http://localhost:18080'
	return value
})

Vue.config.productionTip = false

new Vue({
	store,
	router,
	render: h => h(App)
}).$mount('#app')
