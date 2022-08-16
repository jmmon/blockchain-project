declare interface ITransaction {
	from: string;
	to: string;
	value: number;
	fee: number;
	dateCreated: string;
	data: string;
	senderPubKefy: string;
	transactionDataHash: string;
	senderSignature: string[];
	minedInBlockIndex: number;
	transferSuccessful: boolean;
}


declare interface IBlock {
	index: number;
	transactions: ITransaction[];
	difficulty: number;
	prevBlockHash: string;
	minedBy: string;
	blockDataHash: string;
	nonce: number;
	dateCreated: string;
	blockHash: string;
}