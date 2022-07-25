const CONFIG = {
	defaultServerHost: "localhost",
	defaultServerPort: 5555,
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
	
	startDifficulty: 4,
	targetBlockTimeSeconds: 4,
	difficultyOverPastBlocks: 96,
	difficultyAdjustmentRatio: 3,
	difficultyLimit: 7, // mainly for testing

	minTransactionFee: 10,
	maxTransactionFee: 1000000,
	blockReward: 5000000,
	maxTransferValue: 10000000000000,
	safeConfirmCount: 6,
	//genesis block added once created;
};

module.exports = CONFIG;