
// export interface IBlock {
// 	index: number;
// 	transactions: ITransaction[];
// 	difficulty: number;
// 	prevBlockHash: string;
// 	minedBy: string;
// 	blockDataHash: string;

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
    constructor(index, transactions, difficulty, prevBlockHash, minedBy, blockDataHash) {
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
}

module.exports = Block;
// export default Block;