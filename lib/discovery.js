const config = require("config");
const socket = require("socket.io-client")(config.get("discoveryServer"));
const integrity = require("./integrity");

var isRegistered = false;

socket.on("connect", () => {
	console.log("[Socket.io/Connection] Connected to Discovery Service");

	module.exports.send("register", {
		type: "chat",
		id: config.get("serverId"),
		hostname: config.get("hostname")
	}, true)
	.then((response) => {
		if(response.success) {
			isRegistered = true;
			console.log("[Socket.io/Register]", "Registered with Discovery Service");
			return;
		}

		console.error("[Socket.io/Register]", response.error.code);
	})
	.catch((err) => {
		console.error("[Socket.io/Register]", err);
	});
});

socket.on("disconnect", () => {
	isRegistered = false;
	console.log("[Socket.io/Connection] Disconnected from Discovery Service");
});

module.exports.send = (event, data, ack, ackTimeout = 5000) => {
	if(!ack) {
		socket.emit(event, integrity.sign(data));
		return Promise.resolve();
	}

	return new Promise((resolve, reject) => {
		var timer = setTimeout(() => {
			resolve({
				success: false,
				error: {
					code: "timeout"
				}
			});
		}, ackTimeout);

		socket.emit(event, integrity.sign(data), (response) => {
			clearTimeout(timer);

			if(!response.hasOwnProperty("payload") || !response.hasOwnProperty("signature")) {
				return reject("invalidPacket");
			}

			try {
				var payload = JSON.parse(response.payload);
			} catch (e) {
				return reject("invalidBody");
			}

			if(!integrity.verify(response.payload, response.signature, "hex")) {
				return reject("invalidSignature");
			}

			return resolve(payload);
		});
	});
}

module.exports.on = (event, callback) => {
	socket.on(event, (data, ack) => {
		if(data.payload == undefined || data.signature == undefined) {
			console.error("SOMETHING WENT WRONG", data);
			return;
		}

		var verifiedData = integrity.verify(data.payload, data.signature);
		if(!verifiedData) {
			console.error("Packet with invalid signature");
			return;
		}

		return callback(verifiedData, ack);
	});
}

module.exports.signAck = (ack, data) => {
	if(!ack) {
		return;
	}

	if(!data) {
		data = {};
	}

	ack(integrity.sign(data));
};

module.exports.on("error", (data) => {
	console.error("[Socket.io/Error]", data);
});