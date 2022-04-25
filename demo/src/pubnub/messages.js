import axios from 'axios'
import { formatMessage, formattedFiles } from '../utils/message'
import { pubnubService } from './index'
import { getRoom } from './rooms'
import { v4 } from 'uuid'

export function listenMessage(roomId) {
	return pubnubService()?.listen(roomId)
}

export function createMessage(content, currentUserId, replyMessage, files) {
	const message = {
		sender_id: currentUserId,
		content,
		ticks: new Date().getTime(),
		seen: { [currentUserId]: true },
		_id: v4()
	}

	if (files) {
		message.files = formattedFiles(files)
	}

	if (replyMessage) {
		message.replyMessage = {
			_id: replyMessage._id,
			content: replyMessage.content,
			sender_id: replyMessage.senderId
		}

		if (replyMessage.files) {
			message.replyMessage.files = replyMessage.files
		}
	}

	return message
}

export async function publish(roomIds, message, currentUserId) {
	// 先找出当前用户的room,
	const selfRoomId = roomIds.find(roomId =>
		roomId.startsWith(currentUserId + '.')
	)

	const room = getRoom(selfRoomId)

	// 发送者信息(这里一定是当前用户)
	const sendUser = room.users.find(user => user._id === currentUserId)

	// 生成消息
	const mainMessage = formatMessage(message, currentUserId, sendUser)

	// 上传文件
	handleMessage(mainMessage).then(async () => {
		// 先保存数据，再发送消息，最后更新timetoken到后端
		const msgList = roomIds.map(roomId => {
			return {
				...mainMessage,
				_id: roomId === selfRoomId ? mainMessage._id : v4(),
				roomId
			}
		})

		await saveMessages(msgList)

		// 发消息
		const resList = await Promise.all([
			...msgList.map(msg =>
				pubnubService()?.publish({
					message: message,
					channel: msg.roomId
				})
			)
		])

		msgList.forEach((e, i) => {
			e.timetoken = resList[i].timetoken
		})

		mainMessage.timetoken = msgList.find(
			m => (m._id = mainMessage._id)
		).timetoken

		updateTimetoken(msgList.map(e => ({ _id: e._id, timetoken: e.timetoken })))
	})

	return mainMessage
}

export const markMessagesSeen = (message, currentUserId) => {
	if (!message.seen || !message.seen[currentUserId]) {
		message.seen = message.seen || {}
		message.seen[currentUserId] = true

		updateMessageSeen(message)
	}
}

export async function fetchHistory(
	roomId,
	currentUserId,
	params,
	existPredicate
) {
	const start = params?.start || Date.now() * 10000
	const count = params?.count || 25

	const res = await axios.post('/api/messages/fetchMessages', {
		roomId,
		options: {
			start,
			count
		}
	})

	const messages = res.data

	const result = []

	if (!messages || !messages.length) return result

	const newMsgMap = {}

	messages.forEach(msg => {
		if (!existPredicate(msg._id) && !newMsgMap[msg._id]) {
			markMessagesSeen(msg, currentUserId)
			newMsgMap[msg._id] = true
			result.push(msg)
		}
	})
	return result
}

const saveMessages = async function (messages) {
	console.log(messages)
	return await axios.post('/api/messages/create', messages)
	// return axios.post('/api/messages/create', messages)
}

const updateTimetoken = async function (messages) {
	return await axios.post('/api/messages/updateTimetoken', messages)
}

const handleMessage = async function (m) {
	if (!m.files) return

	for (const f of m.files) {
		uploadFile(f, p => {})
	}
}

const uploadFile = async function (file, onProgress) {}

export async function insertMessage(roomId, message) {
	await axios.post('/api/messages/create', {
		roomId,
		message
	})
}

const updateMessageSeen = async function (message) {
	await axios.post('/api/messages/updateSeen', {
		id: message._id,
		seen: {
			...(message.seen || {})
		}
	})
}
