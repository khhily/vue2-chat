import { parseTimestamp, formatTimestamp } from './dates'

export function formatMessage(inner, currentUserId, sender) {
	const formattedMessage = {
		...inner,
		...{
			senderId: inner.sender_id,
			timestamp: parseTimestamp(
				inner.ticks || inner.timestamp / 10000,
				'HH:mm'
			),
			date: parseTimestamp(
				inner.ticks || inner.timestamp / 10000,
				'DD MMMM YYYY'
			),
			username: room.users.find(user => inner.sender_id === user._id)?.username,
			avatar: sender ? sender.avatar : inner.avatar,
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

// export function formatLastMessage(message, room, currentUserId) {
// 	const inner = message.message

// 	if (!inner.ticks) return

// 	let content = inner.content
// 	if (inner.files?.length) {
// 		const file = inner.files[0]
// 		content = `${file.name}.${file.extension || file.type}`
// 	}

// 	const username =
// 		inner.sender_id !== currentUserId
// 			? room.users.find(user => inner.sender_id === user._id)?.username
// 			: ''

// 	const id = `${inner.ticks}.${inner.sender_id}`

// 	return {
// 		...inner,
// 		id,
// 		...{
// 			content,
// 			_id: id,
// 			timestamp: formatTimestamp(new Date(inner.ticks), inner.ticks),
// 			username: username,
// 			distributed: true,
// 			seen: inner.sender_id === currentUserId ? inner.seen : null,
// 			new:
// 				inner.sender_id !== currentUserId &&
// 				(!inner.seen || !inner.seen[currentUserId])
// 		}
// 	}
// }

export function formattedFiles(files) {
	const formattedFiles = []

	// files.forEach(file => {
	// 	const messageFile = {
	// 		name: file.name,
	// 		size: file.size,
	// 		type: file.type,
	// 		extension: file.extension || file.type,
	// 		url: file.url || file.localUrl
	// 	}

	// 	if (file.audio) {
	// 		messageFile.audio = true
	// 		messageFile.duration = file.duration
	// 	}

	// 	formattedFiles.push(messageFile)
	// })

	return formattedFiles
}
