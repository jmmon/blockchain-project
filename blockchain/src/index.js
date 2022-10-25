const verifySignature = (...args) =>
	import('../../walletUtils/index.js').then(
		({ default: { verifySignature } }) => verifySignature(...args)
	);
const addressFromCompressedPubKey = (...args) =>
	import('../../walletUtils/index.js').then(
		({ default: { addressFromCompressedPubKey } }) =>
			addressFromCompressedPubKey(...args)
	);
const hashTransaction = (...args) =>
	import('../../walletUtils/index.js').then(
		({ default: { hashTransaction } }) => hashTransaction(...args)
	);
const fetch = (...args) =>
	import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { CONFIG, txBaseFields, blockBaseFields } = require('./constants');
const Transaction = require('./Transaction');
const Block = require('./Block');
const {
	validateFields,
	basicTxValidation,
	validateBlockValues,
} = require('./validation');
const { SHA256, isValidProof } = require('../../libs/hashing');

class Blockchain {
	constructor(config = CONFIG) {
		this.config = { ...config };
		this.chain = [];
		this.pendingTransactions = [];
		this.peers = new Map();
		this.miningJobs = new Map(); // blockDataHash => blockCandidate
		this.difficulty = this.config.difficulty.starting;
		this.cumulativeDifficulty = 0; // initial value
	}

	/*
	----------------------------------------------------------------
		UTILS
	----------------------------------------------------------------
	*/
	// utils
	reset() {
		this.chain = [this.chain[0]]; // save genesis block
		this.difficulty = this.config.difficulty.starting;
		this.pendingTransactions = [];
		return true;
	}

	// blocks, utils
	//calculate cumulative difficulty:
	// difficulty for difficulty(p) === 16 * difficulty(p-1)
	//cumulativeDifficulty == 16^d0 + 16^d1 + ... + 16^dn
	//where d0, d1, ... dn == difficulties of the individual blocks
	cumulateDifficultyFromLastBlock() {
		const finalBlockDifficulty = this.lastBlock()?.difficulty;
		const addedDifficulty = this.cumulateDifficulty(finalBlockDifficulty);
		this.cumulativeDifficulty += addedDifficulty;

		console.log(
			`--Cumulative Difficulty: ${JSON.stringify({
				finalBlockDifficulty,
				addedDifficulty,
				cumulativeDifficulty: this.cumulativeDifficulty,
			})}`
		);
	}

	// blocks, utils
	cumulateDifficulty(difficulty) {
		return 16 ** difficulty;
	}

	updateDifficulty() {
		if (this.config.difficulty.dynamic) {
			const newDifficulty = this.darkGravityWave();

			this.difficulty =
				newDifficulty > this.config.difficulty.limit
					? this.config.difficulty.limit
					: newDifficulty;
		} else {
			this.difficulty = this.config.difficulty.starting;
		}
	}

	// block, utils
	lastBlock() {
		return this.chain[this.chain.length - 1];
	}

	// blocks, utils
	isValidBlockHash(blockDataHash, dateCreated, nonce, difficulty, blockHash) {
		const hash = SHA256(blockDataHash + '|' + dateCreated + '|' + nonce);
		return isValidProof(hash, difficulty) && hash === blockHash;
		// return this.isValidBlockHash(hash, difficulty) && hash === blockHash;
	}

	// difficulty adjustment
	//done, testing
	// blocks, difficulty, utils
	darkGravityWave(newestBlockIndex = this.lastBlock().index) {
		const targetSpacing = this.config.difficulty.targetBlockSeconds;
		const pastBlocks = this.config.difficulty.averageOverBlocks; //max blocks to count
		const minimumDifficulty = 1;

		let actualTimespan = 0; // counts our actual total block times

		let difficultyAverage = 0;
		let pastDifficultyAverage = 0;

		// check for odd cases at start of chain; return our minimum difficulty
		if (newestBlockIndex == 0) {
			//genesis block
			return this.config.difficulty.starting;
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
		const adjustmentRatioLimit = this.config.difficulty.adjustmentRatio;

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
						this.config.difficulty.adjustmentRatio)
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
		if (index < 1) return this.config.difficulty.targetBlockSeconds;
		const thisBlockDateMs = Date.parse(this.chain[index].dateCreated);
		const prevBlockDateMs = Date.parse(this.chain[index - 1].dateCreated);
		return (thisBlockDateMs - prevBlockDateMs) / 1000;
	}

	/*
	----------------------------------------------------------------
		BLOCKS
	----------------------------------------------------------------
	*/

