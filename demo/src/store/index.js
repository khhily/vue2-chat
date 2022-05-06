import Vue from 'vue'
import Vuex from 'vuex'
import order from './order'

Vue.use(Vuex)

export default new Vuex.Store({
	state: {
		rooms: [],
		loadingRooms: false,
		// loadingLastMessageByRoom: 0,
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
			// state.loadingLastMessageByRoom = 0
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
		// setLoadingLastMessageByRoom(state, count) {
		// 	state.loadingLastMessageByRoom = count
		// },
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
		// loadingLastMessageByRoom: state => state.loadingLastMessageByRoom,
		roomsLoadedCount: state => state.roomsLoadedCount,
		roomsLoaded: state => state.roomsLoaded,
		startRooms: state => state.startRooms,
		endRooms: state => state.endRooms,
		currentRoom: state => state.currentRoom
	},
	actions: {},
	modules: {
		order
	}
})
