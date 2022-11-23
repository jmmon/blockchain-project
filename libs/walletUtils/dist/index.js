import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory.default(ecc);
import * as bip39 from 'bip39';
import crypto from 'crypto';
import fetch from 'node-fetch';

const purpose = '44';
const coinType = '7789';
const CONSTANTS = {
	defaultFee: 10,
};
const CONFIG = {
	coinbase: { microcoinsPerCoin: 1000000 },
};

const generatePathFromObject = ({ account = 0, change = null, index = null }) =>
	`m/${purpose}'/${coinType}'/${account}'${
		change ? `/${change}${index ? `/${index}` : ''}` : ''
	}`;

// convert our 03... or 02... address into address with ...1 or ...0 (appended to end):
const compressThisPubKey = (compactPubKey) =>
	compactPubKey.slice(2).concat(compactPubKey.slice(1, 2) % 2 === 0 ? 0 : 1);

// convert our ...1 or ...0 address into address with 03... or 02... (prepended to front):
const decompressThisPubKey = (compressedPubKey) =>
	(compressedPubKey.slice(-1) % 2 === 0 ? '02' : '03').concat(compressedPubKey.slice(0, -1));

const removeSpaces = ({ from, to, value, fee, dateCreated, data, senderPubKey }) => {
	// escape spaces in data field
	data = data.replaceAll(/\s/gm, ' ');

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
	const escapedTxData = txDataJson.replace(/(?<!\\)\s/gm, '');

	return escapedTxData;
};

const hashTransaction = (tx) => crypto.createHash('sha256').update(removeSpaces(tx)).digest("hex");

// used to derive our address from our compressed public key
const addressFromCompressedPubKey = (compressedPubKey) =>
	crypto.createHash('ripemd160').update(compressedPubKey).digest('hex');

const padBuffer = (string, bytes = 32) => Buffer.concat([Buffer.from(string)], bytes);

const encrypt = (toEncrypt, passphrase) => {
	const IV = crypto.randomBytes(16);
	let response = {};
	try {
		passphrase = padBuffer(passphrase);
		console.log('encrypting:', { toEncrypt, paddedPassphrase: passphrase });
		let cipher = crypto.createCipheriv('aes-256-cbc', passphrase, IV);
		let encrypted = cipher.update(toEncrypt, 'utf8', 'hex');
		encrypted += cipher.final('hex');

		response = { data: { IV, encrypted }, error: null };
	} catch (err) {
		response = { data: null, error: err };
	} finally {
		return response;
	}
};

const decrypt = ({ IV, encrypted }, passphrase) => {
	let response = { data: null, error: null };
	try {
		passphrase = padBuffer(passphrase);
		console.log('decrypting:', {
			IV,
			encrypted,
			paddedPassphrase: passphrase,
		});
		IV = Buffer.from(IV);
		console.log({ IV });
		let decipher = crypto.createDecipheriv('aes-256-cbc', passphrase, IV);
		let decrypted = decipher.update(encrypted, 'hex', 'utf8');
		decrypted += decipher.final('utf8');

		response = { data: decrypted, error: null };
	} catch (err) {
		response = { data: null, error: err };
	} finally {
		return response;
	}
};

const deriveKeysFromMnemonic = async (mnemonic) => {
	const masterSeed = bip39.mnemonicToSeedSync(mnemonic);
	const masterNode = bip32.fromSeed(masterSeed);

	// only generating the first account, (not change,) first address
	const path = generatePathFromObject({
		account: '0',
		change: '0',
		index: '0',
	});

	const account0change0index0 = masterNode.derivePath(path);
	const hexPrivateKey = account0change0index0.privateKey.toString('hex');
	const hexPublicKeyCompact = account0change0index0.publicKey.toString('hex');

	const hexPublicKeyCompressed = compressThisPubKey(hexPublicKeyCompact);
	const testingDecompress = decompressThisPubKey(hexPublicKeyCompressed);
	console.log('compress and decompress works?', hexPublicKeyCompact === testingDecompress);

	const hexAddress = addressFromCompressedPubKey(hexPublicKeyCompressed);

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
	console.log({ privateKey, txDataHashBuffer });
	try {
		const splitSignature = (signature) => {
			return [signature.toString('hex').slice(0, 64), signature.toString('hex').slice(64)];
		};
		console.log({txDataHashBuffer})
		const hashArr = Uint8Array.from(Buffer.from(txDataHashBuffer, 'hex'));
		console.log({hashArr});
		const privateKeyArray = Uint8Array.from(Buffer.from(privateKey, 'hex'));
		const signature = Buffer.from(ecc.sign(hashArr, privateKeyArray));
		const [r, s] = splitSignature(signature);

		return { data: [r, s], error: null };
	} catch (err) {
		return { data: null, error: err };
	}
};

