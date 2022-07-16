// import fetch from 'node-fetch'
// import crypto from "node:crypto"
const fetch = import("node-fetch");
const crypto = require("crypto");

const SHA256 = (message) =>
	crypto.createHash("sha256").update(message).digest("hex");

const sortByObjectKeys = (object) => {
	const sortedKeys = Object.keys(object).sort((a, b) => a - b);
	let newObject = {};
	sortedKeys.forEach((key) => (newObject[key] = object[key]));
	return newObject;
};

class Block {
	constructor(
		index,
		transactions,
		difficulty,
		prevBlockHash,
		minedBy,
		blockDataHash,
		nonce,
		dateCreated,
		blockHash
		// blockTime,
	) {
		this.index = index;
		this.transactions = transactions;
		this.difficulty = difficulty;
		this.prevBlockHash = prevBlockHash.toString();
		this.minedBy = minedBy;
		this.blockDataHash = blockDataHash.toString();
		this.nonce = nonce;
		this.dateCreated = dateCreated;
		this.blockHash = blockHash.toString();
		// this.blockTime = blockTime;
	}
}

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
		senderSignature,
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
}

class Blockchain {
	constructor(difficulty = 5) {
		this.chain = [];
		this.pendingTransactions = [];
		this.nodes = new Set();
        this.blockReward = 5000350;

		this.difficulty = difficulty;
		this.lastDifficulty = difficulty;
		this.blockTimeGoal = 15; // seconds

		this.newBlock("1", 100); // create genesis block
	}

	reset() {
		this.chain = [this.chain[0]]; // save genesis block
		this.difficulty = 2;
		this.pendingTransactions = [];
		this.nodes = new Set();

		// // alternately
		// this.chain = [];
		// this.newBlock("1", 100); // create genesis block
		return true;
	}

	newBlock(previousHash = null, nonce = 0) {
		// const blockTime =
		const block = new Block(
			this.chain.length + 1,
			this.pendingTransactions,
			"receivedJob_Difficulty",
			previousHash || this.hash(this.chain[this.chain.length - 1]),
			"receivedJob_MinerAddress",
			"receivedJob_BlockDataHash",
			nonce,
			"receivedJob_DateCreated",
			"receivedJob_hash"
		);

		// const block = {
		// 	index: this.chain.length + 1,
		// 	timestamp: Date.now().toString(),
		// 	transactions: this.pendingTransactions,
		// 	proof: proof,
		// 	previousHash:
		// 		previousHash || this.hash(this.chain[this.chain.length - 1]),
		// };

		// reset pending transactions since they were added to our block
		this.pendingTransactions = [];

		this.chain.push(block);
		return block;
	}

	createTransaction({
		from,
		to,
		value,
		fee,
		dateCreated,
		data,
		senderPubKey,
		senderSignature,
	}) {
		// const nextBlockIndex = this.getLastBlock()["index"] + 1;
		// console.log('creating transaction');

		const sortedTransactionData = sortByObjectKeys({
			from,
			to,
			value,
			fee,
			dateCreated,
			data,
			senderPubKey,
		});

		const transactionDataHash = SHA256(
			JSON.stringify(sortedTransactionData)
		);

		const newTransaction = new Transaction(
			from,
			to,
			value,
			fee,
			dateCreated,
			data,
			senderPubKey,
			transactionDataHash,
			senderSignature,
			// last two "appear" only after transaction is mined
			// null, // minedInBlockIndex
			// null // transferSuccessful
		);

		this.pendingTransactions.push(newTransaction);

		return { transactionDataHash };
	}

	// // OLD
	// newTransaction(sender, recipient, amount) {
	// 	const nextBlockIndex = this.getLastBlock()["index"] + 1;
	// 	const dateCreated = Date.now().toString();
	// 	const data = "Faucet -- to || coinbase transaction || etc?"
	// 	const senderPubKey = `pubKey from ${sender}`;
	// 	const fee = 0;

	// 	const sortedTransactionData = sortByObjectKeys({
	// 		from: sender,
	// 		to: recipient,
	// 		value: amount,
	// 		fee,
	// 		dateCreated,
	// 		data,
	// 		senderPubKey
	// 	});

	// 	//txdatahash: from, to, value, fee, dateCreated, data, senderPubKey
	// 	const transactionDataHash = SHA256(JSON.stringify(sortedTransactionData));

	// 	this.pendingTransactions.push(
	// 		new Transaction(
	// 			sender,
	// 			recipient,
	// 			amount,
	// 			fee,
	// 			dateCreated,
	// 			data,
	// 			senderPubKey,
	// 			transactionDataHash,
	// 			`signature from ${sender}`,
	// 			// last two "appear" only after transaction is mined
	// 			null,
	// 			null
	// 		));

