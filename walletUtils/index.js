import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory.default(ecc);
import * as bip39 from 'bip39';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { trimAndSha256Hash } from '../blockchain/src/hashing.js';

const purpose = '44';
const coinType = '7789';
const CONSTANTS = {
	defaultFee: 10,
};

const generatePathFromObject = ({ account = 0, change = null, index = null }) =>
	`m/${purpose}'/${coinType}'/${account}'${
		change ? `/${change}${index ? `/${index}` : ''}` : ''
	}`;

// convert our 03... or 02... address into address with ...1 or ...0 (appended to end):
const compressThisPubKey = async (compactPubKey) =>
	compactPubKey.slice(2).concat(compactPubKey.slice(1, 2) % 2 === 0 ? 0 : 1);

// used to derive our address from our compressed public key
const addressFromCompressedPubKey = (compressedPubKey) =>
	crypto.createHash('ripemd160').update(compressedPubKey).digest('hex');

const padBuffer = (string, bytes = 32) =>
	Buffer.concat([Buffer.from(string)], bytes);

const encrypt = (toEncrypt, passphrase) => {
	const IV = crypto.randomBytes(16);
	let response = { data: null, error: null };
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

	const hexPublicKeyCompressed = await compressThisPubKey(
		hexPublicKeyCompact
	);

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
	let response = { data: null, error: null };
	try {
		const splitSignature = (signature) => {
			return [
				signature.toString('hex').slice(0, 64),
				signature.toString('hex').slice(64),
			];
		};

		const privateKeyArray = Uint8Array.from(Buffer.from(privateKey, 'hex'));
		const txDataArray = Uint8Array.from(
			Buffer.from(txDataHashBuffer, 'hex')
		);
		// const signature = Buffer.from(
		// 	ecc.sign(Buffer.from(txDataHashBuffer), privateKeyArray)
		// );
		const signature = Buffer.from(ecc.sign(txDataArray, privateKeyArray));
		const [r, s] = splitSignature(signature);

		response = { data: [r, s], error: null };
	} catch (err) {
		response = { data: null, error: err };
	} finally {
		return response;
	}
};

const decryptAndSign = async (
	walletOrKeys,
	recipient,
	value,
	password = ''
) => {
	let keys;
	if (walletOrKeys.encryptedMnemonic) {
		// decrypt wallet for signing

		const encrypted = {
			IV: walletOrKeys.IV,
			encrypted: walletOrKeys.encryptedMnemonic,
		};
		const response = decrypt(encrypted, password);
		if (response.error) {
			return {
				data: null,
				error: 'Error decrypting wallet! Try a different password?',
			};
		}

		// derive our keys
		keys = await deriveKeysFromMnemonic(response.data);
	} else {
		keys = walletOrKeys;
	}

	// prepare and hash our transaction data
	const { privateKey, publicKey, address } = keys;
	console.log('faucet info:', { privateKey, publicKey, address });
	let txData = {
		from: address,
		to: recipient,
		value,
		fee: CONSTANTS.defaultFee,
		dateCreated: new Date().toISOString(),
		data: '',
		senderPubKey: publicKey,
	};
	console.log('txData:', { txData });
	const txDataHashBuffer = trimAndSha256Hash(txData);
	console.log({ txDataHashBuffer });

	// attempt signing
	const signResponse = signTransaction(privateKey, txDataHashBuffer);
	if (signResponse.error) {
		return { data: null, error: signResponse.error };
	}

	console.log('done signing');
	// add our hash and signature fields
	txData['transactionDataHash'] = txDataHashBuffer.toString('hex');
	txData['senderSignature'] = signResponse.data;

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

const fetchAddressBalance = async (nodeUrl, address) => {
	const response = await fetch(`${nodeUrl}/address/${address}/balance`);
	return await response.json();
};

const verifySignature = (txDataHash, publicKey, signature) => {
	// h == txDataHash
	// Q == their public key?
	console.log({txDataHash, publicKey, signature});
	const txDataHashArray = Uint8Array.from(Buffer.from(txDataHash, 'hex'));
	const publicKeyArray = Uint8Array.from(Buffer.from(publicKey, 'hex'));
	const signatureArray = Uint8Array.from(
		Buffer.from(signature.join(''), 'hex')
	);
	//rejoin our signature (r and s?)

	return ecc.verify(txDataHashArray, publicKeyArray, signatureArray);
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
	CONSTANTS,
};

export default walletUtils;

// const isValidProof = (hash, difficulty) => {
// 	return hash.slice(0, difficulty) === '0'.repeat(difficulty);
// };

// export const hashUtils = {
// 	isValidProof,
// };
