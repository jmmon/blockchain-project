import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory.default(ecc);
import * as bip39 from 'bip39';

import bjs from 'bitcoinjs-lib';

const purpose = "44"
const coinType = "7789"

import bcrypt from "bcrypt";
import Crypto from "crypto";

const generatePathFromObject = ({ account, change, index }) => `m/${purpose}'/${coinType}'/${account}'/${change}/${index}`;

const getAddress = (publicKey) => bjs.payments.p2pkh({
	pubkey: publicKey,
}).address;


const IV = Crypto.randomBytes(16);

const padBuffer = (string, bytes = 32) => {
	const buffFromString = Buffer.from(string);
	return Buffer.concat([buffFromString], bytes);
}

const encrypt = (toEncrypt, passphrase) => {
	passphrase = padBuffer(passphrase);
	console.log({toEncrypt, paddedPassphrase: passphrase})
	let cipher = Crypto.createCipheriv('aes-256-cbc', passphrase, IV);
	let encrypted = cipher.update(toEncrypt, 'utf8', 'hex');
	encrypted += cipher.final('hex');
	return encrypted;
};

const decrypt = (encrypted, passphrase) => {
	passphrase = padBuffer(passphrase);
	console.log({encrypted, paddedPassphrase: passphrase})
	let decipher = Crypto.createDecipheriv('aes-256-cbc', passphrase, IV);
	let decrypted = decipher.update(encrypted, 'hex', 'utf8');
	decrypted += decipher.final('utf8');
	return decrypted;
};

 
const cryptPassword = (
		password,
) => {
	console.log('cryptPassword function runs');
	return bcrypt.hashSync(password, 10);
};

const comparePassword = (
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

const getAccountBalance = () => {
	
}

const signTransaction = () => {
	
}

const sendTransaction = () => {
	
}

const logout = () => {
	
}

const saveWallet = () => {
	
}



const walletUtils = {
	generateWallet,
	encrypt, 
	decrypt, 
	cryptPassword, 
	comparePassword,
	deriveKeysFromMnemonic,
};

export default walletUtils;





/* 
ESM scripts can only be imported (not required)
CJS scripts cannot import (only require)
ESM scripts can "default import" but not "named import"
ESM scripts can require(CJS) but causes trouble

*/