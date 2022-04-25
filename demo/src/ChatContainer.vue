<template>
	<div class="window-container" :class="{ 'window-mobile': isDevice }">
		<!-- <form v-if="addNewRoom" @submit.prevent="createRoom">
			<input v-model="addRoomUsername" type="text" placeholder="Add username" />
			<button type="submit" :disabled="disableForm || !addRoomUsername">
				Create Room
			</button>
			<button class="button-cancel" @click="addNewRoom = false">Cancel</button>
		</form> -->

		<!-- <form v-if="inviteRoomId" @submit.prevent="addRoomUser">
			<input v-model="invitedUsername" type="text" placeholder="Add username" />
			<button type="submit" :disabled="disableForm || !invitedUsername">
				Add User
			</button>
			<button class="button-cancel" @click="inviteRoomId = null">Cancel</button>
		</form> -->

		<!-- <form v-if="removeRoomId" @submit.prevent="deleteRoomUser">
			<select v-model="removeUserId">
				<option default value="">Select User</option>
				<option v-for="user in removeUsers" :key="user._id" :value="user._id">
					{{ user.username }}
				</option>
			</select>
			<button type="submit" :disabled="disableForm || !removeUserId">
				Remove User
			</button>
			<button class="button-cancel" @click="removeRoomId = null">Cancel</button>
		</form> -->

		<chat-window
			:height="screenHeight"
			:theme="theme"
			:single-room="true"
			:styles="styles"
			:current-user-id="currentUserId"
			:room-id="roomId"
			:rooms="loadedRooms"
			:loading-rooms="loadingRooms"
			:messages="messages"
			:messages-loaded="messagesLoaded"
			:rooms-loaded="roomsLoaded"
			:room-actions="roomActions"
			:menu-actions="menuActions"
			:message-selection-actions="messageSelectionActions"
			:room-message="roomMessage"
			:templates-text="templatesText"
			:show-send-icon="true"
			:show-footer="true"
			:show-reaction-emojis="false"
			:message-actions="messageActions"
			@fetch-messages="fetchMessages"
			@send-message="sendMessage"
			@open-file="openFile"
		>
		</chat-window>
	</div>
</template>

<script>
// import * as firestoreService from '@/database/firestore'
// import * as firebaseService from '@/database/firebase'
// import * as storageService from '@/database/storage'
import { mapGetters } from 'vuex'
import { formatMessage } from '@/utils/message'

import ChatWindow from './../../src/lib/ChatWindow'
import { getRoom } from './pubnub/rooms'
import {
	createMessage,
	fetchHistory,
	listenMessage,
	markMessagesSeen,
	publish
} from './pubnub/messages'
// import ChatWindow, { Rooms } from 'vue-advanced-chat'
// import ChatWindow from 'vue-advanced-chat'
// import 'vue-advanced-chat/dist/vue-advanced-chat.css'
// import ChatWindow from './../../dist/vue-advanced-chat.umd.min.js'

