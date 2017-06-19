const integrity = require("./integrity");
const debug = require("debug");

function integrityMiddleware(socket) {
	socket.sign = (event, data, ack, ackTimeout = 5000) => {
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

				if(!integrity.verifyClient(response.payload, response.signature, socket.user.publicKey)) {
					return reject("invalidSignature");
				}

				return resolve(payload);
			});
		});
	}

	socket.signBody = (data) => {
		return integrity.sign({
			success: true,
			data: data
		});
	};

	socket.signError = (err) => {
		return integrity.sign({
			success: false,
			error: {
				code: err
			}
		});
	}

	socket.signAck = (ack, data) => {
		if(!ack) {
			return;
		}

		if(!data) {
			data = {};
		}

		ack(integrity.sign(data));
	}

	socket.errorBody = (err) => {
		return {
			success: false,
			error: {
				code: err
			}
		}
	}
}
module.exports.integrity = integrityMiddleware;

function verify(socket) {
	var vDebug = debug("mw_verify");

	return (packet, next) => {
		var handleErr = function (err) {
			var err = new Error(err);
			err.data = integrity.sign({
				success: false,
				error: {
					code: err
				}
			});

			vDebug(`handling error ${err.message}`);

			next(err);
		}

		vDebug("received packet");

		if(typeof packet[2] == "function") {
			vDebug("packet has ack function");
			handleErr = function (err) {
				vDebug(`handling error ${err}`);
				socket.signAck(packet[2], socket.errorBody(err));
			}
		}

		if(typeof packet[1] != "object") {
			return handleErr("packetInvalid");
		}

		var data = packet[1];
		if(!data.hasOwnProperty("payload") || !data.hasOwnProperty("signature")) {
			return handleErr("messageInvalid");
		}

		try {
			var payload = JSON.parse(data.payload);
		} catch (e) {
			return handleErr("payloadInvalid");
		}

		var key;

		if(packet[0] == "identify") {
			vDebug("identify packet");
			if(!payload.hasOwnProperty("publicKey")) {
				return handleErr("publicKeyMissing");
			}

			key = Buffer.from(payload.publicKey, "base64");
		}else{
			if(socket.user) {
				key = socket.user.publicKey;
			}else{
				return handleErr("notIdentified");
			}
		}

		if(!integrity.verifyClient(data.payload, data.signature, key)) {
			return handleErr("signatureInvalid");
		}

		if(packet[0] == "message") {
			vDebug("packet is message");
			packet[1] = {
				parsed: payload,
				original: packet[1]
			};
		}else{
			vDebug("packet is other");
			packet[1] = payload;
		}

		if(packet[0] != "identify" && !socket.hasOwnProperty("user")) {
			return handleErr("notIdentified");
		}

		vDebug("packet valid");

		next();
	}
}
module.exports.verify = verify;