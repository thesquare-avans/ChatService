const io = require("../lib/socketio").io;
const rooms = require("../lib/socketio").rooms;

module.exports = (socket) => {
	return (data, ack) => {
		if(!data.hasOwnProperty("room")) {
			return socket.signAck(ack, socket.errorBody("roomMissing"));
		}

		if(!rooms.hasOwnProperty(data.room)) {
			return socket.signAck(ack, socket.errorBody("roomInvalid"));
		}

		socket.join(data.room);

		return socket.signAck(ack, {
			success: true,
			room: rooms[data.room]
		});
	};
};