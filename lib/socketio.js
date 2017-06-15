const config = require("config");
const io = require("socket.io")(config.get("ws.port"));

const integrity = require("./integrity");

const users = require("./users");

const middleware = require("./middleware");

io.on("connection", (socket) => {
	middleware.integrity(socket);
	socket.use(middleware.verify(socket));

	socket.on("identify", require("../handlers/identify")(socket));

	socket.on("disconnect", (reason) => {
		if(socket.user) {
			delete users[socket.user.id];
			console.log(`User ${socket.user.id} disconnected`);
		}
	});
});
module.exports.io = io;

module.exports.rooms = {};