	// 	return nextBlockIndex;
	// }

	registerNode({nodeIdentifier, peerUrl}) {
		// const parsedUrl = new URL(peerUrl);
        // console.log('url input:', peerUrl, "\nparsed url:", parsedUrl);
        const peerObject = {
            [nodeIdentifier]: peerUrl
        };
		this.nodes.add(peerObject); //hostname and port


		const nodesList = [];
		this.nodes.forEach((node) => nodesList.push(node));
		console.log("node added\n" + JSON.stringify(nodesList));
	}

	validChain(chain) {
		let lastBlock = chain[0];
		let currentIndex = 1;

		while (currentIndex < chain.length) {
			const block = chain[currentIndex];
			console.log(lastBlock);
			console.log(block);
			console.log("\n--------\n");

			//check hash of previous block
			if (block["prevBlockHash"] !== this.hash(lastBlock)) {
				console.log("Previous hash does not match!");
				return false;
			}

			if (!this.validProof(block)) {
				console.log("Block PoW is Invalid!");
				return false;
			}

			lastBlock = block;
			currentIndex++;
		}

		return true;
	}

	resolveConflict() {
		//Consensus Algo: replaces our chain with the longest one in the network.
		//Returns true if chain was replaced; false if not (if we have the longest)

		const neighbors = this.nodes;
		let newChain = null;

		// must be longer than our chain
		let maxLength = this.chain.length;

		for (node in neighbors) {
			const response = fetch(`http://${node}/chain`);
			if (response.statusCode === 200) {
				let length = response.json()["length"];
				let chain = response.json()["chain"];

				if (length > maxLength && this.validChain(chain)) {
					maxLength = length; // update our length to new longest
					newChain = chain; // save the incoming chain
				}
			}
		}

		// update our chain if needed
		if (newChain) {
			this.chain = newChain;
			return true;
		}

		return false;
	}

	// static methods (exist on the class itself, not on an instantiation of the class)
	hash(block) {
		const sortedBlock = sortByObjectKeys(block);
		return SHA256(JSON.stringify(sortedBlock));
	}

	getLastBlock() {
		return this.chain[this.chain.length - 1];
	}

	proofOfWork(block) {
		// increase block nonce until block hash is valid
		while (!this.validProof(block)) {
			block["nonce"] += 1;
		}
	}

	validProof(block) {
		//check if hash starts with 4 zeros; 4 being the difficulty
		const isValid =
			this.hash(block).toString().slice(0, this.difficulty) ===
			"0".repeat(this.difficulty);
		return isValid;
	}

	getTransactionConfirmationCount(transaction, lastBlockIndex = getLastBlock().index) {
        // allow passing in last block index, so we don't need to call getLastBlock on every iteration
        
		const transactionBlockIndex = transaction?.minedInBlockIndex;

        //transaction is not confirmed (not mined)
		if (!transactionBlockIndex) return 0;
		
		// if block 10 is mined, and transaction happened in block 10, difference is 0 but confirmation is (+1);
		return lastBlockIndex - transactionBlockIndex + 1;
	}

    // Loosely based on Dark Gravity Wave
    //      uses an EMA over the last 240 blocks (1 hour == 15s * 240), and restricts each difficulty change occurrence to 3x or 0.33x
    // difficulty should be adjusted when?
    // AFTER a new block is added to the chain (most likely)
	adjustDifficulty() {
        //adjust our ema weighted by this many blocks
		const maxBlocksToCheck = 4 * 60; // supposed to be == 1 hour
		const k = 2 / (maxBlocksToCheck + 1);
		// difficultyEMA = blockTime(today) * k + difficultyEMA(lastBlock) * (1 - k)
		const maxDifficultyChange = 3;
		const minDifficultyChange = 0.33;
		const lastBlockTime = getLastBlock().blockTime; // TODO
		let newDifficulty = lastBlockTime * k + this.lastDifficulty * (1 - k);

		// check if it's within our change range, compared to current difficulty
		if (this.difficulty * maxDifficultyChange < newDifficulty) {
            newDifficulty = this.difficulty * maxDifficultyChange;
		}

		if (this.difficulty * minDifficultyChange > newDifficulty) {
            newDifficulty = this.difficulty * minDifficultyChange;
		}

        // we are now within range, so save the last value (for next time) and set our new value
        this.lastDifficulty = this.difficulty;
        this.difficulty = newDifficulty;
	}
}

module.exports = Blockchain;
