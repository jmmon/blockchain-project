// import fetch from 'node-fetch'
// import crypto from "node:crypto"
const fetch = import("node-fetch");
const crypto = require("crypto");
const Transaction = require("./Transaction");
const Block = require("./Block");

const SHA256 = (message) =>
	crypto.createHash("sha256").update(message).digest("hex");

const sortObjectByKeys = (object) => {
	const sortedKeys = Object.keys(object).sort((a, b) => a - b);
	let newObject = {};
	sortedKeys.forEach((key) => (newObject[key] = object[key]));
	return newObject;
};

class Blockchain {
	constructor(config = require('./config')) {
		this.config = config;
		this.chain = [];
		this.pendingTransactions = [];
		this.nodes = new Set();
		this.miningJobs = new Map(); // blockDataHash => blockCandidate

		this.difficulty = this.config.startDifficulty;

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

	cumulateDifficulty(difficulty) {
		return 16 ** difficulty;
	}

	clearIncludedPendingTransactions(block) {
		const remainingTransactions = this.pendingTransactions.filter(
			(tx) => !block.transactions.includes(tx)
		);

		// console.log(`Pruning pending transactions...\n--------\nPending Transactions: ${JSON.stringify(this.pendingTransactions)}\n--------\nTransactions in Block: ${JSON.stringify(block.transactions)}\n--------\nRemaining Pending Transactions: ${JSON.stringify(remainingTransactions)}`);

		this.pendingTransactions = [...remainingTransactions];
	}

	//need to ONLY clear pending transactions which were included in the new block!
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
			blockHash: minedBlockCandidate.blockHash,
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

	getTransactionDataHash({
		from,
		to,
		value,
		fee,
		dateCreated,
		data,
		senderPubKey,
	}) {
		return SHA256(
			JSON.stringify(
				sortObjectByKeys({
					from,
					to,
					value,
					fee,
					dateCreated,
					data,
					senderPubKey,
				})
			)
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
			this.getTransactionDataHash({
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

	addPendingTransaction(transaction) {
		this.pendingTransactions.push(transaction);
	}

	findTransactionByHash(transactionDataHash) {
		//search pending transactions
		for (const transaction of this.pendingTransactions) {
			if (transaction?.transactionDataHash === transactionDataHash) {
				return transaction;
			}
		}
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

	async registerPeer({ nodeIdentifier, peerUrl }) {
		// if nodeId is already connected, don't try to connect again
		if (this.nodes.get(nodeIdentifier)) {
			return {
				status: 409,
				errorMsg: `Already connected to peer ${peerUrl}`,
			};
		}

		console.log(`verifying peer's chainID...`);
		const response = await fetch(`${peerUrl}/info`);
		const peerInfo = await response.json();
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
			console.log(`--verified!`);
		} else {
			return {
				status: 404,
				message: `Network error! Could not get peer's chainId!`,
			};
		}

		console.log(`adding node to our list...`);
		this.nodes.add({
			[nodeIdentifier]: peerUrl,
		});
		console.log(`--added!`);

		//synchronize chain and pending transactions?
		syncPeerChain(peerInfo, peerUrl);

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

	async requestPeer({ nodeIdentifier, peerUrl }) {
		return await (
			await fetch(`${peerUrl}/peers/connect`, {
				method: "POST",
				body: JSON.stringify({ nodeIdentifier, peerUrl }),
				headers: { "Content-Type": "application/json" },
			})
		).json();
	}

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
	validateChain(chain) {
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
		return SHA256(JSON.stringify(sortObjectByKeys(block)));
	}

	getLastBlock() {
		return this.chain[this.chain.length - 1];
	}

	// // increase block nonce until block hash is valid
	// proofOfWork(block) {
	// 	while (!this.validProof(block)) {
	// 		block["nonce"] += 1;
	// 	}
	// }

	//check if hash starts with 4 zeros; 4 being the difficulty
	validProof(block, difficulty = this.difficulty) {
		return this.validHash(this.hash(block), difficulty);
	}

	validHash(hash, difficulty = this.config.startDifficulty || 1) {
		return hash.slice(0, difficulty) === "0".repeat(difficulty);
	}

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

	validateBlockHash(timestamp, nonce, blockDataHash, difficulty, blockHash) {
		const hash = SHA256(blockDataHash + "|" + timestamp + "|" + nonce);

		// console.log("Validating mined block hash:", { hash: hash === blockHash, difficulty: this.validHash(hash, difficulty) });

		return this.validHash(hash, difficulty) && hash === blockHash;
	}

	getTransactionConfirmations(
		transaction,
		lastBlockIndex = this.getLastBlock().index
	) {
		const transactionBlockIndex = transaction?.minedInBlockIndex;
		if (!transactionBlockIndex) return 0;
		return lastBlockIndex - transactionBlockIndex + 1; // if indexes are the same we have 1 confirmation
	}

	// difficulty adjustment
	//done, testing
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
		if (previousBlockTime > (targetSpacing * blockTimeDifferenceRatio)) {
			if (newDifficulty > this.difficulty) {
				newDifficulty = this.difficulty;
			}
		}
		// down to 2/3 target time, don't increase difficulty.
		if (previousBlockTime > (targetSpacing * (1 / blockTimeDifferenceRatio))) {
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
			return pendingTransactions.map((txData) => ({
				...txData,
				transferSuccessful: true,
				minedInBlockIndex: blockIndex,
			}));
		};

		const pendingTransactions = prepareTransactions(
			this.pendingTransactions,
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

	getBalancesOfAddress(address) {
		const chainTipIndex = this.getLastBlock().index;
		const balances = {
			safeBalance: 0,
			confirmedBalance: 0,
			pendingBalance: 0,
		};

		const confirmedTransactions =
			this.getConfirmedTransactions(address);

		const pendingTransactions =
			this.getPendingTransactions(address);

		if (
			confirmedTransactions.length === 0 &&
			pendingTransactions.length === 0
		) {
			return balances; // return 0s balance object
		}

		if (confirmedTransactions.length > 0) {
			balances.confirmedBalance += confirmedTransactions.reduce(
				(acc, transaction) => {
					if (
						transaction.to === address &&
						transaction.transferSuccessful
					) {
						return acc + +transaction.value;
					}
					if (transaction.from === address) {
						return acc - (+transaction.fee (transaction.transferSuccessful) ? +transaction.value : 0);

						// if (transaction.transferSuccessful) {
						// 	return (
						// 		acc - (+transaction.value + +transaction.fee)
						// 	);
						// } else {
						// 	return acc - +transaction.fee;
						// }
					}
				},
				0
			);

			balances.safeBalance += confirmedTransactions.reduce(
				(acc, transaction) => {
					if (
						this.getTransactionConfirmations(
							transaction,
							chainTipIndex
						) >= this.config.safeConfirmCount
					) {
						if (
							transaction.to === address &&
							transaction.transferSuccessful
						) {
							return acc + +transaction.value;
						}
						if (transaction.from === address) {
							return acc - (+transaction.fee + (transaction.transferSuccessful) ? transaction.value : 0);
							// if (transaction.transferSuccessful) {
							// 	return (
							// 		acc -
							// 		(+transaction.value + +transaction.fee)
							// 	);
							// } else {
							// 	return acc - +transaction.fee;
							// }
						}
					}
					return acc;
				},
				0
			);
		}

		balances.pendingBalance += +balances.confirmedBalance; // pending balance also includes confirmed balance

		if (pendingTransactions.length > 0) {
			// testing if this works!
			const [receivedTotal, sentTotal] = pendingTransactions.reduce(
				([acc, acc2], transaction) => {
					if (transaction.to === address) {
						acc += +transaction.value;
					}
					if (transaction.from === address) {
						acc2 += +transaction.value + transaction.fee;
					}
					return [acc, acc2];
				},
				[0, 0]
			);

			console.log({ receivedTotal, sentTotal });
			balances.confirmedBalance -= sentTotal;

			balances.pendingBalance += receivedTotal - sentTotal;
		}

		console.log(
			`balances (v2) for address ${address}:\n${JSON.stringify(balances)}`
		);

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
			...this.getConfirmedTransactions(address),
			...this.getPendingTransactions(address),
		];

		// sort by parsed date string
		transactions.sort(
			(a, b) => Date.parse(a.dateCreated) - Date.parse(b.dateCreated)
		);

		return transactions;
	}

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

	getPendingTransactions(address = null) {
		if (!address) return this.pendingTransactions;
		return this.pendingTransactions.filter(
			(transaction) =>
				transaction.to === address || transaction.from === address
		);
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