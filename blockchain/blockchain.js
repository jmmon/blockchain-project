const {	
	generateWallet,
	encrypt,
	decrypt,
	deriveKeysFromMnemonic,
	signTransaction,
	hashTransaction,
	getAddressFromCompressedPubKey,
	decryptAndSign,
	submitTransaction,
	fetchAddressBalance,
	verifySignature,
	CONSTANTS,
} = import('../walletUtils/index.js');
const fetch = import("node-fetch");
const crypto = require("crypto");
const Transaction = require("./classes/Transaction");
const Block = require("./classes/Block");

const SHA256 = (message) =>
	crypto.createHash("sha256").update(message).digest("hex");

// const sortObjectByKeys = (object) => {
// 	const sortedKeys = Object.keys(object).sort((a, b) => a - b);
// 	let newObject = {};
// 	sortedKeys.forEach((key) => (newObject[key] = object[key]));
// 	return newObject;
// };


class Blockchain {
	constructor(config = require("./config")) {
		this.config = config;
		this.chain = [];
		this.pendingTransactions = [];
		this.peers = new Set();
		this.miningJobs = new Map(); // blockDataHash => blockCandidate
		this.difficulty = this.config.startDifficulty;
		this.cumulativeDifficulty = 0; // initial value
		this.createGenesisBlock(); // create genesis block
	}

	/*
	----------------------------------------------------------------
		UTILS
	----------------------------------------------------------------
	*/
	// utils
	reset() {
		this.chain = [this.chain[0]]; // save genesis block
		this.difficulty = this.config.startDifficulty;
		this.pendingTransactions = [];
		this.peers = new Set();
		return true;
	}

	//calculate cumulative difficulty:
	//notes: difficulty for difficulty(p) === 16 * difficulty(p-1)
	//cumulativeDifficulty == how much effort spent to calculate it
	//cumulativeDifficulty == 16^d0 + 16^d1 + ... + 16^dn
	//where d0, d1, ... dn == difficulties of the individual blocks
	// blocks, utils
	cumulateDifficultyFromLastBlock() {
		const lastBlockDifficulty =
			this.chain[this.chain.length - 1].difficulty;
		const addedDifficulty = this.cumulateDifficulty(lastBlockDifficulty);
		this.cumulativeDifficulty += addedDifficulty;
		console.log(
			`--Cumulative Difficulty: ${JSON.stringify({
				lastBlockDifficulty,
				addedDifficulty,
				cumulativeDifficulty: this.cumulativeDifficulty,
			})}`
		);
	}

	// blocks, utils
	cumulateDifficulty(difficulty) {
		return 16 ** difficulty;
	}

	// transactions, utils
	clearIncludedPendingTransactions(block) {
		const remainingTransactions = this.pendingTransactions.filter(
			(tx) => !block.transactions.includes(tx)
		);

		this.pendingTransactions = [...remainingTransactions];
	}

	// block, utils
	hash(block) {
		return SHA256(JSON.stringify(block));
	}

	// block, utils
	getLastBlock() {
		return this.chain[this.chain.length - 1];
	}

	//check if hash starts with {difficulty} zeros;
	// utils
	validProof(block, difficulty = this.difficulty) {
		return this.validHash(this.hash(block), difficulty);
	}

	// utils
	validHash(hash, difficulty = this.config.startDifficulty || 1) {
		return hash.slice(0, difficulty) === "0".repeat(difficulty);
	}
	
	// blocks, utils
	validateBlockHash(timestamp, nonce, blockDataHash, difficulty, blockHash) {
		const hash = SHA256(blockDataHash + "|" + timestamp + "|" + nonce);
		return this.validHash(hash, difficulty) && hash === blockHash;
	}
	
