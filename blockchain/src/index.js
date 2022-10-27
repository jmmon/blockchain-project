const WALLET_UTILS_IMPORT_STRING = '../../libs/walletUtils/dist/index.js';
const verifySignature = (...args) =>
	import(WALLET_UTILS_IMPORT_STRING).then(({ default: { verifySignature } }) =>
		verifySignature(...args)
	);
const addressFromCompressedPubKey = (...args) =>
	import(WALLET_UTILS_IMPORT_STRING).then(({ default: { addressFromCompressedPubKey } }) =>
		addressFromCompressedPubKey(...args)
	);
const hashTransaction = (...args) =>
	import(WALLET_UTILS_IMPORT_STRING).then(({ default: { hashTransaction } }) =>
		hashTransaction(...args)
	);
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { CONFIG, txBaseFields, blockBaseFields } = require('./constants');
const Transaction = require('./Transaction');
const Block = require('./Block');
const { validateFields, basicTxValidation, validateBlockValues } = require('../../libs/validation');
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

	cumulateDifficulty(difficulty) {
		return 16 ** difficulty;
	}

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
		return addedDifficulty;
	}

	adjustDifficulty() {
		if (!this.config.difficulty.dynamic) {
			return;
		}
		const newDifficulty = this.darkGravityWave();

		this.difficulty =
			newDifficulty > this.config.difficulty.limit
				? this.config.difficulty.limit
				: newDifficulty;
	}

	// block, utils
	lastBlock() {
		return this.chain[this.chain.length - 1];
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
					(pastDifficultyAverage * count + thisIterationBlock.difficulty) / (count + 1);

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
		if (previousBlockTime > targetSpacing * (1 / blockTimeDifferenceRatio)) {
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
				targetSpacing * (blockTimeDifferenceRatio || this.config.difficulty.adjustmentRatio)
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
		const blockTxnDataHashes = block.transactions.map((txn) => txn.transactionDataHash);
		const remainingTransactions = this.pendingTransactions.filter(
			// pending keeping
			(txn) => !blockTxnDataHashes.includes(txn.transactionDataHash)
		);

		console.log({
			initialPendingCount,
			blockTxnCount: block.transactions.length,
			removedCount: initialPendingCount - remainingTransactions.length,
		});

		this.pendingTransactions = remainingTransactions;
	}

	// blocks
	async createGenesisBlock() {
		console.log('fn createGenesisBlock');
		const coinbaseTransaction = await this.createFaucetGenesisTransaction();

		const transactions = [coinbaseTransaction];
		// console.log('should be array with one object', { transactions });

		const genesisBlock = new Block(0, transactions, 0, '1', this.config.coinbase.address);
		genesisBlock.hashData();

		// next should "mine" the genesis block (hash it)
		const genesisCandidate = genesisBlock.prepareMiningJobResponse(true);
		const { nonce, dateCreated, blockHash } = this.mineGenesisBlock(genesisCandidate);

		// then we can build our final block with all the info, and push it to the chain
		genesisBlock.nonce = nonce;
		genesisBlock.dateCreated = dateCreated;
		genesisBlock.blockHash = blockHash;

		// Add valid block
		console.log({ finalGenesisBlock: genesisBlock });
		this.chain.push(genesisBlock);
		this.cumulateDifficultyFromLastBlock();

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
		// console.log('fn createFaucetGenesisTransaction');
		const faucetTransaction = await this.createCoinbaseTransaction({
			to: this.config.faucet.address,
			value: this.config.faucet.valueToGenerate,
			dateCreated: new Date(Date.parse(this.config.CHAIN_BIRTHDAY) + 10).toISOString(),
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
		// console.log('fn createCoinbaseTransaction', { newCoinbaseTransaction });
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
			if (transaction?.transactionDataHash === transactionDataHash) return transaction;
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
	transactionConfirmations(transaction, lastBlockIndex = this.lastBlock().index) {
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
		transactions.sort((a, b) => Date.parse(a.dateCreated) - Date.parse(b.dateCreated));

		return transactions;
	}

	// transactions
	getConfirmedTransactions(address = null) {
		console.log('fn getConfirmedTransactions');
		let transactions = [];
		for (const block of this.chain) {
			// console.log('for', { block }, 'searching transactions:', {
			// 	transactions: block.transactions,
			// });
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
								transaction?.to === address || transaction?.from === address
						), // add matching transactions
					];
				}
		}
		return transactions; // returns empty array if none found
	}

	// transactions
	getPendingTransactions(address = null) {
		if (!address) return this.pendingTransactions;

		return this.pendingTransactions.filter(
			(transaction) => transaction.to === address || transaction.from === address
		);
	}

	findCoinbaseTransaction = (transactions) =>
		transactions.filter((txn) => txn.data === 'coinbase tx')[0];
	/*
	----------------------------------------------------------------
		PEERS
	----------------------------------------------------------------
	*/

	isDifferentChain(theirId) {
		return this.config.chainId !== theirId;
	}
	// connect peer if not connected
	async connectAndSyncPeer(peerUrl, cameFromNode) {
		console.log('fn connectAndSyncPeer', { connectingTo: peerUrl });
		// STEP 1: try to fetch info from target node
		const response = await fetch(`${peerUrl}/info`);
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

		// STEP 2: validate the node is the same chain
		if (this.isDifferentChain(peerInfo.chainId)) {
			console.log('-- Other node is not on same chain');

			return {
				status: 400,
				errorMsg: `Chain ID does not match!`,
				thisChainId: this.config.chainId,
				peerChainId: peerInfo.chainId,
			};
		}

		// STEP 3: skip if already a peer. Otherwise, add peer, and if request came from a node, do not tell it to friend us back (because the node should already have us added)
		if (this.peers.get(peerNodeId)) {
			console.log(`-- check nodeId`, {
				status: 409,
				errorMsg: `Already connected to peer ${peerUrl}`,
			});
		} else {
			// same chain, node added
			this.peers.set(peerNodeId, peerUrl);
			console.log(`-- added peer:`, { peerUrl });
			// Send connect request to the new peer to ensure bi-directional connection
			if (!cameFromNode) {
				this.tellPeerToFriendUsBack(peerUrl);
			}
		}

		//synchronize chain AND pending transactions

		// STEP 4: If their chain is better, check their chain!
		const theirChainIsBetter = this.isTheirChainBetter(peerInfo.cumulativeDifficulty);

		console.log(`-- is their chain better? ${theirChainIsBetter ? 'YES' : 'NO'}`, {
			peerDifficulty: peerInfo.cumulativeDifficulty,
			ourDifficulty: this.cumulativeDifficulty,
		});
		if (theirChainIsBetter) {
			const { blocksCount, cumulativeDifficulty, nodeUrl } = peerInfo;
			this.checkChainFromPeer({
				blocksCount,
				cumulativeDifficulty,
				nodeUrl,
			});
		}

		console.log(` END fn connectPeer`);
		return {
			status: 200,
			message: `Connected to peer ${peerUrl}`,
		};
	}

	// tell them to add us
	tellPeerToFriendUsBack(peerUrl) {
		console.log(`-- tellPeerToFriendUsBack ( ${peerUrl} )`);
		fetch(`${peerUrl}/peers/connect`, {
			method: 'POST',
			body: JSON.stringify({
				peerUrl: this.config.node.selfUrl,
			}),
			headers: {
				'Content-Type': 'application/json',
				'from-node': 'true',
			},
		})
			.then((res) => res.json())
			.then((data) => {
				console.log(`-- friend's response:`, data);
			})
			.catch((err) => {
				console.log(`Error friending back peer @ ${peerUrl}! :`, err.message);
			});
	}

	transactionsWeHaveNotSeen(list) {
		console.log('fn transactionsWeHaveNotSeen:');
		// returns transactions not in pending && not in chain

		const keepTheseDataHashes = list.map((txn) => txn.transactionDataHash);
		const originalPendingCount = keepTheseDataHashes.length;

		console.log(
			`- Initial pending txns: ${originalPendingCount}\n${keepTheseDataHashes.join(', ')}`
		);
		// console.log({ chain: this.chain });

		for (const block of this.chain) {
			for (const { thisTxDataHash } of block.transactions) {
				// see if transaction is in incoming list
				const indexInPending = keepTheseDataHashes.indexOf(thisTxDataHash);

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

	theirChain = (peerUrl) => fetch(`${peerUrl}/blocks`).then((res) => res.json());

	theirPending = (peerUrl) => fetch(`${peerUrl}/transactions/pending`).then((res) => res.json());

	async checkChainFromPeer(
		{ blocksCount, cumulativeDifficulty: notifyCumDiff, nodeUrl },
		theirChain = null,
		firstBlockToCheck = 1
	) {
		console.log(`-- fn checkChainFromPeer`);

		let theirPending;
		if (theirChain === null) {
			[theirChain, theirPending] = await Promise.all([
				this.theirChain(nodeUrl),
				this.theirPending(nodeUrl),
			]).catch((err) => console.log('Error fetching node info:', { err }));

			console.log('testing promiseAll:', {
				theirChainLength: theirChain.length,
				theirPendingLength: theirPending.length,
			});
		} else {
			theirPending = await this.theirPending(nodeUrl);
		}

		console.log('-- validating chain');
		try {
			// execute the whole chain in a new blockchain
			const { valid, cumulativeDifficulty, error } = await this.executeIncomingChain(
				theirChain,
				firstBlockToCheck
			);
			// {blocksCount, cumulativeDifficulty, nodeUrl}
			if (!valid) {
				console.log(error);
				return console.log(`-- -- chain validation`, {
					valid: false,
					error: `Their chain isn't valid!`,
				});
			}

			console.log('-- -- Chain is valid! Checking difficulty...');
			console.log('-- cumulative difficulties:', {
				fromNotify: notifyCumDiff,
				ourCalcOfTheirChain: cumulativeDifficulty,
				ours: this.cumulativeDifficulty,
			});

			if (!this.isTheirChainBetter(cumulativeDifficulty)) {
				return console.log(`-- -- difficulty check`, {
					valid: false,
					error: `The valid chain isn't better than ours!`,
				});
			}
			console.log('-- -- Difficulty is better! Adding chain...');

			// CHAIN IS VALID AND BETTER:

			// replace chain, difficulty, and prep difficulty for the next block
			this.chain = theirChain;
			this.cumulativeDifficulty = cumulativeDifficulty;
			this.adjustDifficulty();

			// clear mining jobs (they are invalid)
			this.clearMiningJobs();
			console.log('-- -- Notifying peers of the new chain...');

			this.propagateBlock(this.peers, nodeUrl);
		} catch (err) {
			return console.log(`-- validate chain error:`, {
				valid: false,
				error: err.message,
			});
		}

		// Clean up current pendingTransactions:
		// Add those that are in the peer's pendingTransactions
		const uniqueTransactions = new Set([
			...this.pendingTransactions,
			...theirPending,
			// ...(await theirPending),
		]);
		// Keep those that are not in the chain
		this.pendingTransactions = this.transactionsWeHaveNotSeen(Array.from(uniqueTransactions));
		console.log(`-- Sync Pending Transactions`, {
			valid: true,
			message: 'Their chain was accepted!',
		});
		return {
			valid: true,
			message: 'Their chain was accepted!',
		};
	}

	// should be run any time the chain changes (when a block is mined)
	propagateBlock(peers, skipPeer = null) {
		if (peers.size === 0) {
			console.log(`fn propagateBlock: No peers`);
			return;
		}

		console.log(`fn propagateBlock: Attempting propagation to ${peers.size} peers...`);

		// prepare data to be sent
		const data = {
			blocksCount: this.chain.length,
			cumulativeDifficulty: this.cumulativeDifficulty,
			nodeUrl: this.config.node.selfUrl,
		};

		// notify peers of new chain!
		const peerEntries = peers.entries();
		for (const [peerId, peerUrl] of peerEntries) {
			if (skipPeer !== null && skipPeer === peerUrl) {
				console.log(`-- Skipping sender:`, { peerId, peerUrl });
				return;
			}

			this.propagateInfo(
				{
					selfUrl: this.config.node.selfUrl,
					url: `${peerUrl}/peers/notify-new-block`,
					data,
				},
				{ peerId, peerUrl }
			);
		}
	}

	// for propagating received transactions after they have been verified and added to the node
	propagateTransaction(signedTransaction, peers, sender) {
		if (peers.size === 0) {
			console.log(`fn propagateTransaction: no peers connected!`);
			return;
		}

		console.log(`fn propagateTransaction: Attempting propagation to ${peers.size} peers...`);

		const peerEntries = peers.entries();
		for (const [peerId, peerUrl] of peerEntries) {
			if (sender && sender === peerUrl) {
				console.log(`-- Skipping sender:`, { peerId, peerUrl });
				continue;
			}

			this.propagateInfo(
				{
					selfUrl: this.config.node.selfUrl,
					url: `${peerUrl}/transactions/send`,
					data: signedTransaction,
				},
				{ peerId, peerUrl },
				this.config.node.selfUrl
			);
		}
	}

	propagateInfo({ selfUrl, url, data }, { peerId, peerUrl }) {
		console.log(`-- propagating to: Node ${peerId} (${peerUrl})`);

		fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'sending-node-url': selfUrl,
			},
			body: JSON.stringify(data),
		})
			.then((res) => {
				if (res.status !== 200 && res.status !== 400) {
					// assuming no response, remove node
					this.peers.delete(peerId);
					console.log(`-- deleting peer ${peerId} because of incorrect response`);
				}
				return res.json();
			})
			.then((res) =>
				console.log(`-- response from ${peerId} (${url}):\n-- -- ${JSON.stringify(res)}`)
			)
			.catch((err) =>
				console.log(
					`Error propagating to Node ${peerId} (${url}): ${JSON.stringify(err.message)}`
				)
			);
	}

	isTheirChainBetter(theirCumulativeDifficulty) {
		return theirCumulativeDifficulty > this.cumulativeDifficulty;
	}
	isTheirChainLonger(length) {
		return length > this.chain.length;
	}

	// when a node shares a new block with us
	// keep our chain as far as it matches; then execute the new remainder and use it
	// this saves us from having to re-execute the entire matching chain when a block is received.
	async handleIncomingBlock({ blocksCount, cumulativeDifficulty, nodeUrl }) {
		// if their chain is longer or better, continue
		if (!this.isTheirChainLonger(blocksCount) && !this.isTheirChainBetter(cumulativeDifficulty))
			return;

		const theirChain = await this.theirChain(nodeUrl);
		const highestMatchingIndex = this.highestMatchingBlock(theirChain);

		console.log('--', {
			theirHighestIndex: theirChain.length - 1,
			highestMatchingIndex,
		});

		this.checkChainFromPeer(
			{ blocksCount, cumulativeDifficulty, nodeUrl },
			theirChain,
			highestMatchingIndex + 1
		);
	}

	highestMatchingBlock(theirChain) {
		// finds best matching and validated block. At worst, should be genesis block.
		let ourBlock = this.lastBlock();
		let currentIndex = ourBlock.index;
		let theirBlock = theirChain[currentIndex];
		console.log(`fn highestMatchingBlock: starting at ${currentIndex}`);

		// start at our last block, walk backwards until the blockHash matches
		while (ourBlock.blockHash !== theirBlock.blockHash) {
			currentIndex--;
			ourBlock = this.chain[currentIndex];
			theirBlock = theirChain[currentIndex];
		}
		console.log(`-- Matching index found at #${currentIndex}`);

		return currentIndex;
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
		// console.log('--', { block, previousBlock });
		// console.log('-- --', {
		// 	txs: block.transactions[0],
		// 	prevTxs: previousBlock.transactions[0],
		// });

		// validate block fields are present
		const fieldsResult = validateFields(Object.keys(block), blockBaseFields);
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
		// console.log({ thisTx: signedTransaction });
		let errors = [];
		const { senderPubKey, senderSignature, transactionDataHash, from } = signedTransaction;

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
				errors.push(`FROM address is not derived from sender's public key!`);
			}

			//validate signature is from public key (only if not a coinbase tx)
			const isSignatureValid = await verifySignature(
				transactionDataHash,
				senderPubKey,
				senderSignature
			);
			// console.log('Signature from transaction just created is valid?', {
			// 	isSignatureValid,
			// });
			if (!isSignatureValid) {
				errors.push(`Transaction signature is invalid!`);
			}
		}

		// check for all fields
		const result = validateFields(Object.keys(signedTransaction), txBaseFields);
		if (result.valid !== true) {
			result.errors.forEach((errMsg) => errors.push(errMsg));
		}

		//check for invalid values :

		// handles {to, from, value, fee, dateCreated, data, senderPubKey}
		const basicResults = basicTxValidation({
			transaction: signedTransaction,
			prevDateParsed: Date.parse(this.pendingTransactions.slice(-1).dateCreated),
		});
		if (!basicResults.valid) {
			basicResults.errors.forEach((err) => errors.push(err));
		}

		// check balance of sender

		// sender account balance >= value + fee
		// (NOT allowing sending of pending funds)
		if (isNotCoinbaseSender) {
			const balancesOfSender = this.balancesOfAddress(signedTransaction.from);
			const spendingBalance = this.config.transactions.spendUnconfirmedFunds
				? balancesOfSender.pendingBalance
				: balancesOfSender.confirmedBalance;
			if (spendingBalance < signedTransaction.value + signedTransaction.fee) {
				errors.push(`Invalid transaction: 'from' address does not have enough funds!`);
			}
		}

		// build new transaction
		const newTransaction = await this.createHashedTransaction(signedTransaction);

		// check blockchain AND pending transactions for this transactionHash
		const foundTransaction = this.getTransactionByHash(newTransaction.transactionDataHash);
		if (foundTransaction) {
			errors.push(`Duplicate transaction data hash!`);
		}

		// if errors, return the errors
		if (errors.length > 0) {
			return { valid: false, errors, transaction: null };
		}

		// console.log({ validatedTx: newTransaction});
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
		let timestamp = genesis ? CONFIG.CHAIN_BIRTHDAY : new Date().toISOString();
		let hash = SHA256(block.blockDataHash + '|' + timestamp + '|' + nonce);

		while (!isValidProof(hash, block.difficulty)) {
			timestamp = genesis ? CONFIG.CHAIN_BIRTHDAY : new Date().toISOString();
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
				.map(([key, value]) => `${key}: ${key === 'transactions' ? value.length : value},`)
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
			minedInBlockIndex: blockIndex,
		}));

		const allTransactions = [
			coinbaseTransaction, // prepend
			...pendingTransactions,
		];

		// console.log('-- ', { shouldBeCoinbaseTx: allTransactions[0] });

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

	validateMinedBlock(minedBlockData) {
		console.log(`fn validateMinedBlock`);
		if (this.miningJobs.size === 0) {
			return {
				message: 'Error: mining jobs were cleared, try again!',
				status: 400,
			};
		}

		// STEP 1: find saved block candidate
		const foundBlockCandidate = this.miningJobs.get(minedBlockData.blockDataHash) ?? null;
		if (!foundBlockCandidate) {
			return {
				message: 'Mining job missing!',
				status: 400,
			};
		}

		const { index, transactions, difficulty, prevBlockHash, minedBy, blockDataHash } =
			foundBlockCandidate;

		// STEP 2: build block from data
		const completeBlock = new Block(
			index,
			transactions,
			difficulty,
			prevBlockHash,
			minedBy,
			blockDataHash,
			minedBlockData.nonce,
			minedBlockData.dateCreated,
			minedBlockData.blockHash
		);

		// STEP 3: check if block hash is valid
		const blockHashIsValid = completeBlock.hasValidProof();
		if (!blockHashIsValid) {
			return { message: 'Block hash is not valid!', status: 400 };
		}

		// STEP 3.B: make sure index is correct
		if (completeBlock.index !== this.chain.length) {
			return {
				message: `Too slow! Chain has moved past this block. Try again!`,
				status: 404,
			};
		}

		return {
			message: 'Block is valid!',
			status: 200,
			data: { foundBlockCandidate, completeBlock },
		};
	}

	// could belong on node class
	submitBlockAndPropagate({ foundBlockCandidate, completeBlock }) {
		console.log(`fn submitBlockAndPropagate`);

		this.clearIncludedPendingTransactions(completeBlock);
		this.chain.push(completeBlock);
		this.cumulateDifficultyFromLastBlock();
		this.clearMiningJobs();
		this.adjustDifficulty();

		this.propagateBlock(this.peers); // could belong on Node class

		return {
			message: `Block accepted, reward paid: ${foundBlockCandidate.transactions[0].value} microcoins`,
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
				return sum - (+tx.fee + (tx.transferSuccessful === true) ? +tx.value : 0);
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
					return sum - (+tx.fee + (tx.transferSuccessful === true) ? tx.value : 0);
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

		if (confirmedTransactions.length === 0 && pendingTransactions.length === 0) {
			return balances; // return 0s balance object
		}

		if (confirmedTransactions.length > 0) {
			balances.confirmedBalance += this.confirmedBalanceOfAddress(
				address,
				confirmedTransactions
			);

			balances.safeBalance += this.safeBalanceOfAddress(address, confirmedTransactions);
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

	// Executing incoming chain Steps:
	// 1. Create new blockchain instance w/ same genesis block
	// 2.a. Loop through all the blocks, validating everything.
	//   b. Loop through all transactions in the blocks, run like normal
	//   c. Validate txns, add to pending txns

	// After validating an entire block && transactions,
	// 1. "Mine the block" or fake-mine the block. Need to basically calculate and check the hashes to make sure the nonce results in the difficulty.

	logging_blockRebuildValidation(incomingBlock, blockCandidate) {
		// logging...
		console.log('-- should be equal:', {
			theirs: incomingBlock.blockDataHash,
			ours: blockCandidate.blockDataHash,
		});
		const theirTxString = incomingBlock.transactions.map(JSON.stringify).join('\n');
		const ourTxString = blockCandidate.transactions.map(JSON.stringify).join('\n');

		const differentCharsCount = Array.from(theirTxString)
			.map((char, index) => ourTxString[index] === char)
			.filter((item) => item === false).length;
		console.log({
			txStringsAreEqual: theirTxString === ourTxString,
			differences: differentCharsCount,
		});

		console.log({
			theirs: incomingBlock.blockHash,
			ours: blockCandidate.blockHash,
		});
	}

	async executeIncomingChain(chain, firstBlockToCheck = 1) {
		console.log(`fn executeIncomingChain:`, {
			length: chain.length,
			firstBlockToCheck,
		});
		firstBlockToCheck = firstBlockToCheck < 1 ? 1 : firstBlockToCheck;

		// Only when triggering from /notify-new-block
		console.log(`-- Keeping section from genesis to block #${firstBlockToCheck - 1}`);

		let counter = {
			incoming: {
				blocks: firstBlockToCheck,
				transactions: firstBlockToCheck,
			},
			ours: {
				blocks: firstBlockToCheck,
				transactions: firstBlockToCheck,
			},
		};

		// create new chain
		let instance = new Blockchain({ ...CONFIG });

		// we start validation where the blockHash is different
		const chainSectionToKeep = [...this.chain.slice(0, firstBlockToCheck)];

		// so the difficulty lines up for the incoming chain
		chainSectionToKeep.forEach((block) => {
			instance.chain.push(block);
			instance.cumulateDifficultyFromLastBlock();
		});

		console.log('-- instance chain starting length:', instance.chain.length);

		let blockIndex = firstBlockToCheck;

		try {
			// Loop through chain and validate each block:
			while (blockIndex < chain.length) {
				counter.incoming.blocks++;
				const previousBlock = chain[blockIndex - 1];
				const incomingBlock = chain[blockIndex];
				instance.difficulty = incomingBlock.difficulty;

				// STEP 1: validate block
				const { valid, errors } = await instance.validateBlock(
					incomingBlock,
					previousBlock
				);
				if (!valid) {
					console.log('validateBlock has failed for block', blockIndex);
					throw new Error(
						`Block #${blockIndex} failed validation! Errors: ${errors.join('\n')}`
					);
				}

				// STEP 2: validate these transactions, add them to pending
				let txIndex = 0;
				while (txIndex < incomingBlock.transactions.length) {
					counter.incoming.transactions++;
					const thisTransaction = incomingBlock.transactions[txIndex];
					const {
						valid,
						errors,
						transaction: validatedTransaction,
					} = await instance.validateNewTransaction(thisTransaction);
					// if valid, add to pending transactions.

					if (valid) instance.addPendingTransaction(validatedTransaction);
					else
						throw Error(
							`Transaction index #${txIndex} (block #${blockIndex}) failed validation! Errors: ${errors.join(
								'\n'
							)}`
						);

					txIndex++;
					counter.ours.transactions++;
				}

				// STEP 2.B. collect all transactions, and identify coinbase tx
				const allTransactions = instance.pendingTransactions.map((txData) => ({
					...txData,
					transferSuccessful: true,
					minedInBlockIndex: blockIndex,
				}));
				// console.log({
				// 	allTransactions,
				// 	is0Coinbase:
				// 		allTransactions[0].from ===
				// 		instance.config.coinbase.address,
				// });

				const coinbaseTx = instance.findCoinbaseTransaction(instance.pendingTransactions);
				// console.log({ coinbaseTx });

				// validate the mining of the block
				// recalculate blockDataHash
				// recalculate blockHash
				// validate prevBlockHash

				// STEP 3: build our data needed for blockDataHash;
				const prevBlockHash = instance.lastBlock().blockHash;
				const blockCandidate = new Block(
					blockIndex,
					allTransactions,
					incomingBlock.difficulty,
					prevBlockHash,
					coinbaseTx.to,
					'', // blockDataHash
					incomingBlock.nonce,
					incomingBlock.dateCreated,
					'' // blockHash
				);
				blockCandidate.hashData();

				// STEP 4: hash the block and validate the hash
				const blockHashIsValid = blockCandidate.hasValidProof();
				// this.logging_blockRebuildValidation(
				// 	incomingBlock,
				// 	blockCandidate
				// );

				if (!blockHashIsValid) {
					throw new Error(`Calculated blockHash is not valid!`);
				}

				// STEP 5: Block is valid, do cleanup
				instance.clearIncludedPendingTransactions(blockCandidate);
				instance.chain.push(blockCandidate);
				instance.cumulateDifficultyFromLastBlock();

				blockIndex++;
				counter.ours.blocks++;
			}

			console.log('-- Done executing chain:', {
				incomingChain: {
					blocks: counter.incoming.blocks,
					transactions: counter.incoming.transactions,
				},
				ours: {
					blocks: counter.ours.blocks,
					transactions: counter.ours.transactions,
				},
			});

			// after all validation
			// Time to compare cumulative difficulties!
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
}

module.exports = { Blockchain };
// export default Blockchain;
