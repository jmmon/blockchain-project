const CONFIG = {
	defaultServerHost: "localhost",
	defaultServerPort: "5555",
	faucetPrivateKey: "theFaucetPrivateKey",
	faucetPublicKey: "theFaucetPublicKey",
	faucetAddress: "theFaucetAddress -- send funds to this in genesis block!",
	faucetGenerateValue: 1000000000000,
	nullAddress: "0000000000000000000000000000000000000000",
	nullPublicKey:
		"00000000000000000000000000000000000000000000000000000000000000000",
	nullSignature: [
		"0000000000000000000000000000000000000000000000000000000000000000",
		"0000000000000000000000000000000000000000000000000000000000000000",
	],
	startDifficulty: 5,
	targetBlockTime: 15,
	minTransactionFee: 10,
	maxTransactionFee: 1000000,
	blockReward: 5000000,
	maxTransferValue: 10000000000000,
	safeConfirmCount: 6,
	genesisBlock: null, //added once we create it
};

module.exports = CONFIG;