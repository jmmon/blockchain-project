// import fetch from 'node-fetch'
// import crypto from "node:crypto"
const fetch = import("node-fetch");
const crypto = require("crypto");
const Transaction = require("./Transaction");
const Block = require('./Block');

const SHA256 = (message) =>
	crypto.createHash("sha256").update(message).digest("hex");

const sortObjectByKeys = (object) => {
	const sortedKeys = Object.keys(object).sort((a, b) => a - b);
	let newObject = {};
	sortedKeys.forEach((key) => (newObject[key] = object[key]));
	return newObject;
};






class Blockchain {
	constructor(config) {
		this.config = config;
		this.chain = [];
		this.pendingTransactions = [];
		this.nodes = new Set();
		this.miningJobs = new Map(); // blockDataHash => blockCandidate

		this.difficulty = this.config.startDifficulty;
		this.lastDifficulty = this.config.startDifficulty;

		this.lastBlockTimeEMA = this.config.targetBlockTimeSeconds;

		this.cumulativeDifficulty = 0; // initial value

		this.createGenesisBlock(); // create genesis block
	}

	reset() {
		this.chain = [this.chain[0]]; // save genesis block
		this.difficulty = this.config.startDifficulty;
		this.pendingTransactions = [];
		this.nodes = new Set();

		return true;
	}

	getPeersList() {
		return Array.from(this.nodes);
	}

	//calculate cumulative difficulty:
	//notes: difficulty for difficulty(p) === 16 * difficulty(p-1)
		//cumulativeDifficulty == how much effort spent to calculate it
		//cumulativeDifficulty == 16^d0 + 16^d1 + ... + 16^dn
		//where d0, d1, ... dn == difficulties of the individual blocks
	cumulateDifficultyFromLastBlock() {
		const lastBlockDifficulty = this.chain[this.chain.length - 1].difficulty;
		const addedDifficulty = this.cumulateDifficulty(lastBlockDifficulty);
		this.cumulativeDifficulty += addedDifficulty;
		console.log(`--Cumulative Difficulty: ${{lastBlockDifficulty, addedDifficulty, cumulativeDifficulty: this.cumulativeDifficulty}}`)

	}

	cumulateDifficulty(difficulty) {
		return 16 ** difficulty;
	}



	clearIncludedPendingTransactions(block) {
		const remainingTransactions = this.pendingTransactions.filter(tx => !block.transactions.includes(tx));
		
		console.log(`Pruning pending transactions...\n--------\nPending Transactions: ${JSON.stringify(this.pendingTransactions)}\n--------\nTransactions in Block: ${JSON.stringify(block.transactions)}\n--------\nRemaining Pending Transactions: ${JSON.stringify(remainingTransactions)}`);

		this.pendingTransactions = [...remainingTransactions];
	}



	//need to ONLY clear pending transactions which were included in the new block!
	addValidBlock(block) {
		this.clearIncludedPendingTransactions(block);

		this.chain.push(block);

		this.cumulateDifficultyFromLastBlock();
		this.clearMiningJobs();
		this.adjustDifficulty();
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
		// console.log('"mined" genesis block candidate:', minedBlockCandidate);

		// then we can build our final block with all the info, and push it to the chain

		const genesisBlock = {
			...new Block(
				0,
				[faucetFundingTransaction],
				0,
				"1",
				this.config.nullAddress,
				blockDataHash
			), 
			nonce: minedBlockCandidate.nonce, 
			dateCreated: minedBlockCandidate.dateCreated, 
			blockHash: minedBlockCandidate.blockHash
		};

		this.chain.push(genesisBlock);

		this.config.genesisBlock = genesisBlock;

		this.cumulateDifficultyFromLastBlock();

		//propagate block to peers?
	}


	createFaucetGenesisTransaction() {
		return this.createCoinbaseTransaction({
			to: this.config.faucetAddress,
			value: this.config.faucetGenerateValue,
			data: "genesis tx",
		});
	}


