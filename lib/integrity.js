/*
*	ONLY USE FOR SERVER-TO-SERVER MESSAGES (OWNED BY US)
*/

const config = require("config");
const crypto = require("crypto");

const cryptoInfo = {
	privateKeyPem: Buffer.from(config.get("crypto.private"), "base64"),
	publicKeyPem: Buffer.from(config.get("crypto.public"), "base64")
};

function verify(message, signature) {
	var verify = crypto.createVerify("RSA-SHA256");
	verify.write(message);
	verify.end();

	if(!verify.verify(cryptoInfo.publicKeyPem, signature, "hex")) {
		return false;
	}

	var jsonMessage = JSON.parse(message);

	if(Math.abs(jsonMessage.timestamp - Math.round(new Date().getTime() / 1000)) > 5) {
		return false;
	}

	return jsonMessage;
}
module.exports.verify = verify;

function verifyClient(message, signature, publicKey) {
	var verify = crypto.createVerify("RSA-SHA256");
	verify.write(message);
	verify.end();

	if(!verify.verify(publicKey, signature, "hex")) {
		return false;
	}

	var jsonMessage = JSON.parse(message);

	if(Math.abs(jsonMessage.timestamp - Math.round(new Date().getTime() / 1000)) > 5) {
		return false;
	}

	return jsonMessage;
}
module.exports.verifyClient = verifyClient;

function sign(data) {
	if(!data) {
		data = {};
	}

	data.timestamp = Math.round(new Date().getTime() / 1000);
	
	var signer = crypto.createSign("sha256");

	var textData = JSON.stringify(data);

	signer.update(textData, "utf8");

	return {
		payload: textData,
		signature: signer.sign(cryptoInfo.privateKeyPem).toString("hex")
	};
}
module.exports.sign = sign;