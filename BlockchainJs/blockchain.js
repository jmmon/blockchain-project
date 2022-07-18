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






/** CONSTANTS */
const CONFIG = {
	defaultServerHost: "localhost",
	defaultServerPort: "5555",
	faucetPrivateKey: 'theFaucetPrivateKey',
	faucetPublicKey: 'theFaucetPublicKey',
	faucetAddress: 'theFaucetAddress -- send funds to this in genesis block!',
	faucetGenerateValue: 1000000000000,
	nullAddress: "0000000000000000000000000000000000000000",
	nullPublicKey: "00000000000000000000000000000000000000000000000000000000000000000",
	nullSignature: [
		"0000000000000000000000000000000000000000000000000000000000000000",
		"0000000000000000000000000000000000000000000000000000000000000000"
	],
	startDifficulty: 5,
	targetBlockTime: 15,
	minTransactionFee: 10,
	maxTransactionFee: 1000000,
	blockReward: 5000000,
	maxTransferValue: 10000000000000,
	safeConfirmCount: 3,
	genesisBlock: null, //added once we create it
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
		this.prevBlockHash = prevBlockHash;
		this.minedBy = minedBy;
		this.blockDataHash = blockDataHash;
		this.nonce = nonce;
		this.dateCreated = dateCreated;
		this.blockHash = blockHash;
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
	constructor() {
		this.config = CONFIG;
		this.chain = [];
		this.pendingTransactions = [];
		this.nodes = new Set();
		this.miningJobs = {
			// holds block candidates for next block, for each mining request;
		};

		this.difficulty = this.config.startDifficulty;
		this.lastDifficulty = this.config.startDifficulty;
		this.targetBlockTime = this.config.targetBlockTime // in seconds

		this.createGenesisBlock(); // create genesis block
	}

	reset() {
		this.chain = [this.chain[0]]; // save genesis block
		this.difficulty = this.config.startDifficulty;
		this.pendingTransactions = [];
		this.nodes = new Set();

		return true;
	}

	newBlock(previousHash = null, nonce = 0) {
		const block = new Block(
			this.chain.length,
			this.pendingTransactions,
			"receivedJob_Difficulty",
			previousHash || this.hash(this.chain[this.chain.length - 1]),
			"receivedJob_MinerAddress",
			"receivedJob_BlockDataHash",
			nonce,
			"receivedJob_DateCreated",
			"receivedJob_hash"
		);

		this.pendingTransactions = [];
		this.chain.push(block);
		return block;
	}

	createGenesisBlock() {
		const faucetFundingTransaction = this.createFaucetGenesisTransaction();

		const genesisBlockData = {
			index: 0,
			transactions: [faucetFundingTransaction],
			difficulty: 0,
			prevBlockHash: "1",
			minedBy: this.config.nullAddress
		};
		const blockDataHash = SHA256(JSON.stringify(genesisBlockData));

		const genesisBlockCandidate = {
			index: genesisBlockData.index,
			transactionsIncluded: genesisBlockData.transactions.length,
			difficulty: genesisBlockData.difficulty,
			expectedReward: 0, // no mining reward (coinbase tx) on genesis block
			rewardAddress: null, // no coinbase tx, no reward address
			blockDataHash
		};

		
		// next should "mine" the genesis block (hash it)

		const validProof = (hash, difficulty = genesisBlockData.difficulty || 0) => {
			return hash.slice(0, difficulty) === "0".repeat(difficulty);
		}

		const mineBlock = (block) => {
			let timestamp = Date.now().toString();
			let nonce = 0;
			let data = block.blockDataHash+"|"+timestamp+"|"+nonce;
			let hash = SHA256(data);
			
			while (!validProof(hash, block.difficulty)) {
				timestamp = Date.now().toString();
				nonce += 1;
				data = block.blockDataHash+"|"+timestamp+"|"+nonce;
				hash = SHA256(data);
			}

			return {
				blockDataHash: block.blockDataHash,
				dateCreated: timestamp,
				nonce: nonce,
				blockHash: hash,
			};
		}

		const minedBlockCandidate = mineBlock(genesisBlockCandidate);
		console.log('"mined" genesis block candidate:', minedBlockCandidate);

		// then we can build our final block with all the info, and push it to the chain

		const genesisBlock = new Block(
			0,
			[faucetFundingTransaction],
			0,
			"1",
			this.config.nullAddress,
			blockDataHash,

			minedBlockCandidate.nonce,
			minedBlockCandidate.dateCreated,
			minedBlockCandidate.blockHash 
		);

		this.chain.push(genesisBlock);

		this.config.genesisBlock = genesisBlock;

		//propagate block to peers?
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


	createFaucetGenesisTransaction() {
		return this.createCoinbaseTransaction({
			to: this.config.faucetAddress,
			value: this.config.faucetGenerateValue,
			data: "genesis tx",
		});
	}

	// index 0 == genesis block
	// next block index == chain.length

	createCoinbaseTransaction({
		from = this.config.nullAddress,
		to,
		value = this.config.blockReward + 350,
		fee = 0,
		dateCreated = Date.now().toString(),
		data = "coinbase tx",
		senderPubKey = this.config.nullPublicKey,
		// transactionDataHash: get this inside our function
		senderSignature = this.config.nullSignature,
		minedInBlockIndex = this.chain.length,
		transferSuccessful = true
	}) {

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
		);
		newTransaction.minedInBlockIndex = minedInBlockIndex;
		newTransaction.transferSuccessful = transferSuccessful;
		
		return newTransaction;
	}



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


	
	prepareBlockCandidate(minerAddress) {
		// STEP 1: prepare coinbase tx paying the minerAddress; stick in a temporary transactions list
		// STEP 2: add pendingTransactions to our transactions list
		// STEP 3: build our data needed for blockDataHash;
		// sha256(JSON(block fields in order[index, transactions, difficulty, prevBlockHash, minedBy]))
		// STEP 4: hash the data;
		// STEP 5: prepare final response to send back to the miner

		// const blockCandidate = {
		// 	index: index of next block
		// 	transactionsIncluded: # of transactions in next block
		// 	difficulty: difficulty of next block
		// 	expectedReward: blockReward,
		// 	rewardAddress: minerAddress,
		// 	blockDataHash
		// };

		//step 1
		const coinbaseTransaction = this.createCoinbaseTransaction({to:minerAddress});

		//step 2
		const transactionList = [coinbaseTransaction, ...this.pendingTransactions]

		// step 3
		const blockData = {
			index: coinbaseTransaction.minedInBlockIndex,
			transactions: transactionList,
			difficulty: this.difficulty,
			prevBlockHash: this.hash(this.chain[this.chain.length - 1]),
			minedBy: minerAddress,
		};

		// step 4
		const blockDataHash = SHA256(JSON.stringify(blockData));

		//step 5:
		const blockCandidate = {
			index: coinbaseTransaction.minedInBlockIndex,
			transactionsIncluded: transactionList.length,
			difficulty: this.difficulty,
			expectedReward: coinbaseTransaction.value,
			rewardAddress: minerAddress,
			blockDataHash
		};

		this.saveMiningJob(blockCandidate);

		console.log(`Mining job created! Block candidate prepared for mining.\nCurrent mining jobs:${JSON.stringify(this.miningJobs)}`);

		return blockCandidate;
	}




	saveMiningJob(blockCandidate) {
		//get old jobs biggest index
		// check if new candidate is higher index
		// if so, wipe this.miningJobs
		
		// finally, add our new mining job

		const indexArrayFromOldMiningJobs = Object.values(this.miningJobs).map(blockCandidate => blockCandidate.index).sort((a, b) => b - a);
		console.log({indexArrayFromOldMiningJobs});

		const biggestIndex = indexArrayFromOldMiningJobs[0];

		if (blockCandidate.index > biggestIndex) {
			this.miningJobs = {};
		}

		this.miningJobs[blockCandidate.blockDataHash] = blockCandidate;
	}


}

module.exports = Blockchain;