const deriveKeysIfWallet = async (walletOrKeys, password) => {
	if (!walletOrKeys.encryptedMnemonic) {
		return walletOrKeys;
	}
	// decrypt wallet for signing
	const encrypted = {
		IV: walletOrKeys.IV,
		encrypted: walletOrKeys.encryptedMnemonic,
	};
	const { data, error } = decrypt(encrypted, password);
	if (error) {
		return {
			data: null,
			error: 'Error decrypting wallet! Try a different password?',
		};
	}

	// derive our keys
	return await deriveKeysFromMnemonic(data);
};

const decryptAndSign = async (walletOrKeys, recipient, value, password = '') => {
	const keys = await deriveKeysIfWallet(walletOrKeys, password);

	// prepare and hash our transaction data
	const { privateKey, publicKey, address } = keys;
	console.log('faucet info:', { privateKey, publicKey, address });

	let txDataToHash = {
		from: address,
		to: recipient,
		value,
		fee: CONSTANTS.defaultFee,
		dateCreated: new Date().toISOString(),
		data: '',
		senderPubKey: publicKey,
	};
	const txDataHashBuffer = hashTransaction(txDataToHash);
	console.log('txData:', { txDataToHash, txDataHashBuffer });

	// attempt signing
	const signResponse = signTransaction(privateKey, txDataHashBuffer);
	if (signResponse.error) {
		console.log('-- signResponse error');
		return { data: null, error: signResponse.error };
	}

	console.log('done signing');
	// add our hash and signature fields
	const txData = {
		transactionDataHash: txDataHashBuffer.toString('hex'),
		senderSignature: signResponse.data,
		...txDataToHash,
	};

	return { data: txData, error: null };
};

const submitTransaction = async (nodeUrl, signedTransaction) => {
	let response;
	try {
		// post to node to submit signed transaction
		response = await fetch(`${nodeUrl}/transactions/send`, {
			method: 'POST',
			body: JSON.stringify(signedTransaction),
			headers: { 'Content-Type': 'application/json' },
		});
		console.log({ submitTransactionResponse: response });

		// save our sent transaction for displaying

		if (response.status === 200) {
			return { data: signedTransaction, error: null };
		}

		console.log(`error submitting transaction`);
		const json = await response.json();

		// data / validation error
		if (response.status === 400) {
			return { data: null, error: json.errorMsg };
		}

		// 404, etc
		return { data: null, error: 'Error connecting to node' };
	} catch (err) {
		return { data: null, error: err };
	}
};

const fetchAddressBalance = (nodeUrl, address) =>
	fetch(`${nodeUrl}/address/${address}/balance`).then((res) => res.json());

const verifySignature = (txDataHash, publicKey, signature) => {
	// console.log('walletUtils - verifySignature:', {
	// 	txDataHash,
	// 	publicKey,
	// 	signature,
	// });
	const decompPubKey = decompressThisPubKey(publicKey);
	const txDataHashArray = Uint8Array.from(Buffer.from(txDataHash, 'hex'));
	const publicKeyArray = Uint8Array.from(Buffer.from(decompPubKey, 'hex'));
	const signatureArray = Uint8Array.from(Buffer.from(signature.join(''), 'hex'));
	// console.log(`--`, { txDataHashArray, publicKeyArray, signatureArray });

	// h == txDataHash
	// Q == their public key?
	const isValid = ecc.verify(txDataHashArray, publicKeyArray, signatureArray);
	console.log(`walletUtils - verifySignature: isValid? ${isValid ? 'YES' : 'NO'}`);
	return isValid;
};

const convert = {
	toCoins: (micros) => ({
		amount: (+micros / CONFIG.coinbase.microcoinsPerCoin).toFixed(
			String(CONFIG.coinbase.microcoinsPerCoin).length - 1
		),
		type: 'coins',
	}),
	toMicros: (wholes) => ({
		amount: wholes * CONFIG.coinbase.microcoinsPerCoin,
		type: 'microcoins',
	}),
};

const walletUtils = {
	generateWallet,
	encrypt,
	decrypt,
	deriveKeysFromMnemonic,
	signTransaction,
	addressFromCompressedPubKey,
	decryptAndSign,
	submitTransaction,
	fetchAddressBalance,
	verifySignature,
	hashTransaction,
	CONSTANTS,
	convert,
};

export default walletUtils;
