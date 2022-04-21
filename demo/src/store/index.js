import Vue from 'vue'
import Vuex from 'vuex'
import {
	fetchLastMessage,
	fetchMoreRooms,
	resetListeners,
	listenUnknownChannel
} from '@/pubnub/room-list'
import { formatLastMessage } from '@/utils/message'
import pubnubService from '@/pubnub'
import { listenRoom } from '../pubnub/room-list'
import { formatMessage } from '../utils/message'
import { createRoom } from '../utils/room'

Vue.use(Vuex)

export default new Vuex.Store({
	state: {
		rooms: [],
		loadingRooms: false,
		loadingLastMessageByRoom: 0,
		roomsLoadedCount: 0,
		roomsLoaded: true,
		startRooms: null,
		endRooms: null,
		subscriptions: {},
		currentRoom: null
	},
	mutations: {
		resetRooms(state) {
			state.rooms = []
			state.loadingRooms = true
			state.loadingLastMessageByRoom = 0
			state.roomsLoadedCount = 0
			state.rooms = []
			state.roomsLoaded = true
			state.startRooms = null
			state.endRooms = null
			Object.values(state.subscriptions).forEach(v => v?.unsubscribe())
			state.subscriptions = {}
		},
		setRooms(state, rooms) {
			state.rooms = rooms
		},
		addRoom(state, room) {
			state.rooms.push(room)
		},
		setLoadingRooms(state, loadingRooms) {
			state.loadingRooms = loadingRooms
		},
		setLoadingLastMessageByRoom(state, count) {
			state.loadingLastMessageByRoom = count
		},
		setRoomsLoaded(state, v) {
			state.roomsLoaded = v
		},
		setRoomsLoadedCount(state, count) {
			state.roomsLoadedCount = count
		},
		setStartRooms(state, room) {
			state.startRooms = room
		},
		setEndRooms(state, room) {
			state.endRooms = room
		},
		pushSubscription(state, { roomId, subscription }) {
			state.subscriptions = {
				...state.subscriptions,
				[roomId]: subscription
			}
		},
		setCurrentRoom(state, currentRoom) {
			state.currentRoom = currentRoom
		}
	},
	getters: {
		rooms: state => state.rooms,
		loadingRooms: state => state.loadingRooms,
		loadingLastMessageByRoom: state => state.loadingLastMessageByRoom,
		roomsLoadedCount: state => state.roomsLoadedCount,
		roomsLoaded: state => state.roomsLoaded,
		startRooms: state => state.startRooms,
		endRooms: state => state.endRooms
	},

	actions: {
		// 初始化pubnub
		async initPubnub(_, userId) {
			await pubnubService.init(userId)
			_.commit('resetRooms')
			await _.dispatch('initData', { currentUserId: userId })
			console.log('init complete')
		},

		async initData(_, params) {
			try {
				await _.dispatch('fetchMoreRooms', params)
				_.commit('setRoomsLoaded', true)
				_.dispatch('addListenRooms', params)
			} catch (e) {
				return new Promise((resolve, reject) => {
					setTimeout(() => {
						_.dispatch('initData', params)
							.then(() => {
								resolve()
							})
							.catch(reject)
					}, 3000)
				})
			}
		},

		// 获取rooms，并添加事件监听，处理新消息
		addListenRooms(_, { currentUserId }) {
			resetListeners()
			_.state.rooms.forEach(room => {
				_.dispatch('listenRoom', { roomId: room.roomId })
			})

			listenUnknownChannel(messages => {
				if (messages && messages.length) {
					console.log('unknown channel')
					messages.forEach(async message => {
						let room = _.state.rooms.find(r => r.roomId == message.channel)
						if (room) {
							room.unreadCount = room.unreadCount || 0
							room.unreadCount++
						} else {
							// 新增room
							room = await createRoom(message.channel, message.publisher)
							room.unreadCount++
							room.lastMessage = formatMessage(room, message, currentUserId)
							// 将创建的聊天室加入列表
							_.commit('addRoom', room)

							// 新的聊天室需要添加监听
							_.dispatch('listenRoom', { roomId: room.roomId })
						}
					})
				}
			})
		},

		listenRoom(_, params) {
			listenRoom(params.roomId, m => {
				// m.channel
				// m.publisher
				// m.timetoken
				const room = _.state.rooms.find(room => room.roomId == m.channel)
				if (room && room.roomId != _.state.currentRoom) {
					room.unreadCount = room.unreadCount || 0
					room.unreadCount++

					_.commit('setRooms', [..._.state.rooms])
				}
			})
		},

		clearUnreadCount(_, roomId) {
			const room = _.state.rooms.find(r => r.roomId == roomId)
			if (room) {
				room.unreadCount = 0

				_.commit('setRooms', [..._.state.rooms])
			}
		},

		// 根据id获取room对象
		getRoom({ state }, roomId) {
			if (!state.rooms.length) return

			return state.rooms.find(room => room.roomId === roomId)
		},

		// 从服务器获取rooms
		async fetchMoreRooms({ commit, dispatch }, params) {
			const rooms = await fetchMoreRooms()

			commit('setRooms', rooms)

			if (!rooms || !rooms.length) {
				commit('setLoadingRooms', false)
				commit('setRoomsLoadedCount', 0)
				return
			}

			rooms.forEach(room => {
				dispatch('fetchUnreadAndLastMessage', { room, ...params })
			})
		},

		fetchUnreadAndLastMessage(
			{ state, commit, dispatch },
			{ room, currentUserId }
		) {
			// 获取最新消息以及未读数
			fetchLastMessage(room.roomId)
				.then(({ messages, count }) => {
					if (state.currentRoom !== room.roomId) {
						room.unreadCount = count
					}

					messages.forEach(message => {
						const index = state.rooms.findIndex(r => r.roomId === room.roomId)
						if (index >= 0) {
							state.rooms[index].lastMessage = formatLastMessage(
								message,
								state.rooms[index],
								currentUserId
							)
						}

						commit('setRooms', [...state.rooms])

						// 修改初始化rooms的状态
						if (state.loadingLastMessageByRoom < state.rooms.length) {
							commit(
								'setLoadingLastMessageByRoom',
								state.loadingLastMessageByRoom + 1
							)

							if (state.loadingLastMessageByRoom === state.rooms.length) {
								commit('setLoadingRooms', false)
								commit('setRoomsLoadedCount', state.rooms.length)
							}
						}
					})
				})
				.catch(e => {
					setTimeout(() => {
						dispatch('fetchUnreadAndLastMessage', { room, currentUserId })
					}, 1000)
				})
		}
	}
})
