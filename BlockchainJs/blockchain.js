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
		minedInBlockIndex,
		transferSuccessful
	) {
		this.from = from;
		this.to = to;
		this.value = value;
		this.fee = fee;
		this.dateCreated = dateCreated;
		this.data = data;
		this.senderPubKey = senderPubKey;
		this.transactionDataHash = transactionDataHash.toString();
		this.senderSignature = senderSignature;
		this.minedInBlockIndex = minedInBlockIndex;
		this.transferSuccessful = transferSuccessful;
	}
}

class Blockchain {
	constructor() {
		this.chain = [];
		this.difficulty = 2;
		this.pendingTransactions = [];
		this.nodes = new Set();

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
		const block = new Block(
			this.chain.length+1,
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


	createTransaction({from, to, value, fee, dateCreated, data, senderPubKey, senderSignature}) {
		const nextBlockIndex = this.getLastBlock()["index"] + 1;

		const sortedTransactionData = sortByObjectKeys({
			from,
			to,
			value,
			fee,
			dateCreated,
			data,
			senderPubKey
		});

		const transactionDataHash = SHA256(JSON.stringify(sortedTransactionData));

		this.pendingTransactions.push(
			new Transaction(
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
				null, // minedInBlockIndex
				null  // transferSuccessful
			));

		// return nextBlockIndex;
	}


	// OLD
	newTransaction(sender, recipient, amount) {
		const nextBlockIndex = this.getLastBlock()["index"] + 1;
		const dateCreated = Date.now().toString();
		const data = "Faucet -- to || coinbase transaction || etc?"
		const senderPubKey = `pubKey from ${sender}`;
		const fee = 0;

		const sortedTransactionData = sortByObjectKeys({
			from: sender,
			to: recipient,
			value: amount,
			fee,
			dateCreated,
			data,
			senderPubKey
		});

		//txdatahash: from, to, value, fee, dateCreated, data, senderPubKey
		const transactionDataHash = SHA256(JSON.stringify(sortedTransactionData));

		this.pendingTransactions.push(
			new Transaction(
				sender,
				recipient,
				amount,
				fee,
				dateCreated,
				data,
				senderPubKey,
				transactionDataHash,
				`signature from ${sender}`,
				// last two "appear" only after transaction is mined
				null,
				null 
			));

		return nextBlockIndex;
	}

	registerNode(nodeUrl) {
		const parsedUrl = new URL(nodeUrl);
		this.nodes.add(parsedUrl.host); //hostname and port
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
		const isValid = this.hash(block).toString().slice(0, this.difficulty) ===
		"0".repeat(this.difficulty);
		return isValid;
	}
}

module.exports = Blockchain;
