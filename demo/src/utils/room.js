export async function createRoom(roomId, publisher) {
	const array = roomId.split('.')
	const currentUserId = array[0]
	const orderNo = array[1]

	// 根据orderNo获取用户

	const room = {
		roomId: roomId,
		avatar: '',
		roomName: orderNo,
		unreadCount: 0,
		users: [
			{
				_id: publisher,
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
