import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";
const bip32 = BIP32Factory.default(ecc);
import * as bip39 from "bip39";
import crypto from "crypto";

const IV = crypto.randomBytes(16);
const purpose = "44";
const coinType = "7789";
const CONSTANTS = {
	defaultFee: 10,
};

// crypto.getHashes().forEach(hash => {
//  console.log(hash);
// });

const generatePathFromObject = ({ account = 0, change = null, index = null }) =>
	`m/${purpose}'/${coinType}'/${account}'${
		change ? `/${change}${index ? `/${index}` : ""}` : ""
	}`;

const getCompressedPublicKey = async (compactPubKey) => {
	return compactPubKey
		.slice(2)
		.concat(compactPubKey.slice(1, 2) % 2 === 0 ? 0 : 1);
};

const ripemd160 = (compressedPubKey) => crypto.createHash("ripemd160").update(compressedPubKey).digest('hex');

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
	const hexPrivateKey = account0change0index0.privateKey.toString("hex");
	const hexPublicKeyCompact = account0change0index0.publicKey.toString("hex");

	// convert our 03 or 02 address into a hex address with 1 or 0 appended to end:
	const hexPublicKeyCompressed = await getCompressedPublicKey(
		hexPublicKeyCompact
	);

	//derive our address from our compressed public key
	const hexAddress = ripemd160(
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

	return [r, s];
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


const walletUtils = {
	generateWallet,
	encrypt,
	decrypt,
	deriveKeysFromMnemonic,
	signTransaction,
	hashTransaction,
	CONSTANTS,
};

export default walletUtils;
