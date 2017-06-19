const discovery = require("./lib/discovery");
const io = require("./lib/socketio");
const config = require("config");
const fs = require("es6-fs");
const debug = require("debug")("chatservice");

fs.access("state.json", fs.constants.R_OK)
.then(() => {
	return fs.readFile("state.json")
	.then((content) => {
		var state = JSON.parse(content);
		io.rooms = state.rooms;

		debug("amount rooms: %d", Object.keys(io.rooms).length);

		fs.unlinkSync("state.json");
		console.log("[LoadState] Loaded");
	});
})
.catch((err) => {
	if(err.code != "ENOENT") {
		console.error("[LoadState]", err);
	}
});

var statusDebug = require("debug")("discovery_status");
discovery.on("status", (data, ack) => {
	statusDebug("received status request");
	var numRooms = Object.keys(io.rooms).length;
	var numClients = 0;

	if(io.io.sockets && io.io.sockets.connected) {
		numClients = Object.keys(io.io.sockets.connected).filter((socketId) => {
			return io.io.sockets.connected[socketId].hasOwnProperty("user");
		}).length;
	}

	discovery.signAck(ack, {
		success: true,
		data: {
			status: "green",
			rooms: numRooms,
			chatters: numClients
		}
	});
});

var startDebug = require("debug")("discovery_start");
discovery.on("start", (data, ack) => {
	startDebug("received start request");
	if(io.rooms.hasOwnProperty(data.streamId)) {
		startDebug("room already exists");
		return discovery.signAck(ack, {
			success: false,
			error: {
				code: "roomAlreadyExists"
			}
		});
	}

	startDebug("started room %s", data.streamId);
	io.rooms[data.streamId] = {
		title: data.title,
		streamer: data.streamer
	};

	discovery.signAck(ack, {
		success: true,
		data: {
			hostname: config.get("hostname"),
			id: config.get("serverId")
		}
	});
});

var stopDebug = require("debug")("discovery_stop");
discovery.on("stop", (data, ack) => {
	stopDebug("received stop request");
	if(!io.rooms.hasOwnProperty(data.streamId)) {
		stopDebug("room doesn't exists");
		return discovery.signAck(ack, {
			success: false,
			error: {
				code: "roomNotFound"
			}
		});
	}

	io.closeRoom(data.streamId, data.reason)
	.then(() => {
		stopDebug("closed room");
		discovery.signAck(ack, {
			success: true
		});
	});
});

function saveConfig(options, err) {
	if(err) {
		console.error(err.stack);
	}

	var data = {
		rooms: io.rooms
	};

	fs.writeFileSync("state.json", JSON.stringify(data), "utf8");
	console.log("[SaveState] Saved state, exiting...");

	if(options.exit) {
		process.exit();
	}
}

process.on("exit", saveConfig.bind(null, {}));
process.on("SIGTERM", saveConfig.bind(null, {exit: true}));
process.on("SIGINT", saveConfig.bind(null, {exit: true}));
process.on("uncaughtException", saveConfig.bind(null, {exit: true}));