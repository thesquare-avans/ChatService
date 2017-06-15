const discovery = require("./lib/discovery");
const io = require("./lib/socketio");
const config = require("config");

discovery.on("status", (data, ack) => {
	discovery.signAck(ack, {
		success: true,
		data: {
			status: "green",
			rooms: 0,
			chatters: 0
		}
	});
});

discovery.on("start", (data, ack) => {
	if(io.rooms.hasOwnProperty(data.streamId)) {
		return discovery.signAck(ack, {
			success: false,
			error: {
				code: "roomAlreadyExists"
			}
		});
	}

	io.rooms[data.streamId] = {
		streamer: data.streamer
	};

	console.log("started room "+data.streamId);

	discovery.signAck(ack, {
		success: true,
		data: {
			hostname: config.get("hostname"),
			id: config.get("serverId")
		}
	});
});