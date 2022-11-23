const CONFIG = {
	// blockchain
	difficulty: {
		dynamic: true,
		starting: 4,
		// if dynamic, uses below settings
		limit: 7,
		targetBlockSeconds: 15,
		averageOverBlocks: 96,
		adjustmentRatio: 3,
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
		microcoinsPerCoin: 1000000,//1_000_000
	},
	transactions: {
		minFee: 10,
		safeConfirmCount: 6,
		spendUnconfirmedFunds: false,
	},
	genesisBlock: {},
	CHAIN_BIRTHDAY: new Date(2021, 9, 15).toISOString(),

	// blockchain??
	faucet: {
		mnemonic: 'flame renew maze sun piano sentence poet metal text name toast situate',
		privateKey:
			'1516726651051106b89d093cca3e887303610ac491b6c9a19a70fe5329fe57ab',
		publicKey:
			'cfe8495e9e582ec5c834bfd37e5f1ebc1559440558c74068513da1a64ff377b30',
		address: '00a5d9bf2555dfffc45f64386d612b46fce92dea',
		valueToGenerate: 1000000000000, // 1_000_000_000_000 === 1_000_000 * 1_000_000
		valuePerTransaction: 1000000, // 1_000_000
	},

	//blockchain and node??
	chainId: '',

	// node
	defaultServerHost: 'localhost',
	defaultServerPort: 5555,
	node: {
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