export default {
	components: {
		ChatWindow
	},

	props: {
		currentUserId: { type: String, required: true },
		orderNo: { type: String, required: true },
		theme: { type: String, required: true },
		isDevice: { type: Boolean, required: true }
	},

	emits: ['show-demo-options'],

	data() {
		return {
			roomsPerPage: 15,
			// roomId: '',
			allUsers: [],
			selectedRoom: null,
			messagesPerPage: 20,
			messages: [],
			messagesLoaded: false,
			roomMessage: '',
			lastLoadedMessage: null,
			previousLastLoadedMessage: null,
			// roomsListeners: [],
			// listeners: [],
			typingMessageCache: '',
			disableForm: false,
			addNewRoom: null,
			addRoomUsername: '',
			inviteRoomId: null,
			invitedUsername: '',
			removeRoomId: null,
			removeUserId: '',
			removeUsers: [],
			roomActions: [
				// { name: 'inviteUser', title: 'Invite User' },
				// { name: 'removeUser', title: 'Remove User' },
				// { name: 'deleteRoom', title: 'Delete Room' }
			],
			menuActions: [
				// { name: 'inviteUser', title: 'Invite User' },
				// { name: 'removeUser', title: 'Remove User' },
				// { name: 'deleteRoom', title: 'Delete Room' }
			],
			messageActions: [{ name: 'replyMessage', title: 'Reply' }],
			messageSelectionActions: [
				// { name: 'deleteMessages', title: 'Delete' }
			],
			styles: { container: { borderRadius: '4px' } },
			templatesText: [
				{
					tag: 'help',
					text: 'This is the help'
				},
				{
					tag: 'action',
					text: 'This is the action'
				},
				{
					tag: 'action 2',
					text: 'This is the second action'
				}
			],
			msgSub: null
			// ,dbRequestCount: 0
		}
	},

	computed: {
		...mapGetters([
			'rooms',
			'loadingRooms',
			'roomsLoadedCount',
			'roomsLoaded',
			'startRooms',
			'endRooms'
		]),
		loadedRooms() {
			return this.rooms.slice(0, this.roomsLoadedCount)
		},
		screenHeight() {
			return this.isDevice ? window.innerHeight + 'px' : 'calc(100vh - 80px)'
		},
		roomId() {
			if (!this.currentUserId || !this.orderNo) return ''
			return `${this.currentUserId}.${this.orderNo}`
		}
	},

	mounted() {
		this.addMessageListen()
	},

	beforeUnmount() {
		this.resetMessages()
	},

	methods: {
		addMessageListen() {
			if (!this.roomId) return
			console.log('add message listen')
			this.msgSub?.unsubscribe()
			console.log('listen ', this.roomId)
			this.msgSub = listenMessage(this.roomId).subscribe(messages => {
				const room = getRoom(this.roomId)
				if (!room) return

				messages.forEach(message => {
					const sender = room.users.find(user => user._id === message.sender_id)
					const formatted = formatMessage(
						message.message,
						this.currentUserId,
						sender
					)

					formatted.seen[this.currentUserId] = true
					this.messages.push(formatted)

					markMessagesSeen(formatted, this.currentUserId)
				})
			})
		},
		resetMessages() {
			this.messages = []
			this.messagesLoaded = false
			this.lastLoadedMessage = null
			this.previousLastLoadedMessage = null
			this.msgSub?.unsubscribe()
		},

		resetForms() {
			this.disableForm = false
			this.addNewRoom = null
			this.addRoomUsername = ''
			this.inviteRoomId = null
			this.invitedUsername = ''
			this.removeRoomId = null
			this.removeUserId = ''
		},

		fetchMessages({ room, options = {} }) {
			if (options.reset) {
				this.resetMessages()
			}

			if (this.previousLastLoadedMessage && !this.lastLoadedMessage) {
				this.messagesLoaded = true
				this.messages = [...this.messages]
				return
			}

			const params = {
				onlyFetch: true,
				start:
					this.lastLoadedMessage?.timetoken ||
					(this.lastLoadedMessage?.ticks
						? this.lastLoadedMessage?.ticks * 10000
						: undefined)
			}

			const msgMap = this.messages.reduce((a, b) => {
				a[b._id] = b
				return a
			}, {})

			fetchHistory(
				room.roomId,
				this.currentUserId,
				params,
				id => !!msgMap[id]
			).then(messages => {
				if (!messages.length) {
					this.messagesLoaded = true
					// this.messages = [...this.messages]
					return
				}

				this.previousLastLoadedMessage = this.lastLoadedMessage
				this.lastLoadedMessage = messages[0]

				if (messages.length) {
					this.messages = [...this.messages, ...messages]
				}

				if (!messages.length) {
					this.messagesLoaded = true
				}
			})
		},

		async sendMessage({ content, roomId, files, replyMessage }) {
			const message = createMessage(
				content,
				this.currentUserId,
				replyMessage,
				files
			)

			const r = getRoom(roomId)

			const roomIds = r.users.map(user => `${user._id}.${this.orderNo}`)

			const formatted = publish(roomIds, message, this.currentUserId)

			this.messages.push(formatted)
		},

		async uploadFile({ file, messageId, roomId }) {
			return new Promise(resolve => {
				let type = file.extension || file.type
				if (type === 'svg' || type === 'pdf') {
					type = file.type
				}

				// storageService.listenUploadImageProgress(
				// 	this.currentUserId,
				// 	messageId,
				// 	file,
				// 	type,
				// 	progress => {
				// 		this.updateFileProgress(messageId, file.localUrl, progress)
				// 	},
				// 	_error => {
				// 		resolve(false)
				// 	},
				// 	async url => {
				// 		const message = await firestoreService.getMessage(roomId, messageId)

				// 		message.files.forEach(f => {
				// 			if (f.url === file.localUrl) {
				// 				f.url = url
				// 			}
				// 		})

				// 		await firestoreService.updateMessage(roomId, messageId, {
				// 			files: message.files
				// 		})
				// 		resolve(true)
				// 	}
				// )
			})
		},

		updateFileProgress(messageId, fileUrl, progress) {
			const message = this.messages.find(message => message._id === messageId)

			if (!message || !message.files) return

			message.files.find(file => file.url === fileUrl).progress = progress
			this.messages = [...this.messages]
		},

		openFile({ file }) {
			window.open(file.file.url, '_blank')
		}
	}
}
</script>

<style lang="scss" scoped>
.window-container {
	width: 100%;
}

.window-mobile {
	form {
		padding: 0 10px 10px;
	}
}

form {
	padding-bottom: 20px;
}

input {
	padding: 5px;
	width: 140px;
	height: 21px;
	border-radius: 4px;
	border: 1px solid #d2d6da;
	outline: none;
	font-size: 14px;
	vertical-align: middle;

	&::placeholder {
		color: #9ca6af;
	}
}

button {
	background: #1976d2;
	color: #fff;
	outline: none;
	cursor: pointer;
	border-radius: 4px;
	padding: 8px 12px;
	margin-left: 10px;
	border: none;
	font-size: 14px;
	transition: 0.3s;
	vertical-align: middle;

	&:hover {
		opacity: 0.8;
	}

	&:active {
		opacity: 0.6;
	}

	&:disabled {
		cursor: initial;
		background: #c6c9cc;
		opacity: 0.6;
	}
}

.button-cancel {
	color: #a8aeb3;
	background: none;
	margin-left: 5px;
}

select {
	vertical-align: middle;
	height: 33px;
	width: 152px;
	font-size: 13px;
	margin: 0 !important;
}
</style>
