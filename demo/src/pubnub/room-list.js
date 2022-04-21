import pubnubService from '@/pubnub'

const subscriptions = {}

export async function resetListeners() {
	Object.values(subscriptions).forEach(sub => sub.unsubscribe())
}

export async function fetchMoreRooms() {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve([
				{
					roomId: 'userId.xxxx',
					avatar: '',
					roomName: 'orderNo',
					lastMessage: {
						ticks: new Date().getTime(),
						seen: [],
						deleted: false,
						new: false,
						distributed: false,
						content: '我爱你',
						senderId: 'userId',
						username: '张三',
						saved: true
					},
					unreadCount: 10,
					users: [
						{
							_id: 'userId',
							status: {
								state: 'online'
							},
							username: '张三'
						},
						{
							_id: 'bbbb',
							status: {
								state: 'online'
							},
							username: '李四'
						}
					]
				},
				{
					roomId: 'userId.xxxx2',
					avatar: '',
					roomName: 'orderNo2',
					lastMessage: {
						ticks: new Date().getTime(),
						seen: [],
						deleted: false,
						new: false,
						distributed: false,
						content: '我爱你',
						senderId: 'userId',
						username: '张三',
						saved: true
					},
					unreadCount: 10,
					users: [
						{
							_id: 'userId',
							status: {
								state: 'online'
							},
							username: '张三'
						},
						{
							_id: 'bbbb',
							status: {
								state: 'online'
							},
							username: '李四'
						}
					]
				}
			])
		}, 1000)
	})
}

export async function fetchLastMessage(roomId) {
	if (!roomId) return
	// try {
	const messages = await pubnubService.fetchHistory(roomId, {
		onlyFetch: true
	})

	return { messages, count: 10 }
}

export function listenRoom(roomId, fn) {
	if (subscriptions[roomId]) {
		subscriptions[roomId].unsubscribe()
	}
	subscriptions[roomId] = pubnubService.listen(roomId).subscribe(messages => {
		messages.forEach(message => {
			try {
				fn(message)
			} catch (e) {
				console.error(e)
				throw e
			}
		})
	})
}

export function listenUnknownChannel(fn) {
	pubnubService.listenUnknownChannel().subscribe(messages => {
		try {
			fn(messages)
		} catch (e) {
			console.error(e)
			throw e
		}
	})
}
