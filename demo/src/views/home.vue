<template>
	<div>
		<select name="userId" v-model="userId" style="width: 100px">
			<option value="1">1</option>
			<option value="2">2</option>
		</select>

		<button type="button" @click="toOrders">登录</button>
	</div>
</template>

<script>
import { initPubnub } from '../pubnub/rooms'
export default {
	name: 'home',
	data() {
		return {
			userId: ''
		}
	},
	methods: {
		toOrders() {
			this.$store.commit('setUserId', this.userId)
			initPubnub(this.userId)
			this.$router.push({ name: 'orders' })
		}
	}
}
</script>
