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
import { formatTimestamp } from '@/utils/dates'
import { formatMessage } from '@/utils/message'
import pubnubService from './pubnub/index'
import { listenRoom } from './pubnub/room-list'

import ChatWindow from './../../src/lib/ChatWindow'
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
			messageSubscription: null
			// ,dbRequestCount: 0
		}
	},

	computed: {
		...mapGetters([
			'rooms',
			'loadingRooms',
			'loadingLastMessageByRoom',
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
			return `${this.currentUserId}.${this.orderNo}`
		}
	},

	mounted() {
		// this.roomId = `${this.currentUserId}.${this.orderNo}`
		this.messageSubscription = pubnubService
			.listen(this.roomId)
			.subscribe(messages => {
				this.$store.dispatch('getRoom', this.roomId).then(room => {
					if (room) {
						messages.forEach(message => {
							this.messages.push(
								formatMessage(room, message, this.currentUserId)
							)
						})
					}
				})
			})
	},

	beforeUnmount() {
		this.resetMessages()
		this.messageSubscription?.unsubscribe()
		// this.resetListen()
	},

	methods: {
		resetMessages() {
			this.messages = []
			this.messagesLoaded = false
			this.lastLoadedMessage = null
			this.previousLastLoadedMessage = null
			// this.listeners.forEach(listener => listener())
			// this.listeners = []
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
				// this.roomId = room.roomId
			}

			if (this.previousLastLoadedMessage && !this.lastLoadedMessage) {
				this.messagesLoaded = true
				this.messages = [...this.messages]
				return
			}

			const params = {
				onlyFetch: true
			}
			if (this.lastLoadedMessage) {
				params.start = this.lastLoadedMessage.id
			}

			pubnubService.fetchHistory(room.roomId, params).then(messages => {
				const msgList = []
				if (messages) {
					console.log('fetched', room.roomId, messages.length)
					if (!messages.length) {
						console.log('no messages')
						this.messagesLoaded = true
						this.messages = [...this.messages]
						return
					}

					messages.forEach(msg => {
						if (this.messages.findIndex(m => m.id == msg.timetoken) < 0) {
							const formatted = formatMessage(room, msg, this.currentUserId)
							msgList.push(formatted)

							this.markMessagesSeen(room, formatted)
						}
					})

					this.previousLastLoadedMessage = this.lastLoadedMessage
					this.lastLoadedMessage = msgList[0]

					console.log('fetch end', room.roomId, msgList.length)
				}

				console.log('reset messages', room.roomId, this.messages.length)
				this.messages = [...this.messages, ...msgList]
				console.log('reset messages', room.roomId, this.messages.length)

				if (msgList.length == 0) {
					this.messagesLoaded = true
				}
			})
		},

		markMessagesSeen(room, message) {
			if (
				message.sender_id !== this.currentUserId &&
				(!message.seen || !message.seen[this.currentUserId])
			) {
				message.seen = message.seen || {}
				message.seen[this.currentUserId] = new Date()
				// TODO:提交保存
			}
		},

		async sendMessage({ content, roomId, files, replyMessage }) {
			const message = {
				sender_id: this.currentUserId,
				content,
				ticks: new Date().getTime()
			}

			// if (files) {
			// 	message.files = this.formattedFiles(files)
			// }

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

			const requests = [pubnubService.publish(roomId, message)]

			const r = await this.$store.dispatch('getRoom', roomId)

			if (r && r.users) {
				requests.push(
					...r.users
						.filter(user => user._id !== this.currentUserId)
						.map(user => {
							return pubnubService.publish(
								`${user._id}.${this.orderNo}`,
								message
							)
						})
				)
			}

			const results = await Promise.all(requests)

			message.seen = { [this.currentUserId]: new Date() }

			// 保存记录

			const room = this.rooms.find(room => room.roomId === roomId)
			if (room) {
				this.messages.push(
					formatMessage(room, { message, ...results[0] }, this.currentUserId)
				)
			}

			if (files) {
				for (let index = 0; index < files.length; index++) {
					await this.uploadFile({ file: files[index], messageId: id, roomId })
				}
			}

			// firestoreService.updateRoom(roomId, { lastUpdated: new Date() })
		},

		async uploadFile({ file, messageId, roomId }) {
			return new Promise(resolve => {
				let type = file.extension || file.type
				if (type === 'svg' || type === 'pdf') {
					type = file.type
				}

				storageService.listenUploadImageProgress(
					this.currentUserId,
					messageId,
					file,
					type,
					progress => {
						this.updateFileProgress(messageId, file.localUrl, progress)
					},
					_error => {
						resolve(false)
					},
					async url => {
						const message = await firestoreService.getMessage(roomId, messageId)

						message.files.forEach(f => {
							if (f.url === file.localUrl) {
								f.url = url
							}
						})

						await firestoreService.updateMessage(roomId, messageId, {
							files: message.files
						})
						resolve(true)
					}
				)
			})
		},

		updateFileProgress(messageId, fileUrl, progress) {
			const message = this.messages.find(message => message._id === messageId)

			if (!message || !message.files) return

			message.files.find(file => file.url === fileUrl).progress = progress
			this.messages = [...this.messages]
		},

		formattedFiles(files) {
			const formattedFiles = []

			files.forEach(file => {
				const messageFile = {
					name: file.name,
					size: file.size,
					type: file.type,
					extension: file.extension || file.type,
					url: file.url || file.localUrl
				}

				if (file.audio) {
					messageFile.audio = true
					messageFile.duration = file.duration
				}

				formattedFiles.push(messageFile)
			})

			return formattedFiles
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
