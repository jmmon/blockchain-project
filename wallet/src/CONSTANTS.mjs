import bjs from 'bitcoinjs-lib'

import crypto from "crypto"

const COIN_PATH_INFO = {
	purpose: "44", // indicates bip44 compatibility
	coinType: "7789", // picked an unused number for our blockchain
};

const generatePathFromAccountChangeIndex = ({ account, change, index }) => `m/${COIN_PATH_INFO.purpose}'/${COIN_PATH_INFO.coinType}'/${account}'/${change}/${index}`;

const getAddressFromPublicKey = (publicKey) => bjs.payments.p2pkh({
	pubkey: publicKey,
})


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





export {
	COIN_PATH_INFO,
	generatePathFromAccountChangeIndex,
	getAddressFromPublicKey,
	encrypt,
	decrypt
};