// interface ICONFIG {
// 	defaultServerHost: string;
// 	defaultServerPort: number;
// 	faucetPrivateKey: string;
// 	faucetPublicKey: string;
// 	faucetAddress: string;
// 	faucetGenerateValue: number;
// 	nullAddress: string;
// 	nullPublicKey: string;
// 	nullSignature: string[];
// 	startDifficulty: number;
// 	targetBlockTimeSeconds: number;
// 	difficultyOverPastBlocks: number;
// 	difficultyAdjustmentRatio: number;
// 	difficultyLimit: number;
// 	minTransactionFee: number;
// 	maxTransactionFee: number;
// 	blockReward: number;
// 	maxTransferValue: number;
// 	safeConfirmCount: number;
// };
// const CONFIG: ICONFIG = {
// const CONFIG: IConfig = {
const CONFIG = {
	defaultServerHost: 'localhost',
	defaultServerPort: 5555,
	faucetPrivateKey:
		'51a8bbf1192e434f8ff2761f95ddf1ba553447d2c1decd92cca2f43cd8609574',
	faucetPublicKey:
		'46da25d657a170c983dc01ce736094ef11f557f8a007e752ac1eb1f705e1b9070',
	faucetAddress: 'eae972db2776e38a75883aa2c0c3b8cd506b004d',
	faucetGenerateValue: 1000000000000,
	nullAddress: '0000000000000000000000000000000000000000',
	nullPublicKey:
		'00000000000000000000000000000000000000000000000000000000000000000',
	nullSignature: [
		'0000000000000000000000000000000000000000000000000000000000000000',
		'0000000000000000000000000000000000000000000000000000000000000000',
	],
	startDifficulty: 4,
	targetBlockTimeSeconds: 4,
	difficultyOverPastBlocks: 96,
	difficultyAdjustmentRatio: 3,
	difficultyLimit: 7,
	minTransactionFee: 10,
	maxTransactionFee: 1000000,
	blockReward: 5000000,
	maxTransferValue: 10000000000000,
	safeConfirmCount: 6,
	genesisBlock: undefined,
	SPEND_UNCONFIRMED_FUNDS: false,
	CHAIN_BIRTHDAY: new Date(2021, 9, 15).toISOString(),
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

// const blockRequiredValues = {};

// const txRequiredValues = {
// 	from: [],
// 	to: null,
// 	value: null,
// 	fee: null,
// 	dateCreated: null,
// 	data: null,
// 	senderPubKey: null,
// 	transactionDataHash: null,
// 	senderSignature: null,
// 	minedInBlockIndex: null,
// 	transferSuccessful: null,
// 	// from() {
// 	//     // do validation
// 	//     return true;
// 	// },
// 	// to() {
// 	//     // do validation
// 	//     return true;
// 	// },
// 	// // etc?
// };

const hexPattern = /^(0[xX])?[a-fA-F0-9]+$/g;

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
