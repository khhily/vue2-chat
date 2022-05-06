import VueRouter from 'vue-router'
import Vue from 'vue'
import Home from '../views/home.vue'
import Orders from '../views/orders.vue'
import Detail from '../views/detail.vue'

Vue.use(VueRouter)

export default new VueRouter({
	routes: [
		{ name: 'home', path: '/', component: Home },
		{ name: 'orders', path: '/orders', component: Orders },
		{ name: 'detail', path: '/detail/:id', component: Detail }
	]
})