	clearIncludedPendingTransactions(block) {
		console.log(
			`fn clearIncludedPendingTransactions:`
			// , {pendingTransactions: this.pendingTransactions}
		);
		// filter out transactions in the block
		const initialPendingCount = this.pendingTransactions.length; // pending length
		const blockTxnDataHashes = block.transactions.map(
			(txn) => txn.transactionDataHash
		);
		const remainingTransactions = this.pendingTransactions.filter(
			// pending keeping
			(txn) => !blockTxnDataHashes.includes(txn.transactionDataHash)
		);

		// const blockTxnHashes = block.transactions.map(txn => txn.transactionDataHash);
		// const remainingTransactions = this.pendingTransactions.filter(txn => !blockTxnHashes.includes(txn.transactionDataHash));
		console.log({
			initialPendingCount,
			blockTxnCount: block.transactions.length,
			removedCount: initialPendingCount - remainingTransactions.length,
		});

		this.pendingTransactions = remainingTransactions;
		// console.log({remainingTransactions: this.pendingTransactions})
	}

	// blocks
	async createGenesisBlock() {
		console.log('fn createGenesisBlock');
		const coinbaseTransaction =
			await this.createFaucetGenesisTransaction();

		const transactions = [coinbaseTransaction];
		console.log('should be array with one object', { transactions });

		const genesisBlock = new Block(
			index,
			transactions,
			0,
			'1',
			this.config.coinbase.address
		)
		genesisBlock.hashData();
		
		// next should "mine" the genesis block (hash it)
		const genesisCandidate = genesisBlock.prepareMiningJobResponse(true);
		const {nonce, dateCreated, blockHash} = this.mineGenesisBlock(
			genesisCandidate
		);

		// then we can build our final block with all the info, and push it to the chain
		genesisBlock.nonce = nonce;
		genesisBlock.dateCreated = dateCreated;
		genesisBlock.blockHash = blockHash;

		// Add valid block
		console.log({ finalGenesisBlock: genesisBlock });
		this.chain.push(genesisBlock);
		this.cumulateDifficultyFromLastBlock();
		saveDataToConfig(genesisBlock);

		// const genesisBlockData = {
		// 	index: 0,
		// 	transactions,
		// 	difficulty: 0,
		// 	prevBlockHash: '1',
		// 	minedBy: this.config.coinbase.address,
		// };
		// console.log('--', {
		// 	genesisTransactions: genesisBlockData.transactions,
		// });
		// const blockDataHash = SHA256(JSON.stringify(genesisBlockData));

		// const genesisBlockCandidate = {
		// 	index: genesisBlockData.index,
		// 	transactionsIncluded: genesisBlockData.transactions.length,
		// 	difficulty: genesisBlockData.difficulty,
		// 	expectedReward: 0, // no mining reward (coinbase tx) on genesis block
		// 	rewardAddress: null, // no coinbase tx, no reward address
		// 	blockDataHash,
		// };

		// const genesisBlock = {
		// 	...new Block(
		// 		0,
		// 		transactions,
		// 		0,
		// 		'1',
		// 		this.config.coinbase.address,
		// 		blockDataHash
		// 	),
		// 	nonce: minedBlockCandidate.nonce,
		// 	dateCreated: minedBlockCandidate.dateCreated,
		// 	blockHash: minedBlockCandidate.blockHash,
		// };
	}

	saveDataToConfig(genesisBlock) {
		this.config.genesisBlock = genesisBlock;
		this.config.chainId = genesisBlock.blockHash;
		this.difficulty = this.config.difficulty.starting;
	}

	/*
	----------------------------------------------------------------
		TRANSACTIONS
	----------------------------------------------------------------
	*/

	// transactions
	async createFaucetGenesisTransaction() {
		console.log('fn createFaucetGenesisTransaction');
		const faucetTransaction = await this.createCoinbaseTransaction({
			to: this.config.faucet.address,
			value: this.config.faucet.valueToGenerate,
			dateCreated: new Date(
				Date.parse(this.config.CHAIN_BIRTHDAY) + 10
			).toISOString(),
			data: 'genesis tx',
		});
		return faucetTransaction;
	}

	// transactions
	async createCoinbaseTransaction({
		from = this.config.coinbase.address,
		to,
		value = this.config.coinbase.blockReward + 350,
		fee = 0,
		dateCreated = new Date().toISOString(),
		data = 'coinbase tx',
		senderPubKey = this.config.coinbase.publicKey,
		// transactionDataHash: get this inside our function
		senderSignature = this.config.coinbase.signature,
		minedInBlockIndex = this.chain.length,
		transferSuccessful = true,
	}) {
		const hashedTransaction = await this.createHashedTransaction({
			from,
			to,
			value,
			fee,
			dateCreated,
			data,
			senderPubKey,
			senderSignature,
		});
		const newCoinbaseTransaction = {
			...hashedTransaction,
			minedInBlockIndex: minedInBlockIndex,
			transferSuccessful: transferSuccessful,
		};
		console.log('fn createCoinbaseTransaction', { newCoinbaseTransaction });
		return newCoinbaseTransaction;
	}

