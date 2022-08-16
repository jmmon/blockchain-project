export type ISignature: String;

type ITransaction = {
	from: string;
	to: string;
	value: number;
	fee: number;
	dateCreated: string;
	data: string;
	senderPubKefy: string;
	transactionDataHash: string;
	senderSignature: Array<ISignature>;
	minedInBlockIndex: number;
	transferSuccessful: boolean;
};


export default ITransaction;