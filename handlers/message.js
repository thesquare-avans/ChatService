const rooms = require("../lib/socketio").rooms;

module.exports = (socket) => {
	return (data, ack) => {
		if(!data.parsed.hasOwnProperty("streamId")) {
			return socket.signAck(ack, socket.errorBody("streamIdMissing"));
		}

		if(!rooms.hasOwnProperty(data.parsed.streamId)) {
			return socket.signAck(ack, socket.errorBody("streamIdInvalid"));
		}

		if(!data.parsed.hasOwnProperty("message") || typeof data.parsed.message != "string") {
			return socket.signAck(ack, socket.errorBody("messageInvalid"));	
		}

		if(Object.keys(socket.rooms).indexOf(data.parsed.streamId) == -1) {
			return socket.signAck(ack, socket.errorBody("notInRoom"));
		}

		socket.to(data.parsed.streamId).emit("message", socket.signBody({
			sender: socket.user.id,
			room: data.parsed.streamId,
			data: data.original
		}));
	};
};