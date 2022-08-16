export type Signature: String;

type Transaction = {
	from: string;
	to: string;
	value: number;
	fee: number;
	dateCreated: string;
	data: string;
	senderPubKefy: string;
	transactionDataHash: string;
	senderSignature: Array<Signature>;
	minedInBlockIndex: number;
	transferSuccessful: boolean;
};


export default Transaction;