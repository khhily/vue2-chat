import { pubnubService, createPubnub } from '@/pubnub'
import axios from 'axios'
import store from '../store'

const subscriptions = {}
let loadingLastMessageByRoom = 0

const fetchOrderInfo = async function (roomId) {
	const array = roomId.split('.')
	const orderNo = array[1]

	// const res = await axios.get(`/api/getOrderNo/${orderNo}`)
	return {
		roomId,
		_id: roomId,
		avatar: '',
		roomName: orderNo,
		unreadCount: 0,
		users: [
			{
				_id: '132',
				status: {
					state: 'online'
				},
				username: '张三'
			},
			{
				_id: '456',
				status: {
					state: 'online'
				},
				username: '李四'
			}
		]
	}
}

const defaultOptions = {
	roomsGetter: () => store.getters.rooms,
	currentRoomGetter: () => store.getters.currentRoom,
	onRoomsChange: rooms => store.commit('setRooms', rooms),
	onRoomsLoadingComplete: () => {
		store.commit('setLoadingRooms', false)
		store.commit('setRoomsLoadedCount', store.getters.rooms.length)
	},
	onRoomsLoaded: () => {
		store.commit('setRoomsLoaded', true)
	},
	onRoomCreate: room => {
		store.commit('addRoom', room)
	},
	onRoomsReset: () => {
		store.commit('resetRooms')
	},
	onRoomCreateFetch: async roomId => {
		return await fetchOrderInfo(roomId)
	}
}

let options = {}

const roomInit = () => {
	if (loadingLastMessageByRoom < options.roomsGetter?.().length) {
		loadingLastMessageByRoom++

		if (loadingLastMessageByRoom === options.roomsGetter?.().length) {
			options.onRoomsLoadingComplete?.()
		}
	}
}

const addRoomToDB = async room => {
	await axios.post('/api/rooms/insert', room)
}

// const listenRoom = roomId => {
// 	if (subscriptions[roomId]) {
// 		subscriptions[roomId].unsubscribe()
// 	}
// 	subscriptions[roomId] = pubnubService()
// 		?.listen(roomId)
// 		?.subscribe(messages => {
// 			messages.forEach(m => {
// 				try {
// 					// m.channel
// 					// m.publisher
// 					// m.timetoken
// 					const room = getRoom(m.channel)
// 					if (room && room.roomId != options.currentRoomGetter?.()) {
// 						room.unreadCount = room.unreadCount || 0
// 						room.unreadCount++

// 						// store.commit('setRooms', [..._.state.rooms])
// 					}
// 				} catch (e) {
// 					console.error(e)
// 					throw e
// 				}
// 			})
// 		})
// }

const createRoom = async roomId => {
	const array = roomId.split('.')
	const currentUserId = array[0]
	const orderNo = array[1]

	// 根据orderNo获取用户及订单信息
	const newRoom = options?.onRoomCreateFetch?.(roomId)

	// return newRoom

	const room = {
		roomId: roomId,
		avatar: '',
		roomName: orderNo,
		unreadCount: 0,
		users: [
			{
				_id: '1234',
				status: {
					state: 'online'
				},
				username: '张三'
			},
			{
				_id: currentUserId,
				status: {
					state: 'online'
				},
				username: '李四'
			}
		]
	}

	return room
}

const listenUnknownChannel = () => {
	subscriptions['unknown']?.unsubscribe()
	subscriptions['unknown'] = pubnubService()
		?.listenUnknownChannel()
		?.subscribe(messages => {
			try {
				if (messages && messages.length) {
					console.log('unknown channel')
					messages.forEach(async message => {
						// 找出消息的room
						let room = getRoom(message.channel)
						if (room) {
							if (options?.currentRoomGetter?.() !== room.roomId) {
								room.unreadCount = room.unreadCount || 0
								room.unreadCount++
							}

							room.lastMessage = formatMessage(
								message.message,
								currentUserId,
								sender
							)
						} else {
							// 新增room
							room = await createRoom(message.channel, message.publisher)

							const inRooms = getRoom(message.channel)

							if (inRooms) {
								room = inRooms
							}

							room.unreadCount++

							const sender = room.users.find(
								user => user._id === message.publisher
							)

							room.lastMessage = formatMessage(
								message.message,
								currentUserId,
								sender
							)
							// 将创建的聊天室加入列表
							options.onRoomCreate?.(room)

							if (!inRooms) {
								addRoomToDB(room)
							}
						}
					})
				}
			} catch (e) {
				console.error(e)
				throw e
			}
		})
}

const initData = async currentUserId => {
	try {
		resetRooms()

		const rooms = await fetchMoreRooms(currentUserId)

		if (!rooms || !rooms.length) {
			options.onRoomsLoadingComplete?.()
			return
		}

		rooms.forEach(room => {
			roomInit(room, currentUserId)
		})

		options.onRoomsLoaded?.()

		// // 添加监听
		// resetListeners()

		// // 监听已知的room
		// rooms.forEach(room => {
		// 	listenRoom(room.roomId)
		// })

		// 监听所有的消息
		listenUnknownChannel()
	} catch (e) {
		console.error(e)
		return new Promise((resolve, reject) => {
			setTimeout(async () => {
				initData(currentUserId).then(resolve, reject)
			}, 3000)
		})
	}
}

