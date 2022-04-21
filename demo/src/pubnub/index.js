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

	get userId() {
		return this.#userId
	}

	#listener = {
		message: m => {
			console.log('--receive message--', m)

			const channel = m.channel
			const channelGroup = m.subscription
			const timetoken = m.timetoken
			const msg = m.message
			const publisher = m.publisher

			// console.log(channel, channelGroup, timetoken, msg, publisher)

			if (publisher === this.#userId) return

			// TODO:更新room的lastMessage

			if (this.#channelMessageFns[channel]) {
				this.#channelMessageFns[channel].next([m])
			} else {
				this.#unknownChannelSub.next([m])
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

		try {
			this.#userId = userId

			// 获取publishKey和subscribeKey
			const { publishKey, subscribeKey } = {
				publishKey: 'pub-c-a0963302-7b9e-412e-a516-0f5a313835d9',
				subscribeKey: 'sub-c-37ce37ce-bee2-11ec-bd2a-8ab19e3fdcf0'
			}

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
			this.#initialing = false
			await this.init()
		} finally {
			this.#initialing = false
		}
	}

	listenUnknownChannel() {
		return this.#unknownChannelSub.asObservable()
	}

	resetRooms() {
		this.loadingRooms = true
		this.loadingLastMessageByRoom = 0
		this.roomsLoadedCount = 0
		this.rooms = []
		this.roomsLoaded = true
		this.startRooms = null
		this.endRooms = null
		this.resetMessages()
		this.resetListen()
	}

	listen(channel) {
		console.log(`--listen ${channel}--`)
		if (!this.#channelMessageFns[channel]) {
			this.#channelMessageFns[channel] = new Subject()
		}

		return this.#channelMessageFns[channel].asObservable()
	}

	async subscribe(channels) {
		await instance.subscribe({
			channels: [...channels]
		})
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
	async fetchHistory(channel, option) {
		if (this.#fetchingHistorys[channel]) return Promise.resolve()

		this.#fetchingHistorys[channel] = true
		try {
			console.log('fetch history')
			const start = option?.start || Date.now() * 10000
			const count = option?.count || 25

			const res = await instance.fetchMessages({
				channels: [channel],
				start,
				count,
				includeUUID: true,
				includeMessageType: true
			})

			let messages
			if (res.channels[channel]) {
				messages = res.channels[channel]
			} else {
				messages = []
			}
			if (!option?.onlyFetch && this.#channelMessageFns[channel]) {
				this.#channelMessageFns[channel].next(messages)
			}

			return messages
		} catch (e) {
			throw e
		} finally {
			this.#fetchingHistorys[channel] = false
		}
	}
	async messageCounts(channelTimetokens) {
		const channels = channelTimetokens.map(e => e.channel)
		const timetokens = channelTimetokens.map(e => e.timetoken)

		await instance.messageCounts({
			channels: [...channels],
			channelTimetokens: [...timetokens]
		})
	}
	async publish(channel, message) {
		return await instance.publish({
			channel,
			message,
			sendByPost: true
		})
	}
}

export default new PubnubService()
