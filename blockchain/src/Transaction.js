// export interface ITransaction {
// 		from: string;
// 		to: string;
// 		value: number;
// 		fee: number;
// 		dateCreated: number;
// 		data: string;
// 		senderPubKey: string;
// 		transactionDataHash: string;
// 		senderSignature: string;

// 		minedInBlockIndex: number | undefined;
// 		transferSuccessful: boolean | undefined;
// }

// declare class Transaction implements ITransaction {
// class Transaction implements ITransaction {
class Transaction {
	// from: string;
	// to: string;
	// value: number;
	// fee: number;
	// dateCreated: number;
	// data: string;
	// senderPubKey: string;
	// transactionDataHash: string;
	// senderSignature: string;
	// minedInBlockIndex: number | undefined;
	// transferSuccessful: boolean | undefined;
	constructor(
		from,
		to,
		value,
		fee,
		dateCreated,
		data,
		senderPubKey,
		transactionDataHash,
		senderSignature
		// from: string,
		// to: string,
		// value: number,
		// fee: number,
		// dateCreated: number,
		// data: string,
		// senderPubKey: string,
		// transactionDataHash: string,
		// senderSignature: string

		// last two "appear" only after transaction is mined
		// minedInBlockIndex,
		// transferSuccessful
	) {
		this.from = from;
		this.to = to;
		this.value = value;
		this.fee = fee;
		this.dateCreated = dateCreated;
		this.data = data;
		this.senderPubKey = senderPubKey;
		this.transactionDataHash = transactionDataHash;
		this.senderSignature = senderSignature;
		this.minedInBlockIndex = undefined;
		this.transferSuccessful = undefined;

		// this.minedInBlockIndex = minedInBlockIndex;
		// this.transferSuccessful = transferSuccessful;
	}

	// What is a transaction? WWhat can a transaction do?
	/* 
	Split this logic into the transaction? Or probably just keep it in the chain.
		- Validate itself
				Validate fields
				Validate values
				Validate recalculated txDataHash,
				validate signature
	*/
}

module.exports = Transaction;
// export default Transaction;
