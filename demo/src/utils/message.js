import { parseTimestamp, formatTimestamp } from './dates'

export function formatMessage(room, message, currentUserId) {
	const inner = message.message
	const formattedMessage = {
		...inner,
		id: message.timetoken,
		...{
			senderId: inner.sender_id,
			_id: message.timetoken,
			timestamp: parseTimestamp(
				inner.ticks || inner.timestamp / 10000,
				'HH:mm'
			),
			date: parseTimestamp(
				inner.ticks || inner.timestamp / 10000,
				'DD MMMM YYYY'
			),
			username: room.users.find(user => inner.sender_id === user._id)?.username,
			// avatar: senderUser ? senderUser.avatar : null,
			distributed: true,
			new:
				inner.sender_id !== currentUserId &&
				(!inner.seen || !inner.seen[currentUserId]),
			seen: inner.sender_id === currentUserId ? inner.seen : {}
		}
	}

	if (inner.replyMessage) {
		formattedMessage.replyMessage = {
			...inner.replyMessage,
			...{
				senderId: inner.replyMessage.sender_id
			}
		}
	}

	return formattedMessage
}

export function formatLastMessage(message, room, currentUserId) {
	const inner = message.message

	if (!inner.ticks) return

	let content = inner.content
	if (inner.files?.length) {
		const file = inner.files[0]
		content = `${file.name}.${file.extension || file.type}`
	}

	const username =
		inner.sender_id !== currentUserId
			? room.users.find(user => inner.sender_id === user._id)?.username
			: ''

	return {
		...inner,
		id: message.timetoken,
		...{
			content,
			_id: message.timetoken,
			timestamp: formatTimestamp(new Date(inner.ticks), inner.ticks),
			username: username,
			distributed: true,
			seen: inner.sender_id === currentUserId ? inner.seen : null,
			new:
				inner.sender_id !== currentUserId &&
				(!inner.seen || !inner.seen[currentUserId])
		}
	}
}
