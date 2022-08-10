import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";
const bip32 = BIP32Factory.default(ecc);
import * as bip39 from "bip39";
import bjs from "bitcoinjs-lib";
import crypto from "crypto";

// var elliptic = require('elliptic')
import elliptic from "elliptic";
import ripemd160 from "ripemd160-js";
var ec = new elliptic.ec("secp256k1");

const IV = crypto.randomBytes(16);
const purpose = "44";
const coinType = "7789";
const CONSTANTS = {
	defaultFee: 10,
};

const generatePathFromObject = ({ account = 0, change = null, index = null}) =>
	`m/${purpose}'/${coinType}'/${account}'${change ? `/${change}${index ? `/${index}` : ''}` : ''}`;

const getAddress = (node) =>
	bjs.payments.p2pkh({
		pubkey: node.publicKey,
	}).address;

const getCompressedPublicKey = async (compactPubKey) => {
	return compactPubKey
		.slice(2)
		.concat(compactPubKey.slice(1, 2) % 2 === 0 ? 0 : 1);
}

const padBuffer = (string, bytes = 32) =>
	Buffer.concat([Buffer.from(string)], bytes);

const encrypt = (toEncrypt, passphrase) => {
	passphrase = padBuffer(passphrase);
	console.log({ toEncrypt, paddedPassphrase: passphrase });
	let cipher = crypto.createCipheriv("aes-256-cbc", passphrase, IV);
	let encrypted = cipher.update(toEncrypt, "utf8", "hex");
	encrypted += cipher.final("hex");
	return encrypted;
};

const decrypt = (encrypted, passphrase) => {
	passphrase = padBuffer(passphrase);
	console.log({ encrypted, paddedPassphrase: passphrase });
	let decipher = crypto.createDecipheriv("aes-256-cbc", passphrase, IV);
	let decrypted = decipher.update(encrypted, "hex", "utf8");
	decrypted += decipher.final("utf8");
	return decrypted;
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
	const hexPrivateKey = account0change0index0.privateKey.toString("hex")
	const hexPublicKeyCompact = account0change0index0.publicKey.toString("hex");

	// convert our 03 or 02 address into a hex address with 1 or 0 appended to end:
	const hexPublicKeyCompressed = await getCompressedPublicKey(hexPublicKeyCompact);

	//derive our address from our compressed public key
	const hexAddress = await ripemd160(hexPublicKeyCompressed);

	// const address = getAddress(account0change0index0);
	// const hexAddress = address.toString("hex");
	// const addressBufferHex = Buffer.from(address).toString('hex');

	
	// console.log({ address, hexAddress, addressBufferHex });

	//private key: eea119144e607be38603ec00b3b166a1a6d0eb676bce5dd73277dbb8f0248917
	// public key (compact): 034922d832a6bd2a1da82d362ae066f49a54e565fc964b13597dfb6482b2006695



	return {
		privateKey: hexPrivateKey,
		publicKey: hexPublicKeyCompressed,
		address: hexAddress,
	};
};

// with elliptic:
//from mnemonic, generate seed
//get our masterNode (which contains xpriv and xpub) from our seed

const deriveKeys = async (mnemonic) => {
	const masterSeed = bip39.mnemonicToSeedSync(mnemonic);
	// Generate new keypair
	const masterNode = bip32.fromSeed(masterSeed);
	const account = masterNode.derivePath(generatePathFromObject({account: "0"}));
	console.log({accountPrivateKey: account.privateKey.toString('hex'), accountPublicKey: account.publicKey.toString('hex')})
	//private key: 45d500a02b1ac852fe9263e718e8b2b57b8b4ef8194095ff7259684f753d5633
	// public key: 03428f92a2f58931887f82ccfd72351b7401cde1f5a33a98ae7059c9a528101394

	const childBuffer = Buffer.from(account.privateKey);




	const newKeyPair = ec.genKeyPair({ entropy: masterSeed });
	console.log({ newKeyPair });

	const publicKey = newKeyPair.getPublic("hex");
	const publicKeyCompact = newKeyPair.getPublic(true, "hex");
	const publicKeyCompressed = publicKeyCompact
		.slice(2)
		.concat(publicKeyCompact.slice(1, 2) % 2 === 0 ? 0 : 1);
	const privateKey = newKeyPair.getPrivate("hex");

	const address = await ripemd160(publicKeyCompressed);

	console.log({
		privateKey,
		privateKeyLength: privateKey.length,
		publicKey,
		publicKeyLength: publicKey.length,
		publicKeyCompressed,
		publicKeyCompressedLength: publicKeyCompressed.length,
		address,
		addressLength: address.length,
	});
	return {
		privateKey,
		publicKeyCompressed,
		address,
	};
};

const generateWallet = async () => {
	const mnemonic = bip39.generateMnemonic();
	return {
		mnemonic,
		...await deriveKeysFromMnemonic(mnemonic)
	};
	// return {
	// 	mnemonic,
	// 	...deriveKeys(mnemonic),
	// };
};

const eccSign = (hash, privateKey) => ecc.sign(Buffer.from(hash), privateKey);

const hashSha256 = (data) =>
	Buffer.from(crypto.createHash("sha256").update(data).digest());

const generateBytes = (bytes) => crypto.randomBytes(bytes);

const splitSignature = (signature) => {
	const [r, s] = [
		signature.toString("hex").slice(0, 64),
		signature.toString("hex").slice(64),
	];
	return { r, s };
};

const walletUtils = {
	generateWallet,
	encrypt,
	decrypt,
	deriveKeysFromMnemonic,
	eccSign,
	hashSha256,
	generateBytes,
	splitSignature,
	CONSTANTS,
};

export default walletUtils;