	async createHashedTransaction({
		from,
		to,
		value,
		fee,
		dateCreated,
		data,
		senderPubKey,
		senderSignature,
	}) {
		const hashedData = await hashTransaction({
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
			hashedData,
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
		const pendingFound =
			this.searchPendingTransactionsForTransactionHash(
				transactionDataHash
			);
		if (pendingFound !== false) {
			return pendingFound;
		}

		// search blocks (confirmed transactions)
		const confirmedFound =
			this.searchBlocksForTransactionHash(transactionDataHash);
		if (confirmedFound !== false) {
			return confirmedFound;
		}
		return false;
	}

	// transactions
	transactionConfirmations(
		transaction,
		lastBlockIndex = this.lastBlock().index
	) {
		const transactionBlockIndex = transaction?.minedInBlockIndex;
		if (typeof transactionBlockIndex !== 'number') return 0;
		return lastBlockIndex - transactionBlockIndex + 1; // if indexes are the same we have 1 confirmation
	}

	// transactions
	//returns ALL transactions associated with the given address, sorted by date/time (ascending)
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
		console.log('fn getConfirmedTransactions');
		let transactions = [];
		for (const block of this.chain) {
			console.log('for', { block }, 'searching transactions:', {
				transactions: block.transactions,
			});
			if (block.transactions)
				if (!address) {
					for (const transaction of block.transactions) {
						transactions.push(transaction);
						// add all transactions
					}
				} else {
					transactions = [
						...transactions,
						...block.transactions.filter(
							(transaction) =>
								transaction?.to === address ||
								transaction?.from === address
						), // add matching transactions
					];
				}
		}
		// if (!address) {
		// 	for (const block of this.chain) {
		// 		for (const transaction of block.transactions) {
		// 			transactions.push(transaction);
		// 		}
		// 	}
		// } else {
		// 	for (const block of this.chain) {
		// 		console.log('for', {block}, 'transactions:', {transactions: block.transactions})
		// 		transactions = [
		// 			...transactions, // keep previous ones
		// 			...block.transactions.filter(
		// 				(transaction) =>
		// 					transaction?.to === address ||
		// 					transaction?.from === address
		// 			), // add new ones
		// 		];
		// 	}
		// }

		return transactions; // returns empty array if none found
	}

	// transactions
	getPendingTransactions(address = null) {
		if (!address) return this.pendingTransactions;

		return this.pendingTransactions.filter(
			(transaction) =>
				transaction.to === address || transaction.from === address
		);
	}

	findCoinbaseTransaction = (transactions) =>
				transactions.filter((txn) => txn.data !== 'coinbase tx')[0];
	/*
	----------------------------------------------------------------
		PEERS
	----------------------------------------------------------------
	*/

	isDifferentChain(theirId) {
		return this.config.chainId !== theirId;
	}
	// connect peer if not connected
	async connectAndSyncPeer(peerUrl, needToReciprocate) {
		// try to fetch info
		const response = await fetch(`${peerUrl}/info`);
		console.log('fn connectPeer', { connectingTo: peerUrl });
		if (response.status !== 200) {
			console.log(`-- fetch peer info`);
			return {
				status: 400,
				errorMsg: `Network error: Could not get peer info`,
			};
		}

		const peerInfo = await response.json();
		const peerNodeId = peerInfo.nodeId;
		console.log(`-- fetched info from peer node:`, { peerInfo });

		// check chainId
		if (this.isDifferentChain(peerInfo.chainId)) {
			console.log('-- Other node is not on same chain');
			return {
				status: 400,
				errorMsg: `Chain ID does not match!`,
				thisChainId: this.config.chainId,
				peerChainId: peerInfo.chainId,
			};
		}

		// if nodeId is already connected, don't try to connect again
		if (!needToReciprocate || this.peers.get(peerNodeId)) {
			console.log(`-- check nodeId`, {
				status: 409,
				errorMsg: `Already connected to peer ${peerUrl}`,
			});
		} else {
			// same chain, node added
			this.peers.set(peerNodeId, peerUrl);
			console.log(`-- added peer:`, { peerNodeId, peerUrl });
			// Send connect request to the new peer to ensure bi-directional connection
			tellPeerToFriendUsBack(peerUrl);
		}

		//synchronize chain AND pending transactions

		if (this.isTheirChainBetter(peerInfo.cumulativeDifficulty)) {
			console.log('-- is their chain better? YES', { peerInfo });
			this.checkChainFromPeer(peerUrl);
		} else {
			console.log('-- is their chain better? NO', { peerInfo });
		}

		console.log(` END fn connectPeer`);
		return {
			status: 200,
			message: `Connected to peer ${peerUrl}`,
		};
	}

	// tell them to add us
	async tellPeerToFriendUsBack(peerUrl) {
		console.log(`-- tellPeerToFriendUsBack ( ${peerUrl} )`);
		try {
			const response = await (
				await fetch(`${peerUrl}/peers/connect`, {
					method: 'POST',
					body: JSON.stringify({
						peerUrl: this.config.node.selfUrl,
					}),
					headers: {
						'Content-Type': 'application/json',
						'need-to-reciprocate': 'false',
					},
				})
			).json();
			console.log(`-- friend's response:`, { response });
			return response;
		} catch (err) {
			console.log('Error friending back the peer!', err.message);
		}
	}

	// transactionsWeHaveNotSeen
	transactionsWeHaveNotSeen(list) {
		console.log('fn keepMissingTransactions:');
		// returns transactions not in pending && not in chain

		const keepTheseDataHashes = list.map((txn) => txn.transactionDataHash);
		const originalPendingCount = keepTheseDataHashes.length;

		console.log(
			`- Initial pending txns: ${originalPendingCount}\n${keepTheseDataHashes.join(
				', '
			)}`
		);
		console.log({ chain: this.chain, type: typeof this.chain });
		for (const block of this.chain) {
			for (const { thisTxDataHash } of block.transactions) {
				// see if transaction is in incoming list
				const indexInPending =
					keepTheseDataHashes.indexOf(thisTxDataHash);

				// remove from the list if it's included in the block
				if (indexInPending !== -1) {
					keepTheseDataHashes.splice(indexInPending, 1);
					console.log(
						`--- Removing ${thisTxDataHash} (Found in block index ${block.index})`
					);
				}
			}
		}

		// remove ones that we don't want to keep
		const remainingPendingTxns = list.filter(
			(txn) => !keepTheseDataHashes.includes(txn.transactionDataHash)
		);
		const remainingPendingCount = remainingPendingTxns.length;

		console.log(
			`- Done removing\nRemaining pending txns: ${remainingPendingCount} (Removed ${
				originalPendingCount - remainingPendingCount
			} transactions)\n${remainingPendingTxns.join(', ')}`
		);

		// returns array of transactions from pending that were not included in blocks
		return remainingPendingTxns;
	}

	/*
	----------------------------------------------------------------
		Syncing between peers/nodes
	----------------------------------------------------------------
	*/

	// peers, sync
	// async historyFrom(peerUrl) {
	async checkChainFromPeer(peerUrl) {
		console.log(`-- fn checkChainFromPeer`);
		// let theirChain, theirPending;
		console.log({ peerUrl });
		const theirChain = await fetch(`${peerUrl}/blocks`).then(
			async (res) => await res.json()
		);
		const theirPending = await fetch(
			`${peerUrl}/transactions/pending`
		).then(async (res) => await res.json());

		// async validateChain(theirChain, peerUrl) {
		console.log('-- Validating chain');
		try {
			// execute the whole chain in a new blockchain
			const { valid, cumulativeDifficulty, error } =
				await executeIncomingChain(theirChain);

			if (!valid) {
				console.log(error);
				return console.log(`-- -- chain validation`, {
					valid: false,
					error: `Their chain isn't valid!`,
				});
			}

			console.log('-- -- Chain is valid! Checking difficulty...');
			console.log({
				ours: this.cumulativeDifficulty,
				theirs: cumulativeDifficulty,
			});

			if (!this.isTheirChainBetter(cumulativeDifficulty)) {
				return console.log(`-- -- difficulty check`, {
					valid: false,
					error: `The valid chain isn't better than ours!`,
				});
			}
			console.log('-- -- Difficulty is better! Adding chain...');

			// CHAIN IS VALID AND BETTER:

			// replace chain,
			this.chain = theirChain;
			this.updateDifficulty();

			// clear mining jobs (they are invalid)
			this.clearMiningJobs();
			console.log('-- -- Notifying peers of the new chain...');

			this.propagateBlock(peerUrl);
		} catch (err) {
			return console.log(`-- validateChain error:`, {
				valid: false,
				error: err.message,
			});
		}
		// }
		// syncPendingTransactions(theirPending) {
		// SYNC PENDING TRANSACTIONS:

		// Clean up current pendingTransactions:
		// Add those that are in the peer's pendingTransactions
		const uniqueTransactions = new Set([
			...this.pendingTransactions,
			...theirPending,
			// ...(await theirPending),
		]);
		// Keep those that are not in the chain
		this.pendingTransactions = this.transactionsWeHaveNotSeen(
			Array.from(uniqueTransactions)
		);
		return console.log(`-- Sync Pending Transactions`, {
			valid: true,
			message: 'Their chain was accepted!',
		});
	}

	// should be run any time the chain changes (when a block is mined)
	propagateBlock(skipPeer = null) {
		console.log(`fn propagateBlock`, { peers: this.peers });

		if (this.peers.size === 0) return;

		// notify peers of new chain!
		const data = {
			blocksCount: this.chain.length,
			cumulativeDifficulty: this.cumulativeDifficulty,
			nodeUrl: this.config.node.selfUrl,
		};

		this.peers.entries().map(([peerId, peerUrl]) => {
			if (skipPeer !== null && skipPeer === peerUrl) {
				console.log(`Skipping peer ${{ peerId, skipPeer }}`);
				return;
			}

			console.log(`Checking Peer ${{ peerId, peerUrl }}`);

			fetch(`${peerUrl}/peers/notify-new-block`, {
				method: 'POST',
				body: JSON.stringify(data),
				headers: { 'Content-Type': 'application/json' },
			})
				.then((res) => {
					// delete peers that don't respond
					if (res.status !== 200) {
						this.peers.delete(id);
					}
					return res.json();
				})
				.then((res) =>
					console.log(
						`-- peer ${peerId} (${peerUrl}) response:${res}`
					)
				)
				.catch((err) =>
					console.log(
						`Error propagating block to Node ${peerId} (${peerUrl}): ${err.message}`
					)
				);
		});
	}

	// for propagating received transactions after they have been verified and added to the node
	propagateTransaction(signedTransaction, peers, sender) {
		if (peers.size === 0) {
			console.log(`fn propagateTransaction: no peers connected!`);
			return;
		}

		console.log(
			`fn propagateTransaction: Attempting propagation to ${peers.size} peers...`
		);
		Promise.all(
			peers.entries().map(([peerId, peerUrl]) => {
				if (sender && peerUrl.includes(sender)) {
					console.log(`--Skipping peer`, { sender, peerId, peerUrl });
					return;
				}
				console.log(`-- sending to: Node ${peerId} (${peerUrl})`);
				return fetch(`${peerUrl}/transactions/send`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'sending-node-url': this.config.selfUrl,
					},
					body: JSON.stringify(signedTransaction),
				})
					.then((res) => {
						if (res.status !== 200 && res.status !== 400) {
							// assuming no response, remove node
							this.peers.delete(peerId);
							console.log(
								`-- deleting peer ${peerId} because of incorrect response`
							);
						}
						return res.json();
					})
					.then((res) =>
						console.log(
							`-- response from: Node ${peerId} (${peerUrl}) response:\n----${res}`
						)
					)
					.catch((err) =>
						console.log(
							`Error propagating transactions to Node ${peerId} (${peerUrl}): ${err.message}`
						)
					);
			})
		);
	}

	isTheirChainBetter(theirCumulativeDifficulty) {
		return theirCumulativeDifficulty > this.cumulativeDifficulty;
	}
	isTheirChainLonger(length) {
		return length > this.chain.length;
	}

	/* 
		check whether new block results in higher cumulativeDifficulty
		accepts the new chain
		new chain is then downloaded from /blocks endpoint
	*/
	handleIncomingBlock({ blocksCount, cumulativeDifficulty, nodeUrl }) {
		if (
			this.isTheirChainLonger(blocksCount) &&
			this.isTheirChainBetter(cumulativeDifficulty)
		) {
			// download new chain from /blocks
			this.checkChainFromPeer(nodeUrl);
		}
	}
	/*
	----------------------------------------------------------------
		VALIDATION FOR PEER SYNC	
	----------------------------------------------------------------
	*/

	validateBlock(block, previousBlock) {
		console.log(`fn validateBlock`);
		let errors = [];
		let valid = true;
		console.log('--', { block, previousBlock });
		// console.log('-- --', {
		// 	txs: block.transactions[0],
		// 	prevTxs: previousBlock.transactions[0],
		// });

		// validate block fields are present
		const fieldsResult = validateFields(
			Object.keys(block),
			blockBaseFields
		);
		if (!fieldsResult.valid) {
			console.log(`Block fields are not valid!`);
			fieldsResult.errors.forEach((err) => errors.push(err));
			valid = false;
		}

		// validate block values
		const valuesResult = validateBlockValues(block, previousBlock);
		if (!valuesResult.valid) {
			console.log(`Block values are not valid!`);
			valuesResult.errors.forEach((err) => errors.push(err));
			valid = false;
		}

		if (!valid) {
			return { valid, errors, block };
		}

		return { valid, errors: null, block };
	}

	async validateNewTransaction(signedTransaction) {
		console.log(`fn validateNewTransaction`);
		let errors = [];
		const { senderPubKey, senderSignature, transactionDataHash, from } =
			signedTransaction;

		const isNotCoinbaseSender = !(
			senderPubKey === this.config.coinbase.publicKey &&
			senderSignature[0] === this.config.coinbase.signature[0] &&
			senderSignature[1] === this.config.coinbase.signature[1] &&
			from === this.config.coinbase.address
		);

		if (isNotCoinbaseSender) {
			// validate the FROM address is derived from the public key
			const hexAddress = await addressFromCompressedPubKey(senderPubKey);
			if (from !== hexAddress) {
				console.log({ derived: hexAddress, from: from });
				errors.push(
					`FROM address is not derived from sender's public key!`
				);
			}

			//validate signature is from public key (only if not a coinbase tx)
			const isSignatureValid = await verifySignature(
				transactionDataHash,
				senderPubKey,
				senderSignature
			);
			console.log('Signature from transaction just created is valid?', {
				isSignatureValid,
			});
			if (!isSignatureValid) {
				errors.push(`Transaction signature is invalid!`);
			}
		}

		// check for all fields
		const result = validateFields(
			Object.keys(signedTransaction),
			txBaseFields
		);
		if (result.valid !== true) {
			result.errors.forEach((errMsg) => errors.push(errMsg));
		}

		//check for invalid values :

		// handles {to, from, value, fee, dateCreated, data, senderPubKey}
		const basicResults = basicTxValidation({
			transaction: signedTransaction,
			prevDateParsed: Date.parse(
				this.pendingTransactions.slice(-1).dateCreated
			),
		});
		if (!basicResults.valid) {
			basicResults.errors.forEach((err) => errors.push(err));
		}

		// check balance of sender

		// sender account balance >= value + fee
		// (NOT allowing sending of pending funds)
		if (isNotCoinbaseSender) {
			const balancesOfSender = this.balancesOfAddress(
				signedTransaction.from
			);
			const spendingBalance = this.config.transactions
				.spendUnconfirmedFunds
				? balancesOfSender.pendingBalance
				: balancesOfSender.confirmedBalance;
			if (
				spendingBalance <
				signedTransaction.value + signedTransaction.fee
			) {
				errors.push(
					`Invalid transaction: 'from' address does not have enough funds!`
				);
			}
		}

		// build new transaction
		const newTransaction = await this.createHashedTransaction(
			signedTransaction
		);

		// check blockchain AND pending transactions for this transactionHash
		const foundTransaction = this.getTransactionByHash(
			newTransaction.transactionDataHash
		);
		if (foundTransaction) {
			errors.push(`Duplicate transaction data hash!`);
		}

		// if errors, return the errors
		if (errors.length > 0) {
			return { valid: false, errors, transaction: null };
		}

		return { valid: true, errors: null, transaction: newTransaction };
	}

	/*
	----------------------------------------------------------------
		MINING
	----------------------------------------------------------------
	*/

	mineGenesisBlock(block) {
		return this.mineBlock(block, 0, true);
	}

	// For special cases!
	mineBlock(block, nonce = 0, genesis = false) {
		console.log(`fn mine${genesis ? 'Genesis' : ''}Block:`, { block });
		let timestamp = genesis
			? CONFIG.CHAIN_BIRTHDAY
			: new Date().toISOString();
		let hash = SHA256(block.blockDataHash + '|' + timestamp + '|' + nonce);

		while (!isValidProof(hash, block.difficulty)) {
			timestamp = genesis
				? CONFIG.CHAIN_BIRTHDAY
				: new Date().toISOString();
			nonce += 1;
			hash = SHA256(block.blockDataHash + '|' + timestamp + '|' + nonce);
		}

		return {
			blockDataHash: block.blockDataHash,
			dateCreated: timestamp,
			nonce: nonce,
			blockHash: hash,
		};
	}

	/*
	----------------------------------------------------------------
		MINING JOBS
	----------------------------------------------------------------
	*/

	// mining
	clearMiningJobs() {
		console.log(`fn clearMiningJobs`);
		this.miningJobs.clear();
	}

	// mining
	saveMiningJob(candidate) {
		this.miningJobs.set(candidate.blockDataHash, candidate);
		console.log(
			`fn saveMiningJob: Candidate block prepared! Included ${
				candidate.transactions.length
			} transactions\n{${Object.entries(candidate)
				.map(
					([key, value]) =>
						`${key}: ${
							key === 'transactions' ? value.length : value
						},`
				)
				.join('\n')}`
		);
	}

	// mining
	async prepareBlockCandidate(minerAddress, difficulty = this.difficulty) {
		console.log(`fn prepareBlockCandidate`);
		// STEP 1: prepare coinbase tx paying the minerAddress; stick in a temporary transactions list
		const coinbaseTransaction = await this.createCoinbaseTransaction({
			to: minerAddress,
		});

		const blockIndex = coinbaseTransaction.minedInBlockIndex;

		// STEP 2: Prepare Transactions
		const pendingTransactions = this.pendingTransactions.map((txData) => ({
			...txData,
			transferSuccessful: true,
			minedInBlockIndex: index,
		}));

		const allTransactions = [
			coinbaseTransaction, // prepend
			...pendingTransactions,
		];

		console.log('-- ', {shouldBeCoinbaseTx: allTransactions[0]});

		// STEP 3: build our data needed for blockDataHash;
		const prevBlockHash = this.lastBlock().blockHash;
		const blockCandidate = new Block(
			blockIndex,
			allTransactions,
			difficulty,
			prevBlockHash,
			minerAddress
		);
		blockCandidate.hashData();


		// STEP 5: prepare final response to send back to the miner
		this.saveMiningJob(blockCandidate);
		return blockCandidate.prepareMiningJobResponse();

	}

	// step 1: find block candidate by its blockDataHash
	// step 2: verify hash and difficulty
	// step 3: if valid, add the new info to the block
	// step 4: check if block (index?) is not yet mined;
	// if not, we add our new verified block and propagate it! (notify other nodes so they may request it?)
	// if block is already mined, we were too slow so we return a sad error message!
	// mining
	validateMinedBlock({ blockDataHash, dateCreated, nonce, blockHash }) {
		console.log(`fn validateMinedBlock`);
		if (this.miningJobs.size === 0) {
			return {
				status: 400,
				message: "No mining jobs! Node must've reset",
			};
		}

		const foundBlockCandidate = this.miningJobs.get(blockDataHash) ?? null;
		if (!foundBlockCandidate) {
			return { status: 400, message: 'Mining job missing!' };
		}

		const blockHashIsValid = this.isValidBlockHash(
			blockDataHash,
			dateCreated,
			nonce,
			foundBlockCandidate.difficulty,
			blockHash
		);
		if (!blockHashIsValid) {
			return { status: 400, message: 'Block hash is not valid!' };
		}

		const completeBlock = {
			...foundBlockCandidate,
			nonce,
			dateCreated,
			blockHash,
		};

		if (completeBlock.index < this.chain.length) {
			return {
				errorMsg: `Block not found or already mined`,
				message: `...Too slow! Block not accepted. Better luck next time!`,
				status: 404,
			};
		}
		return {
			status: 200,
			message: 'Block is valid!',
			data: { foundBlockCandidate, completeBlock },
		};
	}

	submitBlockAndPropagate({ foundBlockCandidate, completeBlock }) {
		console.log(`fn submitBlockAndPropagate`);

		this.clearIncludedPendingTransactions(completeBlock);

		this.chain.push(completeBlock);

		this.cumulateDifficultyFromLastBlock();
		this.clearMiningJobs();

		this.updateDifficulty();

		this.propagateBlock();

		return {
			message: `Block accepted, reward paid: ${
				foundBlockCandidate.transactions[0].value +
				foundBlockCandidate.transactions[0].fee
			} microcoins`,
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

	// return {0, 0, 0} for non-active addresses (addresses with no transactions)
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
	confirmedBalanceOfAddress(address, confirmedTransactions) {
		return confirmedTransactions.reduce((sum, tx) => {
			if (tx.to === address && tx.transferSuccessful === true) {
				return sum + +tx.value;
			}
			if (tx.from === address) {
				return (
					sum -
					(+tx.fee + (tx.transferSuccessful === true) ? +tx.value : 0)
				);
			}
		}, 0);
	}

	safeBalanceOfAddress(address, confirmedTransactions) {
		const chainTipIndex = this.lastBlock().index;
		return confirmedTransactions.reduce((sum, tx) => {
			if (
				this.transactionConfirmations(tx, chainTipIndex) >=
				this.config.transactions.safeConfirmCount
			) {
				if (tx.to === address && tx.transferSuccessful === true) {
					return sum + +tx.value;
				}
				if (tx.from === address) {
					return (
						sum -
						(+tx.fee + (tx.transferSuccessful === true)
							? tx.value
							: 0)
					);
				}
			}
			return sum;
		}, 0);
	}
	pendingBalancesOfAddress(address, pendingTransactions) {
		return pendingTransactions.reduce(
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
	}
	balancesOfAddress(address) {
		console.log('fn balancesOfAddress', { address });
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
			balances.confirmedBalance += this.confirmedBalanceOfAddress(
				address,
				confirmedTransactions
			);

			balances.safeBalance += this.safeBalanceOfAddress(
				address,
				confirmedTransactions
			);
		}

		// pending balance also includes confirmed balance
		balances.pendingBalance += +balances.confirmedBalance;

		if (pendingTransactions.length > 0) {
			const [receivedTotal, sentTotal] = this.pendingBalancesOfAddress(
				address,
				pendingTransactions
			);

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
	allConfirmedAccountBalances() {
		console.log('---Getting all confirmed account balances...');
		let balances = {};
		for (const block of this.chain) {
			// console.log('scanning block', block.index);
			for (const transaction of block.transactions) {
				const { from, to, value, fee } = transaction;
				if (to in balances) {
					// adding to existing entry for received transaction
					balances[to] += value;
				} else {
					// creating new entry for received transaction
					balances[to] = value;
				}

				if (from in balances) {
					// adding to existing entry for sent transaction
					balances[from] -= fee + value;
				} else {
					// creating new entry for sent transaction
					balances[from] = 0 - (fee + value);
				}
			}
		}
		console.log('---done collecting balances');
		return balances;
	}

	// balances, addresses
	filterNonZeroBalances(balances) {
		const prunedBalances = {};
		for (const address in balances) {
			if (balances[address] !== 0) {
				prunedBalances[address] = balances[address];
			}
		}
		return prunedBalances;
	}
}

// Executing incoming chain Steps:
// 1. Create new blockchain instance w/ same genesis block
// 2.a. Loop through all the blocks, validating everything.
//   b. Loop through all transactions in the blocks, run like normal
//   c. Validate txns, add to pending txns

// After validating an entire block && transactions,
// 1. "Mine the block" or fake-mine the block. Need to basically calculate and check the hashes to make sure the nonce results in the difficulty.

async function executeIncomingChain(chain) {
	console.log(`fn executeIncomingChain`, { incomingChain: chain });

	// create new chain (and creates the matching genesis block)
	let instance = new Blockchain({ defaultServerPort: 5554, ...CONFIG });
	await instance.createGenesisBlock();

	try {
		// Loop through chain and validate each block:
		let blockIndex = 1;

		while (blockIndex < chain.length) {
			// validate this block
			const previousBlock = chain[blockIndex - 1];
			const incomingBlock = chain[blockIndex];
			instance.difficulty = incomingBlock.difficulty;
			const { valid, errors, block } = await instance.validateBlock(
				incomingBlock,
				previousBlock
			);
			if (!valid) {
				console.log('validateBlock has failed for block', blockIndex);
				throw new Error(
					`Block #${blockIndex} failed validation! Errors: ${errors.join(
						'\n'
					)}`
				);
			}

			// validate these transactions, add them to pending
			let txIndex = 0;
			while (txIndex < incomingBlock.transactions.length) {
				const thisTransaction = incomingBlock.transactions[txIndex];
				const {
					valid,
					errors,
					transaction: validatedTransaction,
				} = await instance.validateNewTransaction(thisTransaction);
				// if valid, add to pending transactions.
				console.log({ thisTransaction, validatedTransaction });

				if (valid) instance.addPendingTransaction(validatedTransaction);
				else
					throw Error(
						`Transaction index #${txIndex} (block #${blockIndex}) failed validation! Errors: ${errors.join(
							'\n'
						)}`
					);

				txIndex++;
			}
			// validate the mining of the block
			// recalculate blockDataHash
			// recalculate blockHash
			// validate prevBlockHash

			// includes miner reward tx
			const allTransactions = instance.pendingTransactions.map(
				(txData) => ({
					...txData,
					transferSuccessful: true,
					minedInBlockIndex: blockIndex,
				})
			);
			console.log({
				pending: instance.pendingTransactions,
				allTransactions,
			});

			// console.log(
			// 	'tx[0] is coinbase tx?',
			// 	incomingBlock.transactions[0].data === 'genesis tx'
			// );


			const coinbaseTx = findCoinbaseTransaction(
				instance.pendingTransactions
			);
			console.log({ coinbaseTx });

			const dataToHash = {
				index: blockIndex,
				transactions: allTransactions,
				difficulty: incomingBlock.difficulty,
				prevBlockHash: incomingBlock.prevBlockHash,
				minedBy: coinbaseTx.to,
			};

			const theirDataToHash = {
				index: incomingBlock.index,
				transactions: incomingBlock.transactions,
				difficulty: incomingBlock.difficulty,
				prevBlockHash: incomingBlock.prevBlockHash,
				minedBy: incomingBlock.minedBy,
			};

			console.log({ theirDataToHash, dataToHash });
			const blockDataHash = SHA256(dataToHash);
			console.log({
				theirs: chain[blockIndex].blockDataHash,
				ours: blockDataHash,
			});

			const blockHash = SHA256(
				`${blockDataHash}|${incomingBlock.dateCreated}|${incomingBlock.nonce}`
			);

			const theirTxString = incomingBlock.transactions
				.map(JSON.stringify)
				.join('\n');
			const ourTxString = incomingBlock.transactions
				.map(JSON.stringify)
				.join('\n');

			const differentCharsCount = Array.from(theirTxString)
				.map((char, index) => ourTxString[index] === char)
				.filter((item) => item === false).length;

			console.log({
				txStringsAreEqual: theirTxString === ourTxString,
				differences: differentCharsCount,
			});

			console.log({ theirs: chain[blockIndex], ours: incomingBlock });

			const blockIsValid = isValidProof(
				// const blockIsValid = this.isValidBlockHash(
				blockHash,
				incomingBlock.difficulty
			);

			if (!blockIsValid) {
				throw new Error(`Calculated blockHash is not valid!`);
			}

			// Block is All valid? Ready to roll forward!
			instance.clearIncludedPendingTransactions(incomingBlock);

			instance.chain.push(incomingBlock);

			instance.cumulateDifficultyFromLastBlock();

			blockIndex++;
		}
		// after all blocks

		// Time to compare cumulative difficulties!

		// Do I return the difficulty?
		return {
			valid: true,
			cumulativeDifficulty: instance.cumulativeDifficulty,
			errors: null,
		};
	} catch (error) {
		// if something fails during the chain execution, return false
		return { valid: false, cumulativeDifficulty: null, error: error };
	}
}

module.exports = { Blockchain };
// export default Blockchain;
