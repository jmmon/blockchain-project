declare class Transaction {
		from: string;
		to: string;
		value: number;
		fee: number;
		dateCreated: number;
		data: string;
		senderPubKey: string;
		transactionDataHash: string;
		senderSignature: string;

		minedInBlockIndex: number | undefined;
		transferSuccessful: boolean | undefined;
}

declare interface IBlock {
	index: number;
	transactions: ITransaction[];
	difficulty: number;
	prevBlockHash: string;
	minedBy: string;
	blockDataHash: string;

	nonce: number | undefined;
	dateCreated: number | undefined;
	blockDataHash: string | undefined;
}

declare interface IConfig {
	defaultServerHost: string;
	defaultServerPort: number;
	faucetPrivateKey: string;
	faucetPublicKey: string;
	faucetAddress: string;
	faucetGenerateValue: number;
	nullAddress: string; 
	nullPublicKey: string;
	nullSignature: string[];	
	startDifficulty: number; 
	targetBlockTimeSeconds: number;
	difficultyOverPastBlocks: number;
	difficultyAdjustmentRatio: number;
	difficultyLimit: number; 
	minTransactionFee: number;
	maxTransactionFee: number;
	blockReward: number;
	maxTransferValue: number;
	safeConfirmCount: number;
	genesisBlock: IBlock | undefined;
}

declare interface IBlockchain {
		config: IConfig;
		chain: IBlock[];
		pendingTransactions: ITransaction[];
		peers: Object;
		miningJobs: Object;
		difficulty: Number;
		cumulativeDifficulty: Number;

}