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
	faucetPrivateKey: "theFaucetPrivateKey",
	faucetPublicKey: "theFaucetPublicKey",
	faucetAddress: "theFaucetAddress -- send funds to this in genesis block!",
	faucetGenerateValue: 1000000000000,
	nullAddress: "0000000000000000000000000000000000000000",
	nullPublicKey:
		"00000000000000000000000000000000000000000000000000000000000000000",
	nullSignature: [
		"0000000000000000000000000000000000000000000000000000000000000000",
		"0000000000000000000000000000000000000000000000000000000000000000",
	],
	startDifficulty: 5,
	targetBlockTime: 15,
	minTransactionFee: 10,
	maxTransactionFee: 1000000,
	blockReward: 5000000,
	maxTransferValue: 10000000000000,
	safeConfirmCount: 6,
	genesisBlock: null, //added once we create it
};

class Block {
	constructor(
		index,
		transactions,
		difficulty,
		prevBlockHash,
		minedBy,
		blockDataHash

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
		// three below are added separately once we have the data

		// this.nonce = nonce;
		// this.dateCreated = dateCreated;
		// this.blockHash = blockHash;
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
}

class Blockchain {
	constructor() {
		this.config = CONFIG;
		this.chain = [];
		this.pendingTransactions = [];
		this.nodes = new Set();
		this.miningJobs = new Map(); // blockDataHash => blockCandidate

		this.difficulty = this.config.startDifficulty;
		this.lastDifficulty = this.config.startDifficulty;
		this.targetBlockTime = this.config.targetBlockTime; // in seconds

		this.createGenesisBlock(); // create genesis block
	}

	reset() {
		this.chain = [this.chain[0]]; // save genesis block
		this.difficulty = this.config.startDifficulty;
		this.pendingTransactions = [];
		this.nodes = new Set();

		return true;
	}



	//need to ONLY clear pending transactions which were included in the new block!
	addValidBlock(block) {
		const remainingTransactions = this.pendingTransactions.filter(tx => !block.transactions.includes(tx));
		
		console.log(`Adding valid block: pruning pending transactions...\n--------\nPending Transactions: ${JSON.stringify(this.pendingTransactions)}\n--------\nBlock includes transactions: ${JSON.stringify(block.transactions)}\n--------\nRemaining Pending Transactions: ${JSON.stringify(remainingTransactions)}`);

		this.pendingTransactions = [...remainingTransactions];
		this.chain.push(block);
	}




	createGenesisBlock() {
		const faucetFundingTransaction = this.createFaucetGenesisTransaction();

		const genesisBlockData = {
			index: 0,
			transactions: [faucetFundingTransaction],
			difficulty: 0,
			prevBlockHash: "1",
			minedBy: this.config.nullAddress,
		};
		const blockDataHash = SHA256(JSON.stringify(genesisBlockData));

		const genesisBlockCandidate = {
			index: genesisBlockData.index,
			transactionsIncluded: genesisBlockData.transactions.length,
			difficulty: genesisBlockData.difficulty,
			expectedReward: 0, // no mining reward (coinbase tx) on genesis block
			rewardAddress: null, // no coinbase tx, no reward address
			blockDataHash,
		};

		// next should "mine" the genesis block (hash it)

		const minedBlockCandidate = this.mineBlock(genesisBlockCandidate);
		console.log('"mined" genesis block candidate:', minedBlockCandidate);

		// then we can build our final block with all the info, and push it to the chain

		const genesisBlock = new Block(
			0,
			[faucetFundingTransaction],
			0,
			"1",
			this.config.nullAddress,
			blockDataHash
		);

		genesisBlock.nonce = minedBlockCandidate.nonce;
		genesisBlock.dateCreated = minedBlockCandidate.dateCreated;
		genesisBlock.blockHash = minedBlockCandidate.blockHash;

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
			senderSignature
			// last two "appear" only after transaction is mined
			// null, // minedInBlockIndex
			// null // transferSuccessful
		);

		// this.pendingTransactions.push (newTransaction);

		return newTransaction;
	}

	addPendingTransaction(transaction) {
		this.pendingTransactions.push(transaction);
	}

	findTransactionByHash(transactionDataHash) {
		for (const block of this.chain) {
			for (const transaction of block.transactions) {
				if (transaction?.transactionDataHash === transactionDataHash) {
					return transaction;
				}
			}
		}
		return false;
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
		dateCreated = Date.now().toISOString(),
		data = "coinbase tx",
		senderPubKey = this.config.nullPublicKey,
		// transactionDataHash: get this inside our function
		senderSignature = this.config.nullSignature,
		minedInBlockIndex = this.chain.length,
		transferSuccessful = true,
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
			senderSignature
		);
		newTransaction.minedInBlockIndex = minedInBlockIndex;
		newTransaction.transferSuccessful = transferSuccessful;