	createCoinbaseTransaction({
		from = this.config.nullAddress,
		to,
		value = this.config.blockReward + 350,
		fee = 0,
		dateCreated = new Date().toISOString(),
		data = "coinbase tx",
		senderPubKey = this.config.nullPublicKey,
		// transactionDataHash: get this inside our function
		senderSignature = this.config.nullSignature,
		minedInBlockIndex = this.chain.length,
		transferSuccessful = true,
	}) {
		return {
			...this.createTransaction(
				from,
				to,
				value,
				fee,
				dateCreated,
				data,
				senderPubKey,
				senderSignature
			),
			minedInBlockIndex: minedInBlockIndex,
			transferSuccessful: transferSuccessful
		};
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

		const sortedTransactionData = sortObjectByKeys({
			from,
			to,
			value,
			fee,
			dateCreated,
			data,
			senderPubKey,
		});

		return new Transaction(
			from,
			to,
			value,
			fee,
			dateCreated,
			data,
			senderPubKey,
			SHA256(JSON.stringify(sortedTransactionData)),
			senderSignature

			// last two "appear" only after transaction is mined
			// null, // minedInBlockIndex
			// null // transferSuccessful
		);

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

	

	async registerPeer({ nodeIdentifier, peerUrl }) {
		// if nodeId is already connected, don't try to connect again
		if (this.nodes.get(nodeIdentifier)) {
			return {status: 409, errorMsg: `Already connected to peer ${peerUrl}`};
		}

		console.log(`verifying peer's chainID...`);
		const response = await fetch(`${peerUrl}/info`);
		const peerInfo = await response.json();
		if (response.statusCode === 200) {
			const isSameChain = this.config.genesisBlock.chainId === peerInfo["chainId"];

			if (!isSameChain) {
				return {
					status: 400, 
					errorMsg: `Chain ID does not match!`, 
					thisChainId: ourChainId, 
					peerChainId
				};
			}
			console.log(`--verified!`);
		} else {
			return {status: 404, message: `Network error! Could not get peer's chainId!`};
		}
		
		console.log(`adding node to our list...`);
		this.nodes.add({
			[nodeIdentifier]: peerUrl,
		});
		console.log(`--added!`);

		//synchronize chain and pending transactions?
		syncPeerChain(peerInfo, peerUrl);


		// send request to other node to connect to our node
		console.log(`asking other node to friend us back...`)
		const otherNodeResponse = await requestPeer({ nodeIdentifier, peerUrl });
		if (otherNodeResponse.status === 200) {
			console.log(`--Other peer has connected to us!`);
		}
		if (otherNodeResponse.status === 409) {
			console.log(`--Other peer was ALREADY connected!`);
		}
		console.log(`--${{otherNodeResponse}}`);

		return {status: 200, message: `Connected to peer ${peerUrl}`}
	}



	async requestPeer({ nodeIdentifier, peerUrl }) {
		return await (await fetch(`${peerUrl}/peers/connect`, {
			method: "POST",
			body: JSON.stringify({nodeIdentifier, peerUrl}),
			headers: {'Content-Type': 'application/json'},
		})).json();
	}



	validateChain(chain) {
		//validate genesis block, should be exactly the same
		//validate each block from first to last:
				//validate that all block fields are present && with valid values
				//validate transactions in the block:
						//validate transaction fields and values; recalc transactionDataHash; validate signature;
						//re-execute all transactions?; re-calculate values of minedInBlockIndex and transferSuccessful fields;
				//recalculate blockDataHash && blockHash
				//ensure blockHash matches difficulty
				//validate prevBlockHash === hash of previous block
		//recalculate cumulative difficulty of incoming chain
				//if > this.cumulativeDifficulty:
						//replace current chain with incoming chain
						//clear all current mining jobs (they are invalid)

		//calculate cumulative difficulty: ????
		//(note: difficulty for difficulty(p) === 16 * difficulty(p-1))
		//cumulativeDifficulty == how much effort spent to calculate it
		//cumulativeDifficulty == 16^d0 + 16^d1 + ... + 16^dn
				//where d0, d1, ... dn == difficulties of the individual blocks
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

	async syncPeerChain(peerInfo, peerUrl) {
		console.log(`Attempting sync with new peer...`);
		if (peerInfo.cumulativeDifficulty > this.cumulativeDifficulty) {
			//download chain from /blocks
			//validate chain (blocks, transactions, etc??)
			//if valid, replace our chain and notify peers about the new chain??
		}


		const ourChainLength = this.chain.length;

		const response = await fetch(`${peerUrl}/blocks`);
		if (response.statusCode === 200) {
			const chain = await response.json();
			const length = chain.length;

			if (length > ourChainLength) {
				if (this.validateChain(chain)) {
					this.chain = chain;
					return true;

				} else {
					console.log(`Error: Peer chain is not valid`);
				}

			} else {
				// our chain is longer
				console.log(`--Our chain is longer`);
			}
		} else {
			console.log(`Error: cannot get peer chain`);
		}

		return false;
	}

	
	synchronizePendingTransactions(peerUrl) {
		//fetch /transactions/pending and append missing transactions
		// be sure to check for duplicated hashes!

	}

	// synchronizeChain() {
	// 	//Consensus Algo: replaces our chain with the longest one in the network.
	// 	//Returns true if chain was replaced; false if not (if we have the longest)

	// 	const neighbors = Array.from(this.nodes);
	// 	let newChain = null;

	// 	// must be longer than our chain
	// 	let maxLength = this.chain.length;

	// 	for (node in neighbors) {
	// 		const response = fetch(`http://${node}/chain`);
	// 		if (response.statusCode === 200) {
	// 			let length = response.json()["length"];
	// 			let chain = response.json()["chain"];

	// 			if (length > maxLength && this.validateChain(chain)) {
	// 				maxLength = length; // update our length to new longest
	// 				newChain = chain; // save the incoming chain
	// 			}
	// 		}
	// 	}

	// 	// update our chain if needed
	// 	if (newChain) {
	// 		this.chain = newChain;
	// 		return true;
	// 	}

	// 	return false;
	// }



	// static methods (exist on the class itself, not on an instantiation of the class)
	hash(block) {
		const sortedBlock = sortObjectByKeys(block);
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
		let timestamp = new Date().toISOString();
		let nonce = startingNonce;
		let data = block.blockDataHash + "|" + timestamp + "|" + nonce;
		let hash = SHA256(data);

		while (!this.validHash(hash, block.difficulty)) {
			timestamp = new Date().toISOString();
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


// Need to try again and reexamine exactly how DGW does it

// targetSpacing = 2.5 * 60 //2.5 minutes between blocks

/* 
darkGravityWave(blockIndex-pindexLast, blockHeader pblock) returns int
{
	//variables setup
	blockLastSolved = pindexLast
	blockReading = pindexLast
	blockCreating = pblock	
	actualTimespan = 0;
	lastBlockTime = 0;
	pastBlocksMin = 24;
	pastBlocksMax = 24;
	countBlock = 0;
	pastDifficultyAverage
	pastDifficultyAveragePrevious

	// check for odd cases at start of chain
	if (blockLastSolved == null 
		|| blockLastSolved.nHeight == 0 //genesis block 
		|| blockLastSolved.nHeight < pastBlocksMin) {
		return bnProofOfWorkLimit.getCompact(); // ???
	}

	// loop over past (pastBlocksaMax) blocks
	for (var i = 1; blockReading && blockReading.nheight > 0; i++) {
		if (pastBlocksMax > 0 && i > pastBlocksMax) {break; }

		countBlocks++;
		//calculate avg difficulty based on blocks we are iterating over
		if (countBlocks <= pastBlocksMin) {
			if (countBlocks == 1) {
				pastDifficultyAverage.setCompact(blockReading.nBits);
			} else {
				pastDifficultyAverage = ((pastDifficultyAveragePrev * countBlocks) + (cBigNum().setCompact(blockReading.nBits))) / (countBlocks + 1);
			}
			pastDifficultyAveragePrev = pastDifficultyAverage
		}
	

		//if this is second iteration (lastBlockTime was set)
		if (lastBlockTime > 0) {
			//calc time difference between prev block and current block
			difference = lastBlockTime - blockReading.getBlockTime();
			//increment actual timespan ??
			actualTimespan += difference;
		}

		//set lastBlockTime to block time for block in current iteration
		lastBlockTime = blockReading.getBlockTime();

		if (blockReading.prev == null) {
			assert(blockReading); 
			break;
		}

		blockReading = blockReading.prev;
	
	}

	//bnNew is the new difficulty
	bnNew(pastDifficultyAverage);

	//targetTimespan is time the countBlocks should have taken to be generated
	targetTimespan = countBlock * targetSpacing;

	//limit readjustment to 3x or 0.33x, don't increase diff too much
	if (actualTimespan < targetTimespan / 3) {
		actualTimespan = targetTimespan / 3;
	}
	if (actualTimespan > targetTimespan * 3) {
		actualTimespan = targetTimespan * 3;
	}

	//calculate new difficulty based on actual and target timespan
	bnNew *= actualTimespan;
	bnNew /= targetTimespan;

	//if calc difficulty is lower than minimalDiff, set to minimalDiff
	if (bnNew > bnProofOfWorkLimit) {
		bnNew = bnProofOfWorkLimit;
	}

	//logging

	//return new diff
	return bnNew.getCompact();
}
*/



	adjustDifficulty() { // simpler version

		console.log('DIFFICULTY ADJUST FUNCTION TESTING******');
		//adjust our ema weighted by this many blocks
		//  hours * 60 * 60 == seconds
		//  seconds / blockTimeInSeconds == maxBlocksToCheck
		const maxBlocksToCheck = this.config.hoursToAverageBlockTimeOver * 60 * 60 / this.config.targetBlockTimeSeconds;
		const k = 2 / (maxBlocksToCheck + 1);
		// difficultyEMA = blockTime(today) * k + difficultyEMA(lastBlock) * (1 - k)

		const thisBlockTime = this.getBlockTimeByIndex(this.getLastBlock().index);
		const lastBlockTime = this.getBlockTimeByIndex(this.getLastBlock().index - 1);
		let currentBlockTimeEMA = thisBlockTime * k + this.lastBlockTimeEMA * (1 - k);
		this.lastDifficulty = this.difficulty;
		console.log({currentBlockTimeEMA});
		if (currentBlockTimeEMA < this.config.targetBlockTimeSeconds) {
			// increase difficulty (by how much?)
			this.difficulty += 1;
			// console.log(`increment difficulty; new difficulty:${this.difficulty}`)
		}
		if (currentBlockTimeEMA > this.config.targetBlockTimeSeconds) {
			// decrease difficulty (by how much?)
			this.difficulty -= (this.difficulty > 1) ? 1 : 0;
			// console.log(`decrement difficulty; new difficulty:${this.difficulty}`)
		}
		const difference = (this.difficulty - this.lastDifficulty);
		console.log({maxBlocksToCheck, lastBlockTime, thisBlockTime, currentBlockTimeEMA, lastDifficulty: this.lastDifficulty, currentDifficulty: this.difficulty, difference, change: (difference > 0) ? `increment` : (difference == 0) ? `none` : `decrement`});
		this.lastBlockTimeEMA = currentBlockTimeEMA;
	}


	getBlockTimeByIndex(index) {
		if (index < 1) return this.config.targetBlockTimeSeconds;
		const thisBlockDateMs = Date.parse(this.chain[index].dateCreated);
		const prevBlockDateMs = Date.parse(this.chain[index - 1].dateCreated);
		return (thisBlockDateMs - prevBlockDateMs) / 1000;
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
				transactions,
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


	clearMiningJobs() {
		this.miningJobs.clear();
	}

	// check if new candidate index is higher than one of the saved ones; if so, wipe this.miningJobs
	// finally, add our new mining job
	saveMiningJob(block) {
		this.miningJobs.set(block.blockDataHash, block);

		console.log(
			`Mining job saved! Block candidate prepared for mining.\nCurrent mining jobs:${JSON.stringify(
				Array.from(this.miningJobs)
			)}`
		);
	}


	// getBlockTime(block) {
	// 	const blockIndex = block.index;
	// 	return this.getBlockTimeByIndex(blockIndex);
	// }



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

		if (!isValid) {
			return {status: 400, message: "Block hash is not valid!"};
		}
		
		const completeBlock = { ...foundBlock, nonce, dateCreated, blockHash };

		if (completeBlock.index < (this.chain.length )) {
			return {
				errorMsg: `Block not found or already mined`,
				message: `...Too slow! Block not accepted. Better luck next time!`,
				status: 404,
			};
		}

		this.addValidBlock(completeBlock);
		return {
			message: `Block accepted, reward paid: 500350 microcoins`,
			status: 200,
		};
	}



	addressIsValid(address) {
		if (address.length !== 40) return false;
		// other validations ....?
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
			const confirmedIncomingSafeTransactions = confirmedIncomingSuccessfulTransactions.filter(transaction => this.getTransactionConfirmations(transaction, chainTipIndex) >= this.config.safeConfirmCount)
			
			// add values to our balances
			confirmedIncomingSuccessfulTransactions.forEach(transaction => balances.confirmedBalance += transaction.value);
			confirmedIncomingSafeTransactions.forEach(transaction => balances.safeBalance += transaction.value);
		}
	
		const totalTheOutgoingConfirmedTransactions = (block) => {
			//	HANDLING TRANSACTIONS FROM OUR ADDRESS:
			// all transactions with >= 1 confirmation (i.e. in a mined block)
			const confirmedOutgoingSuccessfulTransactions = block.transactions.filter(transaction => transaction.from === address && transaction.transferSuccessful);
			// all transactions with >= 6 confirmations
			const confirmedOutgoingSafeTransactions = confirmedOutgoingSuccessfulTransactions.filter(transaction => this.getTransactionConfirmations(transaction, chainTipIndex) >= this.config.safeConfirmCount)
			
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
				if (this.getTransactionConfirmations(transaction, chainTipIndex) >= this.config.safeConfirmCount) {
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
		const transactions = [
			...this.getConfirmedTransactionsByAddress(address),
			...this.getPendingTransactionsByAddress(address)
		];

		// sort by parsed date string
		transactions.sort((a, b) => Date.parse(a.dateCreated) - Date.parse(b.dateCreated))

		return transactions
	}


	getConfirmedTransactionsByAddress(address) {
		let transactions = [];
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

	getPendingTransactions() {
		return this.pendingTransactions;
	}

	getConfirmedTransactions() {
		let transactions = [];
		for (const block of this.chain) {
			for (const transaction of block.transactions) {
				transactions.push(transaction);
			}
		}
		return transactions;
	}





	// list all accounts that have non-zero CONFIRMED balance (in blocks)
	// (The all-0's address - genesis address - will have a NEGATIVE balance)
	/**
	{
		00000...: -9999999,
		address1: 12345,
		address2: 1234,
		address3: 123, 
	}
	*/
	// for each block, go through each transaction
	// 	save addresses and balances in an array of objects; no need to sort
	// received coins: add value to {to: address} balance
	// sent coins: subtract value+fee from {from: address} balance

	getAllAccountBalances() {
		let balances = {};
		for (const block of this.chain) {
			for (const transaction of block.transactions) {
				const {from, to, value, fee} = transaction;
				//handle {to: address}
				if (to in balances) {
					balances[to] += value;
				} else {
					balances[to] = value;
				}

				//handle {from: address}
				if (from in balances) {
					balances[from] -= (fee + value);
				} else {
					balances[from] = 0 - (fee + value);
				}
			}
		}

		return balances;
	}
}

module.exports = Blockchain;