	// difficulty adjustment
	//done, testing
	// blocks, difficulty, utils
	darkGravityWave(newestBlockIndex = this.getLastBlock().index) {
		const targetSpacing = this.config.targetBlockTimeSeconds;
		const pastBlocks = this.config.difficultyOverPastBlocks; //max blocks to count
		const minimumDifficulty = 1;

		let actualTimespan = 0; // counts our actual total block times

		let difficultyAverage = 0;
		let pastDifficultyAverage = 0;

		// check for odd cases at start of chain; return our minimum difficulty
		if (newestBlockIndex == 0) {
			//genesis block
			return this.config.startDifficulty;
		}

		// STEP 1: loop backward over our blocks starting at newest block
		let count; // blocks counted

		for (count = 0; count < pastBlocks; ) {
			count++; // increment at the start so we don't need to try to subtract 1 sometimes, after the loop
			const thisBlockIndex = newestBlockIndex - (count - 1);
			const thisIterationBlock = this.chain[thisBlockIndex];
			//example: count == 1 => block == newest block
			// count == 2 => block == newest block - 1

			// STEP A: Calculate our average block difficulties
			if (count === 1) {
				// For the first block, just grab the difficulty
				difficultyAverage = thisIterationBlock.difficulty;
			} else {
				// else we calculate our rolling average for this block
				// basically, previous weighted for (previous blocks + 1 == count blocks), + this.difficulty, all over (count + 1)
				//so slightly more weight given to past trend vs current difficulty
				difficultyAverage =
					(pastDifficultyAverage * count +
						thisIterationBlock.difficulty) /
					(count + 1);

				// const k = 2. / (1 + pastBlocks);
				// //EMA == difficulty * k + lastEMA * (1 - k);
				// difficultyAverage = thisIterationBlock.difficulty * k + pastDifficultyAverage * (1 - k);
			}
			// save our value for next iteration
			pastDifficultyAverage = difficultyAverage;

			// STEP B: calculate running total of block time
			//actualTimespan is the total accumulated time for counted blocks
			actualTimespan += this.getBlockTimeByIndex(thisBlockIndex);

			// after hitting the genesis block, we break
			if (thisBlockIndex < 1) {
				break;
			}
		}

		// STEP 2: set up the new difficulty
		let newDifficulty = difficultyAverage;

		// targetTimespan is time the countBlocks should have taken to be generated
		let targetTimespan = count * targetSpacing;

		// so we can keep our actual timespan for logging
		let adjustedTimespan = actualTimespan;

		// STEP 3: check actual time vs target time
		// limit readjustment, don't change more than our ratio
		const adjustmentRatioLimit = this.config.difficultyAdjustmentRatio;

		if (actualTimespan < targetTimespan / adjustmentRatioLimit) {
			adjustedTimespan = targetTimespan / adjustmentRatioLimit;
		}
		if (actualTimespan > targetTimespan * adjustmentRatioLimit) {
			adjustedTimespan = targetTimespan * adjustmentRatioLimit;
		}

		//calculate new difficulty based on actual and target timespan
		newDifficulty *= targetTimespan / adjustedTimespan;

		// STEP 4: make sure we're above our minimum difficulty
		if (newDifficulty < minimumDifficulty) {
			newDifficulty = minimumDifficulty; //our minimum
		}

		const previousBlockTime = this.getBlockTimeByIndex(newestBlockIndex);
		const blockTimeDifferenceRatio = 1.5;

		//if difficulty should increase but last block took > 1.5x normal block time, do NOT increase difficulty!
		// (Try to limit block time to 1.5x what it should be - slower adjustment but less block time variability)
		// up to 3/2 target time, don't increase difficulty.
		if (previousBlockTime > targetSpacing * blockTimeDifferenceRatio) {
			if (newDifficulty > this.difficulty) {
				newDifficulty = this.difficulty;
			}
		}
		// down to 2/3 target time, don't increase difficulty.
		if (
			previousBlockTime >
			targetSpacing * (1 / blockTimeDifferenceRatio)
		) {
			if (newDifficulty < this.difficulty) {
				newDifficulty = this.difficulty;
			}
		}

		// limit difficulty based on estimated time for next block
		// if bumping difficulty by 1 will put our block time past 1.5x the target, make sure we do not allow increasing difficulty by more than 1!
		//i.e. if last block time was 4 seconds, we need to increase difficulty. One increase == ~16x the time to calculate, so 4 * 16 == 64seconds estimated for our next block. This is more than 1.5x our 30second target, so make sure our difficulty does not increase MORE than 1 (because if we increase by 2, our estimate goes to 4 * 16 * 16 == 1024seconds!!!)

		//based on being scared of a worst case scenario where the difficulty bumps up way too high for my testing,
		if (newDifficulty >= this.difficulty + 1) {
			const timeIncreaseFromOneBumpInDifficulty = previousBlockTime * 16;

			if (
				timeIncreaseFromOneBumpInDifficulty >
				targetSpacing *
					(blockTimeDifferenceRatio ||
						this.config.difficultyAdjustmentRatio)
			) {
				newDifficulty = this.difficulty + 1;
			}
		}

		//logging data
		console.log({
			targetTimespan,
			actualTimespan,
			adjustedTimespan,
			previousDifficulty: this.chain[newestBlockIndex].difficulty,
			previousBlockTime,
			pastDifficultyAverage: difficultyAverage,
			newDifficulty,
		});

		return Math.round(newDifficulty);
	}

