const CONFIG = {
	defaultServerHost: "localhost",
	defaultServerPort: 5555,
	faucetPrivateKey: "51a8bbf1192e434f8ff2761f95ddf1ba553447d2c1decd92cca2f43cd8609574",
	faucetPublicKey: "46da25d657a170c983dc01ce736094ef11f557f8a007e752ac1eb1f705e1b9070",
	faucetAddress: "eae972db2776e38a75883aa2c0c3b8cd506b004d",
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