		return newTransaction;
	}

	registerNode({ nodeIdentifier, peerUrl }) {
		// const parsedUrl = new URL(peerUrl);
		// console.log('url input:', peerUrl, "\nparsed url:", parsedUrl);
		const peerObject = {
			[nodeIdentifier]: peerUrl,
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


	// increase block nonce until block hash is valid
	proofOfWork(block) {
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


	validHash(hash, difficulty = this.config.startDifficulty || 0) {
		return hash.slice(0, difficulty) === "0".repeat(difficulty);
	}


	mineBlock(block, startingNonce = 0) {
		let timestamp = Date.now().toISOString();
		let nonce = startingNonce;
		let data = block.blockDataHash + "|" + timestamp + "|" + nonce;
		let hash = SHA256(data);

		while (!this.validHash(hash, block.difficulty)) {
			timestamp = Date.now().toISOString();
			nonce += 1;
			data = block.blockDataHash + "|" + timestamp + "|" + nonce;
			hash = SHA256(data);
		}

		return {
			blockDataHash: block.blockDataHash,
			dateCreated: timestamp,
			nonce: nonce,
			blockHash: hash,
		};
	}




	validateBlockHash(timestamp, nonce, blockDataHash, difficulty, blockHash) {
		const data = blockDataHash + "|" + timestamp + "|" + nonce;
		const hash = SHA256(data);

		const isValidBlockHash = {
			hash: hash === blockHash,
			difficulty: this.validHash(hash, difficulty),
		};
		console.log("Validating mined block hash:", { isValidBlockHash });

		return this.validHash(hash, difficulty) && hash === blockHash;
	}




	getTransactionConfirmations(
		transaction,
		lastBlockIndex = this.getLastBlock().index
	) {
		const transactionBlockIndex = transaction?.minedInBlockIndex;
		if (!transactionBlockIndex) return 0;
		return (lastBlockIndex - transactionBlockIndex + 1); // if indexes are the same we have 1 confirmation
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
		const lastBlockTime = this.getBlockTimeByIndex(this.getLastBlock().index); // TODO
		let newDifficulty = lastBlockTime * k + this.lastDifficulty * (1 - k);

		// check if it's within our change range, compared to current difficulty
		if (this.difficulty * maxDifficultyChange < newDifficulty) {
			newDifficulty = this.difficulty * maxDifficultyChange;
		}

		if (this.difficulty * minDifficultyChange > newDifficulty) {
			newDifficulty = this.difficulty * minDifficultyChange;
		}

		newDifficulty = Math.round(newDifficulty); //can't have decimals
		
		if (newDifficulty !== this.difficulty) {
			const difference = newDifficulty - this.difficulty;
			console.log(`Adjusting difficulty:\nDifference: ${difference}\nNew Difficulty: ${newDifficulty}`);
		}

		// we are now within range, so save the last value (for next time) and set our new value
		this.lastDifficulty = this.difficulty;
		this.difficulty = newDifficulty;
	}


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
	//need to add transaction data: mark them as successful? Where? before block candidate is sent to miner? We would assume the miner's successful block would have successful transactions.
	prepareBlockCandidate(minerAddress, difficulty = this.difficulty) {
		const coinbaseTransaction = this.createCoinbaseTransaction({
			to: minerAddress,
		});
		const index = coinbaseTransaction.minedInBlockIndex;

		const prepareTransactions = (pendingTransactions, blockIndex) => {
			return pendingTransactions.map(txData => ({
				...txData, 
				transferSuccessful: true,
				minedInBlockIndex: blockIndex
			}));
		};

		const pendingTransactions = prepareTransactions(this.pendingTransactions, index);

		const transactions = [
			coinbaseTransaction, // prepend
			...pendingTransactions
		];
		
		const prevBlockHash = this.hash(this.chain[this.chain.length - 1]);

		const blockDataHash = SHA256(
			JSON.stringify({
				index,
				transactions,
				difficulty,
				prevBlockHash,
				minedBy: minerAddress,
			})
		);

		this.saveMiningJob(
			new Block(
				index,
				transactionList,
				difficulty,
				prevBlockHash,
				minerAddress,
				blockDataHash
			)
		);

		const blockCandidateResponse = {
			index,
			transactionsIncluded: transactions.length,
			difficulty,
			expectedReward: coinbaseTransaction.value,
			rewardAddress: minerAddress,
			blockDataHash,
		};

		return blockCandidateResponse;
	}



	// check if new candidate index is higher than one of the saved ones; if so, wipe this.miningJobs
	// finally, add our new mining job
	saveMiningJob(block) {
		const indexOfFirstSavedJob = this.miningJobs.get(
			this.miningJobs.keys().next().value
		).index;
		console.log("previous job index", indexOfFirstSavedJob);

		if (block.index > indexOfFirstSavedJob) {
			this.miningJobs.clear();
		}

		this.miningJobs.set(block.blockDataHash, block);

		console.log(
			`Mining job saved! Block candidate prepared for mining.\nCurrent mining jobs:${JSON.stringify(
				this.miningJobs
			)}`
		);
	}


	getBlockTimeByIndex(index) {
		if (index < 1) return 0;
		const thisBlockDateMs = Date.parse(this.chain[index].dateCreated);
		const prevBlockDateMs = Date.parse(this.chain[index - 1].dateCreated);
		return (thisBlockDateMs - prevBlockDateMs) / 1000;
	}


	getBlockTime(block) {
		const blockIndex = block.index;
		return this.getBlockTimeByIndex(blockIndex);
	}



	// step 1: find block candidate by its blockDataHash
	// step 2: verify hash and difficulty
	// step 3: if valid, add the new info to the block
	// step 4: check if block (index?) is not yet mined;
	// if not, we add our new verified block and propagate it! (notify other nodes so they may request it?)
	// if block is already mined, we were too slow so we return a sad error message!
	submitMinedBlock({ blockDataHash, dateCreated, nonce, blockHash }) {
		const foundBlock = this.miningJobs.get(blockDataHash);
		const isValid = this.validateBlockHash(
			dateCreated,
			nonce,
			blockDataHash,
			foundBlock.difficulty,
			blockHash
		);

		if (isValid) {
			foundBlock = { ...foundBlock, nonce, dateCreated, blockHash };
		}

		const response = {};
		if (foundBlock.index > (this.chain.length - 1)) {
			this.chain.addValidBlock(foundBlock);
			response = {
				...response,
				message: `Block accepted, reward paid: 500350 microcoins`,
				status: 200,
			};

		} else {
			response = {
				...response,
				errorMsg: `Block not found or already mined`,
				message: `...Too slow! Block not accepted. Better luck next time!`,
				status: 404,
			};
		}
		return response;
	}



	addressIsValid(address) {
		if (address.length !== 40) return false;
		// other validations ....
		return true;
	}





	//return balance of address	
	//	crawl blockchain and build balances of address

	// each successful RECEIVED transaction will ADD value
	// all SPENT transactions SUBTRACT the transaction fee
	// each successful SPENT transaction will SUBTRACT value

	// return {0, 0, 0} for non-active addresses (addresses with no transactions) ?? address must be valid but still does not appear??
	// return {status: 404, errorMsg: "Invalid address"} for invalid addresses

	//"safe" transactions == ones with >=6 confirmations
	//confirmed transactions == ones included in blocks
	//pending transactions == ALL transactions (i.e. confirmed transactions + pending transactions)



	// transactions with {to: ourAddress} && successful will add value
	// 	if transaction has >= 6 confirmations, add to safeBalance
	// 	if transaction has >= 1 confirmations, add to confirmedBalance

	//transactions with {from: ourAddress}:		
	//	if transaction has >= 6 confirmations:
	//     subtract fee from safeBalance
	//     if successful, also subtract value from safeBalance
	//	if transaction has >= 1 confirmations:
	//     subtract fee from confirmedBalance
	//     if successful, also subtract value from confirmedBalance

	// pending transactions: take confirmedBalance and:
	// (for pending transactions) if {to: ourAddress}:
	//		add to pendingBalance
	// (for pending transactions) if {from: ourAddress}: 
	//    subtract (fee + value) from pendingBalance
	oldGetBalancesOfAddress(address) {
		const chainTipIndex = this.getLastBlock().index;
		const balances = {
			safeBalance: 0,
			confirmedBalance: 0,
			pendingBalance: 0,
		};

		const totalTheIncomingConfirmedTransactions = (block) => {
			// check transactions in block (i.e. confirmed && safe):
			//	HANDLING TRANSACTIONS TO OUR ADDRESS:
			// all transactions with >= 1 confirmation (i.e. in a mined block)
			const confirmedIncomingSuccessfulTransactions = block.transactions.filter(transaction => transaction.to === address && transaction.transferSuccessful);
			// all transactions with >= 6 confirmations
			const confirmedIncomingSafeTransactions = confirmedIncomingSuccessfulTransactions.filter(transaction => this.getTransactionConfirmations(transaction, chainTipIndex) >= 6)
			
			// add values to our balances
			confirmedIncomingSuccessfulTransactions.forEach(transaction => balances.confirmedBalance += transaction.value);
			confirmedIncomingSafeTransactions.forEach(transaction => balances.safeBalance += transaction.value);
		}
	
		const totalTheOutgoingConfirmedTransactions = (block) => {
			//	HANDLING TRANSACTIONS FROM OUR ADDRESS:
			// all transactions with >= 1 confirmation (i.e. in a mined block)
			const confirmedOutgoingSuccessfulTransactions = block.transactions.filter(transaction => transaction.from === address && transaction.transferSuccessful);
			// all transactions with >= 6 confirmations
			const confirmedOutgoingSafeTransactions = confirmedOutgoingSuccessfulTransactions.filter(transaction => this.getTransactionConfirmations(transaction, chainTipIndex) >= 6)
			
			// subtract values && fees from our balances
			confirmedOutgoingSuccessfulTransactions.forEach(transaction => balances.confirmedBalance -= (transaction.fee + transaction.value));
			confirmedOutgoingSafeTransactions.forEach(transaction => balances.safeBalance -= (transaction.fee + transaction.value));
		}
	
		const totalThePendingTransactions = () => {
			const pendingIncomingTransactions = this.pendingTransactions.filter(transaction => transaction.to === address);
			pendingIncomingTransactions.forEach(transaction => balances.pendingBalance += transaction.value);
			
			const pendingOutgoingTransactions = this.pendingTransactions.filter(transaction => transaction.from === address);
			pendingOutgoingTransactions.forEach(transaction => balances.pendingBalance -= (transaction.fee + transaction.value));
	
			//finally, add the remaining balance of the address
			balances.pendingBalance += balances.confirmedBalance;
		}
	
		// handles all transactions with confirmations
		for (const block of this.chain) {
			totalTheIncomingConfirmedTransactions(block);
			totalTheOutgoingConfirmedTransactions(block);
		}
	
		// handle the pending transactions
		totalThePendingTransactions();
	
		console.log(`balances for address ${address}:\n${JSON.stringify(balances)}`);

		return balances;
	}


	getBalancesOfAddress(address) {
		const chainTipIndex = this.getLastBlock().index;
		const balances = {
			safeBalance: 0,
			confirmedBalance: 0,
			pendingBalance: 0,
		};

		const confirmedTransactions = this.getConfirmedTransactionsByAddress(address);

		balances.confirmedBalance = confirmedTransactions
			.reduce((acc, transaction) => {
				if (transaction.to === address && transaction.transferSuccessful) {
					return acc + transaction.value;
				}
				if (transaction.from === address) {
					if (transaction.transferSuccessful) {
						return acc - (transaction.value + transaction.fee);
					} else {
						return acc - transaction.fee;
					}
				}
			});

		balances.safeBalance = confirmedTransactions
			.reduce((acc, transaction) => {
				if (this.getTransactionConfirmations(transaction, chainTipIndex) >= 6) {
					if (transaction.to === address && transaction.transferSuccessful) {
						return acc + transaction.value;
					}
					if (transaction.from === address) {
						if (transaction.transferSuccessful) {
							return acc - (transaction.value + transaction.fee);
						} else {
							return acc - transaction.fee;
						}
					}
				}
				return acc;
			});

		const pendingTransactions = this.getPendingTransactionsByAddress(address);
		balances.pendingBalance = balances.confirmedBalance + pendingTransactions
			.reduce((acc, transaction) => {
				if (transaction.to === address) {
					return acc + transaction.value;
				}
				if (transaction.from === address) {
					return acc - (transaction.value + transaction.fee);
				}
			});

		console.log(`balances (v2) for address ${address}:\n${JSON.stringify(balances)}`);
		

		// for testing, double check against previous version (hopefully it's correct lol)
		const transactionBalancesByAddressV1 = this.oldGetBalancesOfAddress(address);
		console.log(`balances (v1) for address ${address}:\n${JSON.stringify(transactionBalancesByAddressV1)}`);


		return balances;
	}

	




	//return transactions array of address
	//	crawl blockchain and build transaction list related to address

	//returns ALL transactions associated with the given address
	// (confirmed regardless of successful; && pending transactions)
	// sort transactions by "date and time" (ascending)
	// pending transactions will not have "minedInBlockIndex"
	getTransactionsByAddress(address) {
		const transactions = this.getConfirmedTransactionsByAddress(address);

		transactions = [
			...transactions, // keep previous ones
			...this.getPendingTransactionsByAddress(address)
		];

		// sort by parsed date string
		transactions.sort((a, b) => Date.parse(a.dateCreated) - Date.parse(b.dateCreated))

		return transactions
	}

	getConfirmedTransactionsByAddress(address) {
		const transactions = [];
		for (const block of this.chain) {
			transactions = [
				...transactions, // keep previous ones
				...block.transactions.filter(transaction => transaction.to === address || transaction.from === address) // add new ones
			];
		}
		return transactions;
	}

	getPendingTransactionsByAddress(address) {
		return this.pendingTransactions.filter(transaction => transaction.to === address || transaction.from === address)
	}

}

module.exports = Blockchain;