	// block
	getBlockTimeByIndex(index) {
		if (index < 1) return this.config.targetBlockTimeSeconds;
		const thisBlockDateMs = Date.parse(this.chain[index].dateCreated);
		const prevBlockDateMs = Date.parse(this.chain[index - 1].dateCreated);
		return (thisBlockDateMs - prevBlockDateMs) / 1000;
	}

	// validation, utils
	validateAddress(address) {
		//check length
		if (address.length !== 40) return false;
		// check all 40 chars are hex
		if (address.match(/[0-9a-fA-F]+/g)[0].length !== 40) return false;
		// other validations ....?
		return true;
	}
	
	// validation
	validatePublicKey(pubKey) {
		//check length
		if (pubKey.length !== 65) return false;
		// check all chars are hex
		if (pubKey.match(/[0-9a-fA-F]+/g)[0].length !== 65) return false;
		// other validations ....?
		return true;
	}

	/*
	----------------------------------------------------------------
		BLOCKS
	----------------------------------------------------------------
	*/

	//need to ONLY clear pending transactions which were included in the new block!
	// blocks
	addValidBlock(block) {
		this.clearIncludedPendingTransactions(block);

		this.chain.push(block);

		this.cumulateDifficultyFromLastBlock();
		this.clearMiningJobs();

		const newDifficulty = this.darkGravityWave();

		this.difficulty =
			newDifficulty > this.config.difficultyLimit
				? this.config.difficultyLimit
				: newDifficulty;
	}

