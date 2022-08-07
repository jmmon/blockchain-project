import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory.default(ecc);
import * as bip39 from 'bip39';

import bjs from 'bitcoinjs-lib';

const purpose = "44"
const coinType = "7789"

const bcrypt = require('bcrypt');

const getPathFromPathObject = ({ account, change, index }) => `m/${purpose}'/${coinType}'/${account}'/${change}/${index}`;

const getAddress = (publicKey) => bjs.payments.p2pkh({
	pubkey: publicKey,
}).address;


const IV = "1ec514b8b807860c2be9f7e86a704511";

const encrypt = (value, passphrase) => {
	let cipher = crypto.createCipheriv('aes-256-cbc', passphrase, IV);
	let encrypted = cipher.update(value, 'utf8', 'base64');
	encrypted += cipher.final('base64');
	return encrypted;
};

const decrypt = (encrypted, passphrase) => {
	let decipher = crypto.createDecipheriv('aes-256-cbc', passphrase, IV);
	let decrypted = decipher.update(encrypted, 'base64', 'utf8');
	decrypted += decipher.final('utf8');
	return decrypted;
};

 
const cryptPassword = (password, callback) => {
   bcrypt.genSalt(10, (err, salt) => {
    if (err) 
      return callback(err);

    bcrypt.hash(password, salt, (err, hash) => {
      return callback(err, hash);
    });
  });
};

const comparePassword = (plainPass, hashword, callback) => {
   bcrypt.compare(plainPass, hashword, (err, isPasswordMatch) => {   
       return err == null ?
           callback(null, isPasswordMatch) :
           callback(err);
   });
};


const generateWallet = () => {
	const mnemonic = bip39.generateMnemonic();
	const masterSeed = bip39.mnemonicToSeedSync(mnemonic);
	const masterNode = bip32.fromSeed(masterSeed);

	const accountPath = {
		account: "0",
		change: "0",
		index: "0"
	};

	const path = getPathFromPathObject(accountPath);

	const privateKey = masterNode.derivePath(path).privateKey;
	const publicKey = masterNode.derivePath(path).publicKey;
	const address = getAddress(publicKey);

	// console.log(address);

	return {
		mnemonic,
		privateKey: privateKey.toString('hex'),
		publicKey: publicKey.toString('hex'),
		address
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

const loadWallet = () => {
	
}



// const walletUtils = {
// 	bip32,
// 	bip39,
// 	bjs
// };

// export default walletUtils;
// export default {
// 	bip32,
// 	bip39,
// 	bjs
// };


const walletUtils = {
	generateWallet,
};

export default walletUtils;





/* 
ESM scripts can only be imported (not required)
CJS scripts cannot import (only require)
ESM scripts can "default import" but not "named import"
ESM scripts can require(CJS) but causes trouble



*/