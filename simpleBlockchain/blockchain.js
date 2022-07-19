const crypto = require("crypto");
const SHA256 = (message) => crypto.createHash('sha256').update(message).digest('hex');

class Block {
	constructor(timestamp = "", data = []) {
		this.timestamp = timestamp;
		this.data = data;
		this.hash = this.getHash();
		this.prevHash = "";
		this.nonce = 0;
	}

	getHash() {
		// hash takes our nonce, previous block hash, current timestamp, and the block data.
		return SHA256(this.prevHash + this.timestamp + JSON.stringify(this.data) + this.nonce);
	}

	mine(difficulty) {
		// attempt to mine! Match string of 0's at the start of the hash, depending on difficulty.
		while (!this.hash.startsWith(Array(difficulty + 1).join("0"))) {
			// While incorrect, try again! increase nonce and set the hash to the new hash.
			this.nonce++;
			this.hash = this.getHash();

		}
	}
}


class Blockchain {
	constructor() {
		this.chain = [new Block(Date.now().toISOString())];
		this.difficulty = 1;
	}

	getLastBlock() {
		return this.chain[this.chain.length - 1];
	}

	addBlock(block) {
		block.prevHash = this.getLastBlock().hash; // set the previous block hash
		block.hash = block.getHash();
		block.mine(this.difficulty); // must mine the block before it's added!

		// freeze block for immutability
		this.chain.push(Object.freeze(block));
	}

	isValid(blockchain = this) {
		// start at the second block (first after genesis) and validate each block
		for (let i = 1; i < this.chain.length; i++) {
			const currentBlock = blockchain.chain[i];
			const prevBlock = blockchain.chain[i-1];

			const isNotValid_CurrentBlockHash = (currentBlock.hash !== currentBlock.getHash());
			const isNotValid_PreviousBlockHash = (prevBlock.hash !== currentBlock.prevHash);
			if (isNotValid_CurrentBlockHash || isNotValid_PreviousBlockHash) {
				return false;
			}
		}

		return true;
	}
}


module.exports = { Block, Blockchain };