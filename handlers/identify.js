const crypto = require("crypto");

const users = require("../lib/users");
const db = require("../lib/db");

module.exports = (socket) => {
	return (data, ack) => {
		if(!data.hasOwnProperty("publicKey")) {
			return socket.signAck(ack, socket.errorBody("publicKeyMissing"));
		}

		var hash = crypto.createHash("sha256");
		hash.update(data.publicKey, "utf8");
		var digest = hash.digest("base64");

		db.query(db.escape`
			SELECT
				*
			FROM
				public.user
			WHERE
				"keyHash" = ${digest}
		`)
		.then((result) => {
			if(result.rows.length == 1) {
				socket.user = result.rows[0];
				socket.user.publicKey = Buffer.from(data.publicKey, "base64");

				return socket.signAck(ack, {
					success: true
				});
			}

			return socket.signAck(ack, socket.errorBody("userNotFound"));
		})
		.catch((err) => {
			console.log(err);
			socket.signAck(ack, socket.errorBody("unexpectedError"));
		});
	};
};