const resetRooms = () => {
	loadingLastMessageByRoom = 0
	options.onRoomsReset?.()
}

export const initPubnub = async (userId, option) => {
	if (option) {
		options = Object.assign({}, defaultOptions, option)
	}
	createPubnub()
	await pubnubService()?.init(userId)
	await initData(userId)
}

export const cancelPubnub = async () => {
	options = {}
}

export const getRoom = roomId => {
	return options.roomsGetter?.().find(r => r.roomId === roomId)
}

export async function resetListeners() {
	Object.values(subscriptions)
		.filter(e => !!e)
		.forEach(sub => sub.unsubscribe())
}

export function clearUnreadCount(roomId) {
	const room = getRoom(roomId)
	if (room) {
		room.unreadCount = 0
	}
}

export async function fetchMoreRooms(userId) {
	// 因为觉得加载所有channel不太合适。因为无法估量会有多少channel，数量级太大也不合适
	// 所以采用另外一种方案，
	// 每个order都有两个channel，一个收一个发。收的是自己的userId.orderNo的channel
	// 向对方的userId.orderNo发送消息，所有消息都要在两个channel中同时存在
	// 这样只要监听`userId.*`就可以监听到所有订单中给自己发的消息，而不需要知道所有的orderNo
	// 同时，初始化时也只要知道自己的所有存在未读消息的channel就可以了。大大减少了对room的依赖

	// 获取所有有新消息的通道
	const unreadCounts =
		(await axios.post('/api/messages/fetchUnread', {
			userId
		})?.data) || {}

	const roomIds = Object.keys(unreadCounts)

	if (!roomIds.length) return []

	const roomsAndMessages =
		(await axios.post('/api/messages/batchFetchRoomAndLastMessages', roomIds))
			?.data || {}

	const rooms = []

	roomIds.forEach(roomId => {
		const room = roomsAndMessages[roomId]?.room
		const lastMessage = roomsAndMessages[roomId]?.lastMessage
		const count = unreadCounts[roomId]
		if (room) {
			room.lastMessage = lastMessage
			room.unreadCount = count
			rooms.push(room)
		} else {
			// 根据roomId去获取

			createRoom(roomId).then(newRoom => {
				newRoom.lastMessage = lastMessage
				newRoom.unreadCount = count
				options.onRoomCreate(newRoom)
				roomInit(newRoom, currentUserId)

				addRoomToDB(newRoom)
			})
		}
	})

	options.onRoomsChange?.(rooms)
	return rooms
	// const rooms = await new Promise((resolve, reject) => {
	// 	setTimeout(() => {
	// 		resolve([
	// 			{
	// 				roomId: 'userId.xxxx',
	// 				avatar: '',
	// 				roomName: 'orderNo',
	// 				lastMessage: {
	// 					ticks: new Date().getTime(),
	// 					seen: [],
	// 					deleted: false,
	// 					new: false,
	// 					distributed: false,
	// 					content: '我爱你',
	// 					senderId: 'userId',
	// 					username: '张三',
	// 					saved: true
	// 				},
	// 				unreadCount: 10,
	// 				users: [
	// 					{
	// 						_id: 'userId',
	// 						status: {
	// 							state: 'online'
	// 						},
	// 						username: '张三'
	// 					},
	// 					{
	// 						_id: 'bbbb',
	// 						status: {
	// 							state: 'online'
	// 						},
	// 						username: '李四'
	// 					}
	// 				]
	// 			},
	// 			{
	// 				roomId: 'userId.xxxx2',
	// 				avatar: '',
	// 				roomName: 'orderNo2',
	// 				lastMessage: {
	// 					ticks: new Date().getTime(),
	// 					seen: [],
	// 					deleted: false,
	// 					new: false,
	// 					distributed: false,
	// 					content: '我爱你',
	// 					senderId: 'userId',
	// 					username: '张三',
	// 					saved: true
	// 				},
	// 				unreadCount: 10,
	// 				users: [
	// 					{
	// 						_id: 'userId',
	// 						status: {
	// 							state: 'online'
	// 						},
	// 						username: '张三'
	// 					},
	// 					{
	// 						_id: 'bbbb',
	// 						status: {
	// 							state: 'online'
	// 						},
	// 						username: '李四'
	// 					}
	// 				]
	// 			}
	// 		])
	// 	}, 1000)
	// })
	// options.onRoomsChange(rooms)
	// return rooms
}

export async function fetchLastMessage(roomId, currentUserId) {
	if (!roomId) return
	const rooms = await Promise.all([fetchUnread(roomId, currentUserId)])
	return rooms
}

export async function getAvatar(id) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve('')
		}, 500)
	})
}

export async function updateAvatar(room) {
	await axios.post('/api/rooms/updateAvatar', {
		roomId: room.roomId,
		avatar: room.avatar
	})
}

export async function updateUserAvatar(room, userId, avatar) {
	await axios.post('/api/rooms/updateUserAvatar', {
		roomId: room.roomId,
		userId,
		avatar
	})
}

export async function fetchMessages(roomId, options) {
	const res = await axios.post('/api/messages/fetchMessages', {
		roomId,
		options
	})
	return res.data
}

export async function fetchUnread(roomId, userId) {
	const res = await axios.post('/api/messages/fetchUnread', {
		roomId,
		userId
	})
	return res.data
}
