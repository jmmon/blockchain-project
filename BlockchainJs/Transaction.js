class Transaction {
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
		
		// this.minedInBlockIndex = minedInBlockIndex;
		// this.transferSuccessful = transferSuccessful;
	}
};

module.exports = Transaction;