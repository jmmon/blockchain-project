import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory.default(ecc);
import * as bip39 from 'bip39';
import bjs from 'bitcoinjs-lib';

import bcrypt from "bcrypt";
import crypto from "crypto";

const IV = crypto.randomBytes(16);
const purpose = "44"
const coinType = "7789"
const CONSTANTS = {
	defaultFee: 10,
};

const generatePathFromObject = ({ account, change, index }) => `m/${purpose}'/${coinType}'/${account}'/${change}/${index}`;

const getAddress = (publicKey) => bjs.payments.p2pkh({
	pubkey: publicKey,
}).address;

const padBuffer = (string, bytes = 32) => Buffer.concat([Buffer.from(string)], bytes);


const encrypt = (toEncrypt, passphrase) => {
	passphrase = padBuffer(passphrase);
	console.log({toEncrypt, paddedPassphrase: passphrase})
	let cipher = crypto.createCipheriv('aes-256-cbc', passphrase, IV);
	let encrypted = cipher.update(toEncrypt, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	return encrypted;
};

const decrypt = (encrypted, passphrase) => {
	passphrase = padBuffer(passphrase);
	console.log({encrypted, paddedPassphrase: passphrase})
	let decipher = crypto.createDecipheriv('aes-256-cbc', passphrase, IV);
	let decrypted = decipher.update(encrypted, 'hex', 'utf8');
	decrypted += decipher.final('utf8');
	return decrypted;
};

 
const hashData = (
		data,
) => {
	return bcrypt.hashSync(data, 10);
};

const compareHash = (
		plainPass, 
		hashword, 
	// callback
	) => {
   bcrypt.compare(plainPass, hashword, (err, isPasswordMatch) => {   
       return err || isPasswordMatch;
			 	// return err == null ?
        //    callback(null, isPasswordMatch) :
        //    callback(err);
   });
};

const deriveKeysFromMnemonic = (mnemonic) => {
	const masterSeed = bip39.mnemonicToSeedSync(mnemonic);
	const masterNode = bip32.fromSeed(masterSeed);

	// only generating the first account, (not change,) first address
	const path = generatePathFromObject({
		account: "0",
		change: "0",
		index: "0"
	});

	const privateKey = masterNode.derivePath(path).privateKey;
	const publicKey = masterNode.derivePath(path).publicKey;
	const address = getAddress(publicKey);

	return {
		privateKey: privateKey.toString('hex'),
		publicKey: publicKey.toString('hex'),
		address
	};
}

const generateWallet = () => {
	const mnemonic = bip39.generateMnemonic();
	return {
		mnemonic,
		...deriveKeysFromMnemonic(mnemonic)
	};
}

const eccSign = (hash, privateKey) => ecc.sign(Buffer.from(hash), privateKey);

const hashSha256 = (data) => Buffer.from(crypto.createHash('sha256').update(data).digest());

const generateBytes = (bytes) => crypto.randomBytes(bytes);

const sliceSignature = (signature) => {
	const [r, s] = [signature.toString('hex').slice(0, 64), signature.toString('hex').slice(64)]
	return {r, s};
}


const walletUtils = {
	generateWallet,
	encrypt, 
	decrypt, 
	hashData, 
	compareHash,
	deriveKeysFromMnemonic,
	eccSign,
	hashSha256,
	generateBytes,
	sliceSignature,
	CONSTANTS,
};

export default walletUtils;