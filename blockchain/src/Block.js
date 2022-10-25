// export interface IBlock {
// 	index: number;
// 	transactions: ITransaction[];
// 	difficulty: number;
// 	prevBlockHash: string;
// 	minedBy: string;
// 	blockDataHash: string;

const { SHA256 } = require('../../libs/hashing.js');

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
		blockDataHash = '',
		nonce = undefined,
		dateCreated = undefined,
		blockHash = undefined
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

		this.nonce = nonce;
		this.dateCreated = dateCreated;
		this.blockHash = blockHash;
	}

	// What can block do?
	/* 
		Validate itself?
	*/
	hash() {
		this.blockHash = SHA256(
			`${this.blockDataHash}|${this.dateCreated}|${this.nonce}`
		);
		return this.blockHash;
	}

	coinbaseTransaction() {
		return this.transactions.filter((txn) => txn.data === 'coinbase tx')[0];
	}

	hashData() {
		this.blockDataHash = SHA256(this.dataForHashing());
		return this.blockDataHash;
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

	prepareMiningJobResponse(genesis = false) {
		const coinbaseTx = genesis
			? {
					value: 0,
					to: null,
			  }
			: this.coinbaseTransaction();
		console.log({ coinbaseTx });
		return {
			index: this.index,
			transactionsIncluded: this.transactions.length,
			difficulty: this.difficulty,
			expectedReward: coinbaseTx.value,
			rewardAddress: coinbaseTx.to,
			blockDataHash: this.blockDataHash,
		};
	}

	hasValidProof(difficulty = this.difficulty) {
		if (this.blockHash)
			return (
				this.blockHash.slice(0, difficulty) === '0'.repeat(difficulty)
			);
		return this.hash().slice(0, difficulty) === '0'.repeat(difficulty);
	}
}

module.exports = Block;
// export default Block;
