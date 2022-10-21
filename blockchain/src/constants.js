const CONFIG = {
	defaultServerHost: 'localhost',
	defaultServerPort: 5555,
	difficulty: {
		dynamic: false,
		starting: 4,
		// if dynamic, uses below settings
		limit: 7,
		targetBlockSeconds: 4,
		averageOverBlocks: 96,
		adjustmentRatio: 3,
	},
	faucet: {
		mnemonic: 'bright pledge fan pet mesh crisp ecology luxury bulb horror vacuum brown',
		address: 'eae972db2776e38a75883aa2c0c3b8cd506b004d',
		privateKey:
			'51a8bbf1192e434f8ff2761f95ddf1ba553447d2c1decd92cca2f43cd8609574',
		publicKey:
			'46da25d657a170c983dc01ce736094ef11f557f8a007e752ac1eb1f705e1b9070',
		valueToGenerate: 1000000000000, // 1,000,000,000,000
		valuePerTransaction: 1000000,
	},
	coinbase: {
		blockReward: 5000000,
		address: '0000000000000000000000000000000000000000',
		publicKey:
			'00000000000000000000000000000000000000000000000000000000000000000',
		signature: [
			'0000000000000000000000000000000000000000000000000000000000000000',
			'0000000000000000000000000000000000000000000000000000000000000000',
		],
	},
	transactions: {
		minFee: 10,
		safeConfirmCount: 6,
		spendUnconfirmedFunds: false,
	},
	genesisBlock: undefined,
	CHAIN_BIRTHDAY: new Date(2021, 9, 15).toISOString(),
	chainId: '',
	nodeInfo: {
				nodeId: '',
		host: '',
		port: 0,
		selfUrl: '',
		about: '',
	},
};

const txBaseFields = [
	'from',
	'to',
	'value',
	'fee',
	'dateCreated',
	'data',
	'senderPubKey',
	'transactionDataHash',
	'senderSignature',
];

const txAllFields = [
	...txBaseFields,
	'minedInBlockIndex',
	'transferSuccessful',
];

const blockBaseFields = [
	'index',
	'transactions',
	'difficulty',
	'prevBlockHash',
	'minedBy',
	'blockDataHash',
	'nonce',
	'dateCreated',
	'blockHash',
];


const hexPattern = /^(0[xX])?[a-fA-F0-9]+$/;

module.exports = {
	CONFIG,
	txBaseFields,
	txAllFields,
	blockBaseFields,
	hexPattern,
	// txRequiredValues,
	// blockRequiredValues,
};
// export default {CONFIG, txBaseFields, txAllFields};
