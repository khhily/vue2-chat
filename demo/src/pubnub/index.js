import PubNub from 'pubnub'
import { Subject } from 'rxjs'

let instance

class PubnubService {
	#channelMessageFns = {}

	#userId

	#initialed = false

	#initialing = false

	#fetchingHistorys = {}

	#unknownChannelSub = new Subject()

	#timeoutInit

	#dispose = false

	get userId() {
		return this.#userId
	}

	#listener = {
		message: m => {
			console.log('--receive message--', m)

			const channel = m.channel
			// const channelGroup = m.subscription
			// const timetoken = m.timetoken
			// const msg = m.message
			const publisher = m.publisher

			// console.log(channel, channelGroup, timetoken, msg, publisher)

			if (publisher === this.#userId) return

			// 更新room的lastMessage
			// 不需要更新，因为会在初始化的时候fetch过来

			this.#unknownChannelSub.next([m])

			if (this.#channelMessageFns[channel]) {
				this.#channelMessageFns[channel].next([m])
			}
		},
		status: s => {
			const affectedChannelGroups = s.affectedChannelGroups // Array of channel groups affected in the operation
			const affectedChannels = s.affectedChannels // Array of channels affected in the operation
			const category = s.category // Returns PNConnectedCategory
			const operation = s.operation // Returns PNSubscribeOperation
			const lastTimetoken = s.lastTimetoken // Last timetoken used in the subscribe request (type long)
			const currentTimetoken = s.currentTimetoken
			/* Current timetoken fetched in subscribe response,
			 * to be used in the next request (type long) */
			const subscribedChannels = s.subscribedChannels

			if (category === 'PNBadRequestCategory') {
				// instance.
				this.subscribe([`${userId}.*`])
			}

			console.log(JSON.stringify(s))
		}
	}

	async init(userId) {
		if (this.#initialed) return

		if (this.#initialing) return
		this.#initialing = true

		if (this.#timeoutInit) {
			clearTimeout(this.#timeoutInit)
		}

		try {
			this.#userId = userId

			// 获取publishKey和subscribeKey
			const { publishKey, subscribeKey } = {
				publishKey: 'pub-c-a0963302-7b9e-412e-a516-0f5a313835d9',
				subscribeKey: 'sub-c-37ce37ce-bee2-11ec-bd2a-8ab19e3fdcf0'
			}

			console.log('-- ' + this.userId + ' --')
			instance = new PubNub({
				publishKey,
				subscribeKey,
				uuid: userId
			})

			instance.setFilterExpression(`uuid != '${instance.getUUID()}'`)

			instance.addListener(this.#listener)

			this.subscribe([`${userId}.*`])

			// 获取rooms和未读消息/条数

			console.log('--init--')

			this.#initialed = true
		} catch (e) {
			console.error(e)
			console.log('-- ' + this.userId + ' --')

			if (this.#dispose) throw e

			await new Promise(resolve => {
				setTimeout(() => {
					this.#initialing = false
					resolve(this.init(userId))
				}, 3000)
			})
			// await this.init()
		} finally {
			this.#initialing = false
		}
	}

	listenUnknownChannel() {
		return this.#unknownChannelSub.asObservable()
	}

	resetRooms() {
		this.#dispose = true
		this.unsubscribeAll()
		this.#unknownChannelSub.complete()
		Object.values(this.#channelMessageFns).forEach(e => e.complete())
		this.#channelMessageFns = {}
	}

	listen(channel) {
		if (!this.#channelMessageFns[channel]) {
			this.#channelMessageFns[channel] = new Subject()
		}

		return this.#channelMessageFns[channel].asObservable()
	}

	off(channel) {
		if (this.#channelMessageFns[channel]) {
			this.#channelMessageFns[channel].complete()
			delete this.#channelMessageFns[channel]
		}
	}

	async subscribe(channels) {
		await instance.subscribe({
			channels: [...channels]
		})
	}

	async unsubscribeAll() {
		await instance.unsubscribeAll()
	}

	async subscribeGroups(groups, channels) {
		await instance.subscribe({
			channels: [...channels],
			channelGroups: [...groups]
		})
	}
	async addToGroup(group, channels) {
		await instance.channelGroups.addChannels({
			channels: [...channels],
			channelGroup: group
		})
	}
	async removeFromGroup(group, channels) {
		await instance.channelGroups.removeChannels({
			channels: [...channels],
			channelGroup: group
		})
	}
	async publish(message) {
		try {
			return await instance.publish({
				...message,
				sendByPost: true
			})
		} catch (e) {
			if (this.#dispose) throw e

			this.#initialed = false
			await this.init(this.userId)

			return await instance.publish({
				...message,
				sendByPost: true
			})
		}
	}
}

const service = {
	pubnub: new PubnubService()
}

export function createPubnub() {
	if (!service.pubnub) service.pubnub = new PubnubService()
}

export function pubnubService() {
	return service.pubnub
}

export function dispose() {
	service.pubnub.resetRooms()
	service.pubnub = null
}
