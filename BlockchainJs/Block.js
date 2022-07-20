class Block {
	constructor(
		index,
		transactions,
		difficulty,
		prevBlockHash,
		minedBy,
		blockDataHash

		// three below are added separately once we have the data
		// nonce,
		// dateCreated,
		// blockHash
	) {
		this.index = index;
		this.transactions = transactions;
		this.difficulty = difficulty;
		this.prevBlockHash = prevBlockHash;
		this.minedBy = minedBy;
		this.blockDataHash = blockDataHash;

		// this.nonce = nonce;
		// this.dateCreated = dateCreated;
		// this.blockHash = blockHash;
	}
}

module.exports = Block;