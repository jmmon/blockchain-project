import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";
const bip32 = BIP32Factory.default(ecc);
import * as bip39 from "bip39";
import crypto from "crypto";
import fetch from 'node-fetch';

const IV = crypto.randomBytes(16);
const purpose = "44";
const coinType = "7789";
const CONSTANTS = {
	defaultFee: 10,
};

const generatePathFromObject = ({ account = 0, change = null, index = null }) =>
	`m/${purpose}'/${coinType}'/${account}'${
		change ? `/${change}${index ? `/${index}` : ""}` : ""
	}`;

// convert our 03... or 02... address into address with ...1 or ...0 (appended to end):
const getCompressedPublicKey = async (compactPubKey) => compactPubKey
		.slice(2)
		.concat(compactPubKey.slice(1, 2) % 2 === 0 ? 0 : 1);

// used to derive our address from our compressed public key
const getAddressFromCompressedPubKey = (compressedPubKey) => crypto.createHash("ripemd160").update(compressedPubKey).digest('hex');

const padBuffer = (string, bytes = 32) =>
	Buffer.concat([Buffer.from(string)], bytes);

const encrypt = (toEncrypt, passphrase) => {
	let response = {data: null, error: null};
	try {
		passphrase = padBuffer(passphrase);
		console.log({ toEncrypt, paddedPassphrase: passphrase });
		let cipher = crypto.createCipheriv("aes-256-cbc", passphrase, IV);
		let encrypted = cipher.update(toEncrypt, "utf8", "hex");
		encrypted += cipher.final("hex");

		response = {data: encrypted, error: null};

	} catch(err) {
		response = {data: null, error: err};

	} finally {
		return response;
	}
};

const decrypt = (encrypted, passphrase) => {
	let response = {data: null, error: null};
	try {
		passphrase = padBuffer(passphrase);
		console.log({ encrypted, paddedPassphrase: passphrase });
		let decipher = crypto.createDecipheriv("aes-256-cbc", passphrase, IV);
		let decrypted = decipher.update(encrypted, "hex", "utf8");
		decrypted += decipher.final("utf8");

		response = {data: decrypted, error: null};

	} catch(err) {
		response = {data: null, error: err};

	} finally {
		return response;
	}
};


const deriveKeysFromMnemonic = async (mnemonic) => {
	const masterSeed = bip39.mnemonicToSeedSync(mnemonic);
	const masterNode = bip32.fromSeed(masterSeed);

	// only generating the first account, (not change,) first address
	const path = generatePathFromObject({
		account: "0",
		change: "0",
		index: "0",
	});

	const account0change0index0 = masterNode.derivePath(path);
	const hexPrivateKey = account0change0index0.privateKey.toString("hex");
	const hexPublicKeyCompact = account0change0index0.publicKey.toString("hex");

	const hexPublicKeyCompressed = await getCompressedPublicKey(
		hexPublicKeyCompact
	);

	const hexAddress = getAddressFromCompressedPubKey(
		hexPublicKeyCompressed
	);
	
	return {
		privateKey: hexPrivateKey,
		publicKey: hexPublicKeyCompressed,
		address: hexAddress,
	};
};

const generateWallet = async () => {
	const mnemonic = bip39.generateMnemonic();
	return {
		mnemonic,
		...(await deriveKeysFromMnemonic(mnemonic)),
	};
};


const signTransaction = (privateKey, txDataHashBuffer) => {
	let response = {data: null, error: null};
	try {
		const splitSignature = (signature) => {
			return [
				signature.toString("hex").slice(0, 64),
				signature.toString("hex").slice(64),
			];
		};
	
		const privateKeyArray = Uint8Array.from(Buffer.from(privateKey, "hex"));
		const signature = Buffer.from(
			ecc.sign(Buffer.from(txDataHashBuffer), privateKeyArray)
		);
	
		const [r, s] = splitSignature(signature);
	
		response = {data: [r, s], error: null};

	} catch(err) {
		response = {data: null, error: err};

	} finally {
		return response;
	}
	
};

const removeSpaces = ({
	from,
	to,
	value,
	fee,
	dateCreated,
	data,
	senderPubKey,
}) => {
	// escape data field spaces
	data = data.replaceAll(/\s/gm, "\ ");

	// rebuild to make sure order stays the same
	const txDataJson = JSON.stringify({
		from,
		to,
		value,
		fee,
		dateCreated,
		data,
		senderPubKey,
	});

	// replace non-escaped spaces
	const escapedTxData = txDataJson.replace(
		/(?<!\\)\s/gm,
		""
	);

	return escapedTxData;
}


const hashTransaction = (tx) => Buffer.from(crypto.createHash("sha256").update(removeSpaces(tx)).digest());


const decryptAndSign = async (walletOrKeys, recipient, value, password = '') => {
	let keys;
	if (walletOrKeys.encryptedMnemonic) {
		// decrypt wallet for signing
		const response = decrypt(walletOrKeys.encryptedMnemonic, password);
		if (response.error) {
			return {data: null, error: "Error decrypting wallet! Try a different password?"};
		}

		// derive our keys
		keys = await deriveKeysFromMnemonic(response.data);
	} else {
		keys = walletOrKeys;
	}

	const {privateKey, publicKey, address} = keys;
	

	// prepare and hash our transaction data
	let txData = {
		from: address,
		to: recipient,
		value,
		fee: CONSTANTS.defaultFee,
		dateCreated: new Date().toISOString(),
		data: "",
		senderPubKey: publicKey,
	};
	const txDataHashBuffer = hashTransaction(txData);

	// attempt signing
	const signResponse = signTransaction(privateKey, txDataHashBuffer);
	if (signResponse.error) {
		return {data: null, error: "Error signing transaction!"};
	}

	// add our hash and signature fields
	txData["transactionDataHash"] = txDataHashBuffer.toString("hex");
	txData["senderSignature"] = signResponse.data;

	console.log("tx data before saving", { txData });
	return {data: txData, error: null};
}

const submitTransaction = async (nodeUrl, signedTransaction) => {
	// post to node to submit signed transaction
	const response = await fetch(`${nodeUrl}/transactions/send`, {
		method: "POST",
		body: JSON.stringify(signedTransaction),
		headers: { "Content-Type": "application/json" },
	});
	console.log({ nodeResponse: response });

	if (response.status === 200) {
		// save our sent transaction for displaying
		return {data: signedTransaction.transactionDataHash, error: null};
	}

	console.log(`error submitting transaction`);
	const json = await response.json();

	if (response.status === 400) {
		// data / validation error
		return {data: null, error: json.errorMsg};
	}

	// other node errors (offline)
	return {data: null, error: "Error connecting to node"};
}


const walletUtils = {
	generateWallet,
	encrypt,
	decrypt,
	deriveKeysFromMnemonic,
	signTransaction,
	hashTransaction,
	getAddressFromCompressedPubKey,
	decryptAndSign,
	submitTransaction,
	CONSTANTS,
};

export default walletUtils;
