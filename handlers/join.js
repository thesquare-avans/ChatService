const io = require("../lib/socketio").io;
const rooms = require("../lib/socketio").rooms;

module.exports = (socket) => {
	return (data, ack) => {
		if(!data.hasOwnProperty("streamId")) {
			return socket.signAck(ack, socket.errorBody("streamIdMissing"));
		}

		if(!rooms.hasOwnProperty(data.streamId)) {
			return socket.signAck(ack, socket.errorBody("streamIdInvalid"));
		}

		socket.join(data.streamId);

		return socket.signAck(ack, {
			success: true,
			data: rooms[data.streamId]
		});
	};
};