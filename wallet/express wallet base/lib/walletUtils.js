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

const getCompressedPublicKey = async (compactPubKey) => {
	return compactPubKey
		.slice(2)
		.concat(compactPubKey.slice(1, 2) % 2 === 0 ? 0 : 1);
}

const getAddressFromCompressedPublicKey = async (compressedPubKey) => await ripemd160(compressedPubKey);

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
	const hexAddress = await getAddressFromCompressedPublicKey(hexPublicKeyCompressed);

	//from mnemonic: talent rose armor father call budget bone toast bubble bargain fluid feel
	//private key: f00c5b3bb9a6754b40a4100bb9e62e1c49aff981343f925ded7bd0adf4f36018
	// public key: 212e35593185b30a9a33645a23a1be6fc39cbec7bffed1592f608e9a6c8726431
	// address: 0feb1f7788c6191cacf7ec060a6326f57046bb7d

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
		...await deriveKeysFromMnemonic(mnemonic)
	};
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
