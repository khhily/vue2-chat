<template>
	<chat-container
		v-if="showChat"
		:current-user-id="currentUserId"
		:order-no="orderNo"
		:theme="theme"
		:is-device="isDevice"
		@show-demo-options="showDemoOptions = $event"
	/>
</template>

<script>
import ChatContainer from '../ChatContainer'
import { addRoom, initPubnub } from '../pubnub/rooms'

export default {
	components: {
		ChatContainer
	},
	data() {
		return {
			showChat: false,
			orderNo: '',
			theme: 'light',
			isDevice: false
		}
	},
	computed: {
		currentUserId() {
			return this.$store.state.order.userId
		}
	},
	methods: {
		getOrder() {
			return new Promise(resolve => {
				setTimeout(() => {
					const item = this.$store.state.orders.find(
						s => s.orderNo === this.orderNo
					)
					resolve(item)
				}, 1000)
			})
		}
	},
	created() {
		this.orderNo = this.$route.params.id
		initPubnub(this.$store.state.order.userId)
			.then(() => {
				const roomId = `${this.$store.state.order.userId}.${this.orderNo}`
				return addRoom(roomId, this.$store.state.order.userId)
			})
			.then(() => {
				this.showChat = true
			})
	},
	mounted() {
		this.isDevice = window.innerWidth < 500

		window.addEventListener('resize', ev => {
			if (ev.isTrusted) this.isDevice = window.innerWidth < 500
		})
	}
}
</script>
