// export interface IBlock {
// 	index: number;
// 	transactions: ITransaction[];
// 	difficulty: number;
// 	prevBlockHash: string;
// 	minedBy: string;
// 	blockDataHash: string;

const walletUtils = import('../../walletUtils/index.js');

// 	nonce: number | undefined;
// 	dateCreated: number | undefined;
// 	blockDataHash: string | undefined;
// }

// class Block implements IBlock {
// class Block implements IBlock{
// 	index: number;
// 	transactions: ITransaction[];
// 	difficulty: number;
// 	prevBlockHash: string;
// 	minedBy: string;
// 	blockDataHash: string;

// 	nonce: number | undefined;
// 	dateCreated: number | undefined;
// 	blockDataHash: string | undefined;
class Block {
	constructor(
		index,
		transactions,
		difficulty,
		prevBlockHash,
		minedBy,
		blockDataHash
	) {
		// constructor(
		// 	index: number,
		// 	transactions: ITransaction[],
		// 	difficulty: number,
		// 	prevBlockHash: string,
		// 	minedBy: string,
		// 	blockDataHash: string,

		// 	// three below are added separately once we have the data
		// 	// nonce,
		// 	// dateCreated,
		// 	// blockHash
		// ) {
		this.index = index;
		this.transactions = transactions;
		this.difficulty = difficulty;
		this.prevBlockHash = prevBlockHash;
		this.minedBy = minedBy;
		this.blockDataHash = blockDataHash;

		this.nonce = undefined;
		this.dateCreated = undefined;
		this.blockHash = undefined;
	}

	// What can block do?
	/* 
		Validate itself?
	*/
	hashMe() {
		return walletUtils.sha256Hash(this);
	}

	dataHash() {
		return walletUtils.sha256Hash(this.dataForHashing());
	}

	dataForHashing() {
		return {
			index: this.index,
			transactions: this.transactions,
			difficulty: this.difficulty,
			prevBlockHash: this.prevBlockHash,
			minedBy: this.minedBy,
		};
	}

	hasValidProof(difficulty = this.difficulty) {
		return  this.hashMe().slice(0, difficulty) === '0'.repeat(difficulty);
	}

}

module.exports = Block;
// export default Block;
