export default {
	state: {
		userId: '',
		orders: []
	},
	mutations: {
		setUserId(state, payload) {
			state.userId = payload
		},
		setOrders(state, payload) {
			state.orders = payload
		}
	}
}