	// blocks
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
			blockHash: minedBlockCandidate.blockHash,
		};

		this.chain.push(genesisBlock);

		this.config.genesisBlock = genesisBlock;

		this.cumulateDifficultyFromLastBlock();

		// TODO
		//propagate block to peers?
	}

	/*
	----------------------------------------------------------------
		TRANSACTIONS
	----------------------------------------------------------------
	*/

	// transactions
	createFaucetGenesisTransaction() {
		return this.createCoinbaseTransaction({
			to: this.config.faucetAddress,
			value: this.config.faucetGenerateValue,
			data: "genesis tx",
		});
	}

	// transactions
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
			...this.createTransaction({
				from,
				to,
				value,
				fee,
				dateCreated,
				data,
				senderPubKey,
				senderSignature,
			}),
			minedInBlockIndex: minedInBlockIndex,
			transferSuccessful: transferSuccessful,
		};
	}

	// transaction, utils
	hashTransactionData({
		from,
		to,
		value,
		fee,
		dateCreated,
		data,
		senderPubKey,
	}) {
		return SHA256(
			JSON.stringify({
				from,
				to,
				value,
				fee,
				dateCreated,
				data,
				senderPubKey,
			})
		);
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
		return new Transaction(
			from,
			to,
			value,
			fee,
			dateCreated,
			data,
			senderPubKey,
			this.hashTransactionData({
				from,
				to,
				value,
				fee,
				dateCreated,
				data,
				senderPubKey,
			}),
			senderSignature
		);
	}

	// transaction, utils
	addPendingTransaction(transaction) {
		this.pendingTransactions.push(transaction);
	}

	searchPendingTransactionsForTransactionHash(transactionDataHash) {
		//search pending transactions
		for (const transaction of this.pendingTransactions) {
			if (transaction?.transactionDataHash === transactionDataHash) 
				return transaction;
		}
		return false;
	}

	searchBlocksForTransactionHash(transactionDataHash) {
		// search blocks (confirmed transactions)
		for (const block of this.chain) {
			for (const transaction of block.transactions) {
				if (transaction?.transactionDataHash === transactionDataHash) {
					return transaction;
				}
			}
		}
		return false;
	}

	// transaction
	getTransactionByHash(transactionDataHash) {
		// //search pending transactions
		const pendingFound = this.searchPendingTransactionsForTransactionHash(transactionDataHash);
		if (pendingFound !== false) {
			return pendingFound;
		}

		// search blocks (confirmed transactions)
		const confirmedFound = this.searchBlocksForTransactionHash(transactionDataHash);
		if (confirmedFound !== false) {
			return confirmedFound;
		}
		return false;
	}

	// transactions
	getTransactionConfirmations(
		transaction,
		lastBlockIndex = this.getLastBlock().index
	) {
		const transactionBlockIndex = transaction?.minedInBlockIndex;
		if (typeof transactionBlockIndex !== "number") return 0;
		return lastBlockIndex - transactionBlockIndex + 1; // if indexes are the same we have 1 confirmation
	}

	//return transactions array of address
	//	crawl blockchain and build transaction list related to address

	//returns ALL transactions associated with the given address
	// (confirmed regardless of successful; && pending transactions)
	// sort transactions by "date and time" (ascending)
	// pending transactions will not have "minedInBlockIndex"
	// transactions
	getTransactionsByAddress(address) {
		const transactions = [
			...this.getConfirmedTransactions(address),
			...this.getPendingTransactions(address),
		];

		// sort by parsed date string
		transactions.sort(
			(a, b) => Date.parse(a.dateCreated) - Date.parse(b.dateCreated)
		);

		return transactions;
	}

	// transactions
	getConfirmedTransactions(address = null) {
		let transactions = [];
		if (!address) {
			for (const block of this.chain) {
				for (const transaction of block.transactions) {
					transactions.push(transaction);
				}
			}
		} else {
			for (const block of this.chain) {
				transactions = [
					...transactions, // keep previous ones
					...block.transactions.filter(
						(transaction) =>
							transaction.to === address ||
							transaction.from === address
					), // add new ones
				];
			}
		}

		return transactions; // returns empty array if none found
	}

	getPendingTransactionsByAddress(address) {
		return this.pendingTransactions.filter(
			(transaction) =>
				transaction.to === address || transaction.from === address
		);
	}

	// transactions
	getPendingTransactions(address = null) {
		if (!address) return this.pendingTransactions;
		return this.getPendingTransactionsByAddress(address);
	}



	/*
	----------------------------------------------------------------
		PEERS
	----------------------------------------------------------------
	*/
	// peers
	getPeersList() {
		return Array.from(this.peers);
	}

	// peers
	addPeer(nodeIdentifier, peerUrl) {
		this.peers.add({
			[nodeIdentifier]: peerUrl,
		});
		console.log(`--added!`);
	}
	
	// peers
	async requestPeer({ nodeIdentifier, peerUrl }) {
		return await (
			await fetch(`${peerUrl}/peers/connect`, {
				method: "POST",
				body: JSON.stringify({ nodeIdentifier, peerUrl }),
				headers: { "Content-Type": "application/json" },
			})
		).json();
	}

	// peers
	async registerPeer({ nodeIdentifier, peerUrl }) {
		// if nodeId is already connected, don't try to connect again
		if (this.peers.get(nodeIdentifier)) {
			return {
				status: 409,
				errorMsg: `Already connected to peer ${peerUrl}`,
			};
		}

		console.log(`verifying peer's chainID...`);
		const response = await fetch(`${peerUrl}/info`);
		const peerInfo = await response.json();

		if (response.statusCode !== 200) {
			return {
				status: 404,
				message: `Network error! Could not get peer's chainId!`,
			};
		}

		if (response.statusCode === 200) {
			const isSameChain =
				this.config.genesisBlock.chainId === peerInfo["chainId"];

			if (!isSameChain) {
				return {
					status: 400,
					errorMsg: `Chain ID does not match!`,
					thisChainId: ourChainId,
					peerChainId,
				};
			}
		}

		console.log(`--verified! (Chain ID matches, adding node to our list)`);
		
		this.addPeer(nodeIdentifier, peerUrl);

		// TODO
		//synchronize chain AND pending transactions?
		const syncResult = syncPeerChain(peerInfo, peerUrl);
		

		// send request to other node to connect to our node
		console.log(`asking other node to friend us back...`);
		const otherNodeResponse = await requestPeer({
			nodeIdentifier,
			peerUrl,
		});
		if (otherNodeResponse.status === 200) {
			console.log(`--Other peer has connected to us!`);
		}
		if (otherNodeResponse.status === 409) {
			console.log(`--Other peer was ALREADY connected!`);
		}
		console.log(`--${{ otherNodeResponse }}`);

		return { status: 200, message: `Connected to peer ${peerUrl}` };
	}


	// validation, utils
	validateFields(transaction) {
		const requiredFields = ["from", "to", "value", "fee", "dateCreated", "data", "senderPubKey", "transactionDataHash", "senderSignature"];
		let missing = [];
		const incomingDataKeys = Object.keys(transaction);
		for (const field of requiredFields) {
			if (!incomingDataKeys.includes(field)) {
				missing.push(field);
			}
		}
		if (missing.length > 0) {
			return {valid: false, missing}

		}
		return {valid: true, missing: null};
	}

	// TODO: this will be called when we are validating the (incoming peer) chain
	// validation, utils
	validateBlockTransactions(block) {
		// TODO
		//	validate transactions in the block:
		//		validate transaction fields and values;
		// 		recalculate transactionDataHash; 
		//		validate signature;
		//		re-execute all transactions?; 
		//		recalculate values of minedInBlockIndex and transferSuccessful fields;
		const transactions = block.transactions;

		transactions.forEach(transaction => {
			const {
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
				transferSuccessful,
			} = transaction;
			// validate fields/values
				// check to be sure we have all fields
				// check that the value of each field is correct
			

			// recalculate transactionDataHash
				// take appropriate fields, hash it, and check that the hashes match
			const newHash = this.hashTransactionData({
				from,
				to,
				value,
				fee,
				dateCreated,
				data,
				senderPubKey,
			});
			if (transactionDataHash !== newHash) {
				console.log('Transaction Data Hash validation failed:\nOriginal:', transactionDataHash, "\nOurs:", newHash);
				return false;
			}
			
			// validate signature
				// ... check the signature was written by the sender public key? 
			if (!verifySignature(transactionDataHash, senderPubKey, senderSignature)) {
				return false;
			}

			// re-execute all transactions
				// making sure that the inputs and outputs and fees add up?
			


			// re-calculate values of minedInBlockIndex && transferSuccessful
				// minedInBlockIndex: check that the block index is correct? That this block has this transaction?
				// transferSuccessful: make sure the transaction is included in a block ?
			
			// if any invalid, return false (with info about why??)
		})
		return true;
	}

	// validating chain when synchronizing with another node:
	//validate genesis block, should be exactly the same
	//validate each block from first to last:
	//	validate that all block fields are present && with valid values
	//	validate transactions in the block:
	//		validate transaction fields and values;
	// 		recalculate transactionDataHash; 
	//		validate signature;
	//		re-execute all transactions?; 
	//		recalculate values of minedInBlockIndex and transferSuccessful fields;
	//	recalculate blockDataHash && blockHash
	//	ensure blockHash matches difficulty
	//	validate prevBlockHash === hash of previous block
	//recalculate cumulative difficulty of incoming chain
	//if > this.cumulativeDifficulty:
	//	replace current chain with incoming chain
	//	clear all current mining jobs (they are invalid)

	//calculate cumulative difficulty: ????
	//(note: difficulty for difficulty(p) === 16 * difficulty(p-1))
	//cumulativeDifficulty == how much effort spent to calculate it
	//cumulativeDifficulty == 16^d0 + 16^d1 + ... + 16^dn
	//where d0, d1, ... dn == difficulties of the individual blocks

	// takes chain, returns true or false;
	// chain, validation
	validateChain(chain) {
		let previousBlock = chain[0];
		let currentIndex = 1;

		while (currentIndex < chain.length) {
			const block = chain[currentIndex];
			console.log(previousBlock);
			console.log(block);
			console.log("\n--------\n");

			//check hash of previous block
			if (block["prevBlockHash"] !== this.hash(previousBlock)) {
				console.log("Previous hash does not match!");
				return false;
			}

			if (!this.validProof(block)) {
				console.log("Block PoW is Invalid!");
				return false;
			}

			// TODO: validate transactions in this current block
			if (!this.validateBlockTransactions(block)) {
				console.log("Invalid transactions found!");
				return false;
			}


			previousBlock = block;
			currentIndex++;
		}

		return true;
	}

	// synchronize chain AND
	// TODO: sync pending transactions
	// peers, sync
	async syncPeerChain(peerInfo, peerUrl) {
		console.log(`Attempting sync with new peer...`);
		const response = await fetch(`${peerUrl}/blocks`);
		const theirChain = await response.json();
		let result = {valid: null, error: null};

		// Theirs has more work, so we switch to theirs:
		if (peerInfo.cumulativeDifficulty > this.cumulativeDifficulty) {
			// TODO: 
			//validate chain (blocks, transactions, etc??)
			//if valid, replace our chain and notify peers about the new chain??

			// Then ours will match theirs, so no need to check the length and validate again (below)

			// return
		}


		const ourChainLength = this.chain.length;

		if (response.statusCode === 200) {
			const theirChainLength = theirChain.length;

			if (theirChainLength > ourChainLength) {
				// theirs is longer, validate and save to our node
				// 		is this necessary? If their length is longer, their cumulativeDifficulty would be longer so this would catch above instead of down here...
				if (this.validateChain(theirChain)) {
					this.chain = theirChain;
					// TODO: sync pending transactions?
					result = {valid: true, error: null};
				} else {
					result = {valid: false, error: 'Peer chain is not valid'};
				}
			} else {
				// our chain is longer
				result = {valid: false, error: 'Our chain is longer'};
			}
		} else {
			result = {valid: false, error: 'Cannot get peer chain'};
		}

		console.log(result);
		return result;
	}

	// peers, transactions
	synchronizePendingTransactions(peerUrl) {
		//fetch /transactions/pending and append missing transactions
		// be sure to check for duplicated hashes!
	}

	// peers, validation, sync
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


	/*
	----------------------------------------------------------------
		MINING
	----------------------------------------------------------------
	*/

	// mining
	mineBlock(block, nonce = 0) {
		let timestamp = new Date().toISOString();
		let hash = SHA256(block.blockDataHash + "|" + timestamp + "|" + nonce);

		while (!this.validHash(hash, block.difficulty)) {
			timestamp = new Date().toISOString();
			nonce += 1;
			hash = SHA256(block.blockDataHash + "|" + timestamp + "|" + nonce);
		}

		return {
			blockDataHash: block.blockDataHash,
			dateCreated: timestamp,
			nonce: nonce,
			blockHash: hash,
		};
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
	// mining
	prepareBlockCandidate(minerAddress, difficulty = this.difficulty) {
		const coinbaseTransaction = this.createCoinbaseTransaction({
			to: minerAddress,
		});
		const index = coinbaseTransaction.minedInBlockIndex;

		const prepareTransactions = (blockIndex, pendingTransactions = this.pendingTransactions) => {
			return pendingTransactions.map((txData) => ({
				...txData,
				transferSuccessful: true,
				minedInBlockIndex: blockIndex,
			}));
		};

		const pendingTransactions = prepareTransactions(
			index
		);

		const transactions = [
			coinbaseTransaction, // prepend
			...pendingTransactions,
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

		return {
			index,
			transactionsIncluded: transactions.length,
			difficulty,
			expectedReward: coinbaseTransaction.value,
			rewardAddress: minerAddress,
			blockDataHash,
		};
	}

	// mining
	clearMiningJobs() {
		this.miningJobs.clear();
	}

	// check if new candidate index is higher than one of the saved ones; if so, wipe this.miningJobs
	// finally, add our new mining job
	// mining
	saveMiningJob(block) {
		this.miningJobs.set(block.blockDataHash, block);

		console.log(
			`Mining job saved! Block candidate prepared for mining.\nCurrent mining jobs:${JSON.stringify(
				Array.from(this.miningJobs)
			)}`
		);
	}

	// step 1: find block candidate by its blockDataHash
	// step 2: verify hash and difficulty
	// step 3: if valid, add the new info to the block
	// step 4: check if block (index?) is not yet mined;
	// if not, we add our new verified block and propagate it! (notify other nodes so they may request it?)
	// if block is already mined, we were too slow so we return a sad error message!
	// mining
	submitMinedBlock({ blockDataHash, dateCreated, nonce, blockHash }) {
		if (this.miningJobs.size === 0) {
			return {
				status: 404,
				message: "No mining jobs! Node must've reset",
			};
		}

		const foundBlock = this.miningJobs.get(blockDataHash) || null;

		if (!foundBlock) {
			return { status: 404, message: "Mining job missing!" };
		}

		const isValid = this.validateBlockHash(
			dateCreated,
			nonce,
			blockDataHash,
			foundBlock.difficulty,
			blockHash
		);

		if (!isValid) {
			return { status: 400, message: "Block hash is not valid!" };
		}

		const completeBlock = { ...foundBlock, nonce, dateCreated, blockHash };

		if (completeBlock.index < this.chain.length) {
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


	/* 
	----------------------------------------------------------------
			BALANCES / ADDRESSES
	----------------------------------------------------------------
	*/

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
	// balances, address
	getBalancesOfAddress(address) {
		const chainTipIndex = this.getLastBlock().index;
		const balances = {
			safeBalance: 0,
			confirmedBalance: 0,
			pendingBalance: 0,
		};

		const confirmedTransactions = this.getConfirmedTransactions(address);

		const pendingTransactions = this.getPendingTransactions(address);

		if (
			confirmedTransactions.length === 0 &&
			pendingTransactions.length === 0
		) {
			return balances; // return 0s balance object
		}

		if (confirmedTransactions.length > 0) {
			balances.confirmedBalance += confirmedTransactions.reduce(
				(sum, tx) => {
					if (tx.to === address && tx.transferSuccessful === true) {
						return sum + +tx.value;
					}
					if (tx.from === address) {
						return (
							sum -
							(+tx.fee + (tx.transferSuccessful === true) ? +tx.value : 0)
						);
					}
				},
				0
			);

			balances.safeBalance += confirmedTransactions.reduce((sum, tx) => {
				if (
					this.getTransactionConfirmations(tx, chainTipIndex) >=
					this.config.safeConfirmCount
				) {
					if (tx.to === address && tx.transferSuccessful === true) {
						return sum + +tx.value;
					}
					if (tx.from === address) {
						return (
							sum -
							(+tx.fee + (tx.transferSuccessful === true) ? tx.value : 0)
						);
					}
				}
				return sum;
			}, 0);
		}

		balances.pendingBalance += +balances.confirmedBalance; // pending balance also includes confirmed balance

		if (pendingTransactions.length > 0) {
			// testing if this works!
			const [receivedTotal, sentTotal] = pendingTransactions.reduce(
				([receivedSum, sentSum], tx) => {
					if (tx.to === address) {
						receivedSum += +tx.value;
					}
					if (tx.from === address) {
						sentSum += +tx.value + tx.fee;
					}
					return [receivedSum, sentSum];
				},
				[0, 0]
			);

			// console.log({ receivedTotal, sentTotal });
			balances.confirmedBalance -= sentTotal;

			balances.pendingBalance += receivedTotal - sentTotal;
		}

		console.log(`balances (v2) for address ${address}:\n`, balances);

		return balances;
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

	// balances, addresses
	getAllConfirmedAccountBalances() {
		console.log("---Getting all confirmed account balances...");
		let balances = {};
		for (const block of this.chain) {
			console.log("scanning block", block.index);
			for (const transaction of block.transactions) {
				// console.log('found transaction', transaction.transactionDataHash);
				const { from, to, value, fee } = transaction;
				//handle {to: address}
				if (to in balances) {
					console.log(
						"adding to existing entry for received transaction"
					);
					balances[to] += value;
				} else {
					console.log("creating new entry for received transaction");
					balances[to] = value;
				}

				//handle {from: address}
				if (from in balances) {
					console.log(
						"adding to existing entry for sent transaction"
					);
					balances[from] -= fee + value;
				} else {
					console.log("creating new entry for sent transaction");
					balances[from] = 0 - (fee + value);
				}
			}
		}
		console.log("---done collecting balances");
		return balances;
	}

	// balances, addresses
	filterOutNonZeroBalances(balances) {
		const prunedBalances = {};
		for (const address in balances) {
			if (balances[address] !== 0) {
				prunedBalances[address] = balances[address];
			}
		}
		return prunedBalances;
	}
}

module.exports = Blockchain;
