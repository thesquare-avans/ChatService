const rooms = require("../lib/socketio").rooms;

module.exports = (socket) => {
	return (data, ack) => {
		if(!data.parsed.hasOwnProperty("room")) {
			return socket.signAck(ack, socket.errorBody("roomMissing"));
		}

		if(!rooms.hasOwnProperty(data.parsed.room)) {
			return socket.signAck(ack, socket.errorBody("roomInvalid"));
		}

		if(!data.parsed.hasOwnProperty("message") || typeof data.parsed.message != "string") {
			return socket.signAck(ack, socket.errorBody("chatMessageInvalid"));	
		}

		if(Object.keys(socket.rooms).indexOf(data.parsed.room) == -1) {
			return socket.signAck(ack, socket.errorBody("notInRoom"));
		}

		socket.to(data.parsed.room).emit("message", socket.signBody({
			sender: socket.user.id,
			room: data.parsed.room,
			data: data.original
		}));
	};
};