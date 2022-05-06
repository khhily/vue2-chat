<template>
	<div>
		<ul>
			<li
				v-for="item in $store.state.order.orders"
				:key="item.orderId"
				@click="onClickItem(item)"
			>
				{{ item.orderNo }}
			</li>
		</ul>
	</div>
</template>

<script>
export default {
	name: 'Orders',
	data() {
		return {}
	},
	methods: {
		getOrders() {
			return new Promise(resolve => {
				setTimeout(() => {
					const orders = []
					for (let i = 0; i < 10; i++) {
						orders.push({
							orderId: i + 1,
							orderNo: 'orderNo' + (i + 1),
							users: [
								{
									userId: '1',
									userName: 'zs',
									avatar: ''
								},
								{
									userId: '2',
									userName: 'ls',
									avatar: ''
								}
							]
						})
					}

					this.$store.commit('setOrders', orders)
					resolve()
				}, 1000)
			})
		},
		onClickItem(item) {
			this.$router.push({ name: 'detail', params: { id: item.orderNo } })
		}
	},
	created() {
		this.getOrders()
	}
}
</script>
