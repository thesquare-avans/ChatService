const config = require("config");
const db = require("./db");
const io = require("socket.io")(config.get("ws.port"));
const debug = require("debug")("chatserver");

const integrity = require("./integrity");

const middleware = require("./middleware");

io.on("connection", (socket) => {
	middleware.integrity(socket);
	socket.use(middleware.verify(socket));

	socket.on("identify", require("../handlers/identify")(socket));
	socket.on("join", require("../handlers/join")(socket));
	socket.on("message", require("../handlers/message")(socket));

	socket.on("disconnect", (reason) => {
		if(socket.user) {
			debug(`User ${socket.user.id} disconnected`);
		}
	});
});
module.exports.io = io;

const rooms = {};
module.exports.rooms = rooms;

function closeRoom(room, reason) {
	debug("closing room %s", room);

	delete module.exports.rooms[room];
	if(!io.sockets.adapter.rooms.hasOwnProperty(room)) {
		debug("no room to clean up");
		return Promise.resolve();
	}

	io.in(room).emit("closing room", integrity.sign({
		room: room,
		reason: reason
	}));

	Object.keys(io.sockets.adapter.rooms[room].sockets).forEach((socketId) => {
		io.sockets.connected[socketId].leave(room);
	});

	return Promise.resolve();
}
module.exports.closeRoom = closeRoom;

setInterval(() => {
	debug("checking validity of rooms");

	var streamIds = Object.keys(module.exports.rooms);

	db.query(db.escape`
		SELECT
			id
		FROM
			stream
		WHERE
			id = ANY(${streamIds}::uuid[])
	`)
	.then((result) => {
		var validIds = result.rows.map((row) => {
			return row.id;
		});

		debug("rooms in memory: %d, valid: %d", streamIds.length, result.rows.length);

		var invalidIds = streamIds.filter((streamId) => {
			return validIds.indexOf(streamId) == -1;
		});

		return Promise.all(invalidIds.map((streamId) => {
			return closeRoom(streamId);
		}))
		.then(() => {
			debug("cleanup finished");
		});
	})
	.catch((err) => {
		console.error("[CheckValidity]", err);
	});
}, 60000);