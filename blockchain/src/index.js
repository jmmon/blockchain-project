const fetch = import('node-fetch');
const crypto = require('crypto');
const {
	CONFIG,
	txBaseFields,
	txAllFields,
	blockBaseFields,
	hexPattern,
	// blockRequiredValues,
} = require('./constants');
const Transaction = require('./Transaction');
const Block = require('./Block');
const {
	typeCheck,
	invalidStringGen,
	upperFirstLetter,
	lengthCheck,
	patternCheck,
	valueCheck,
	addFoundErrors,
} = require('./valueChecks');
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
} = import('../../walletUtils/index.js');

const SHA256 = (message) =>
	crypto.createHash('sha256').update(message).digest('hex');

// const sortObjectByKeys = (object) => {
// 	const sortedKeys = Object.keys(object).sort((a, b) => a - b);
// 	let newObject = {};
// 	sortedKeys.forEach((key) => (newObject[key] = object[key]));
// 	return newObject;
// };

// class Blockchain implements IBlockchain {
class Blockchain {
	constructor(config = CONFIG) {
		this.config = { ...config };
		this.chain = [];
		this.pendingTransactions = [];
		// this.peers = new Set();
		this.peers = new Map();
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
		return true;
	}

	// blocks, utils
	//calculate cumulative difficulty:
	// difficulty for difficulty(p) === 16 * difficulty(p-1)
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
		return hash.slice(0, difficulty) === '0'.repeat(difficulty);
	}

	// blocks, utils
	validateBlockHash(timestamp, nonce, blockDataHash, difficulty, blockHash) {
		const hash = SHA256(blockDataHash + '|' + timestamp + '|' + nonce);
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

	/*
	----------------------------------------------------------------
		VALIDATION
	----------------------------------------------------------------
	*/

	// validation, utils
	validateAddress(address) {
		const label = 'Address';
		const typeResult = typeCheck({ label, value: address, type: 'string' });
		const patternResult = patternCheck({
			label,
			value: address,
			pattern: hexPattern,
			expected: 'to be valid hex string',
			actual: `not valid hex string`,
		});
		const lengthResult = lengthCheck({
			label,
			value: address,
			expected: 40,
			type: '===',
		});

		const missing = [typeResult, patternResult, lengthResult].filter(
			(result) => result !== false
		);
		const valid = missing.length === 0;
		if (valid) return { valid, missing: null };
		return { valid, missing };
	}

	// validation
	validatePublicKey(pubKey) {
		const label = 'SenderPubKey';
		const results = [
			typeCheck({ label, value: pubKey, type: 'string' }),
			lengthCheck({
				label,
				value: pubKey,
				expected: 65,
				type: '===',
			}),
			patternCheck({
				label,
				value: pubKey,
				pattern: hexPattern,
				expected: 'to be hex string',
				actual: 'is not hex string',
			}),
		];

		const missing = results.filter((result) => result !== false);
		const valid = missing.length === 0;
		if (valid) return { valid, missing: null };
		return { valid, missing };
	}

	validateValue(value) {
		let label = 'Value';
		const results = [
			typeCheck({
				label,
				value: value,
				type: 'number',
			}),
			valueCheck({
				label,
				value: value,
				expected: 0,
				type: '>=',
			}),
		];
		const missing = results.filter((result) => result !== false);
		const valid = missing.length === 0;
		if (valid) return { valid, missing: null };
		return { valid, missing };
	}

	validateFee(fee) {
		let label = 'Fee';
		const results = [
			typeCheck({
				label,
				value: fee,
				type: 'number',
			}),
			valueCheck({
				label,
				value: fee,
				expected: this.config.minTransactionFee,
				type: '>=',
			}),
		];
		const missing = results.filter((result) => result !== false);
		const valid = missing.length === 0;
		if (valid) return { valid, missing: null };
		return { valid, missing };
	}

	validateData(data) {
		const label = 'Data';
		const results = [
			typeCheck({
				label,
				value: data,
				type: 'string',
			}),
		];
		const missing = results.filter((result) => result !== false);
		const valid = missing.length === 0;
		if (valid) return { valid, missing: null };
		return { valid, missing };
	}

	validateDateCreated(dateCreated, prevDateCreated, currentTime) {
		const label = 'DateCreated';
		const results = [
			typeCheck({
				label,
				value: dateCreated,
				type: 'number',
			}),

			// should be before right now
			dateCreated > currentTime
				? invalidStringGen({
						label,
						expected: `transaction to be created before current time`,
						actual: `transaction created ${
							dateCreated - currentTime
						}ms after current time`,
				  })
				: false,

			// should be after previous transaction
			prevDateCreated && dateCreated <= prevDateCreated
				? invalidStringGen({
						label,
						expected: `prevTransaction to be created before block`,
						actual: `transaction created ${
							prevDateCreated - dateCreated
						}ms before prevTransaction`,
				  })
				: false,
		];
		const missing = results.filter((result) => result !== false);
		const valid = missing.length === 0;
		if (valid) return { valid, missing: null };
		return { valid, missing };
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
			prevBlockHash: '1',
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
				'1',
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
			data: 'genesis tx',
		});
	}

	// transactions
	createCoinbaseTransaction({
		from = this.config.nullAddress,
		to,
		value = this.config.blockReward + 350,
		fee = 0,
		dateCreated = new Date().toISOString(),
		data = 'coinbase tx',
		senderPubKey = this.config.nullPublicKey,
		// transactionDataHash: get this inside our function
		senderSignature = this.config.nullSignature,
		minedInBlockIndex = this.chain.length,
		transferSuccessful = true,
	}) {
		return {
			...this.createHashedTransaction({
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

	createHashedTransaction({
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
		lastBlockIndex = this.getLastBlock().index
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

	// transactions
	getPendingTransactions(address = null) {
		if (!address) return this.pendingTransactions;

		return this.pendingTransactions.filter(
			(transaction) =>
				transaction.to === address || transaction.from === address
		);
	}

	/*
	----------------------------------------------------------------
		PEERS
	----------------------------------------------------------------
	*/
	// peers
	async requestPeer(peerUrl) {
		const response = await (
			await fetch(`${peerUrl}/peers/connect`, {
				method: 'POST',
				body: JSON.stringify({ peerUrl }),
				headers: { 'Content-Type': 'application/json' },
			})
		).json();
		console.log(`RequestPeer(${peerUrl}) => ${response}`);
		return response;
	}

	// peers
	// connect peer if not connected
	async connectPeer(peerUrl) {
		// try to fetch info
		const response = await fetch(`${peerUrl}/info`);
		if (response.statusCode !== 200) {
			return {
				status: 400,
				errorMsg: `Network error: Could not get peer info`,
			};
		}

		const peerInfo = await response.json();
		const peerNodeId = peerInfo.nodeId;
		// if nodeId is already connected, don't try to connect again
		if (this.peers.get(peerNodeId)) {
			return {
				status: 409,
				errorMsg: `Already connected to peer ${peerUrl}`,
			};
		}

		// Verify same chainId
		const isSameChain =
			this.config.genesisBlock.chainId === peerInfo['chainId'];

		if (!isSameChain) {
			return {
				status: 400,
				errorMsg: `Chain ID does not match!`,
				thisChainId: ourChainId,
				peerChainId,
			};
		}

		// same chain, node added
		this.peers.set(peerNodeId, peerUrl);
		console.log(`--added peer: ${{ peerNodeId, peerUrl }}`);

		// Send connect request to the new peer to ensure bi-directional connection
		requestPeer(peerUrl);

		//synchronize chain AND pending transactions
		const theirChainIsBetter =
			peerInfo.cumulativeDifficulty > this.cumulativeDifficulty;
		if (theirChainIsBetter) {
			syncPeer(peerInfo, peerUrl);
		}

		return { status: 200, message: `Connected to peer ${peerUrl}` };
	}

	/*
	----------------------------------------------------------------
		Syncing between peers/nodes
	----------------------------------------------------------------
	*/

	// peers, sync
	// Their chain is better, we need to download and validate their chain
	async syncPeer(peerInfo, peerUrl) {
		console.log(`Syncing with better chain from peer`);
		const response = await fetch(`${peerUrl}/blocks`);
		const theirChain = await response.json();
		if (!response.statusCode === 200)
			return { valid: false, error: 'Cannot get peer chain' };

		let result = { valid: null, error: null };

		const ourChainLength = this.chain.length;
		const theirChainLength = theirChain.length;

		// TODO:
		// validate downloaded peer chain (blocks, transactions, etc)
		this.validateChain(theirChain);
		// if valid, replace current chain, and notify all peers of the new chain

		// TODO:
		// sync pending transactions (only if chain was valid??)
		this.syncPendingTransactions(peerUrl);
		// console.log(result);
		// return result;
	}

	// peers, transactions
	synchronizePendingTransactions(peerUrl) {
		//fetch /transactions/pending and append missing transactions
		// be sure to check for duplicated hashes!
	}

	/*
	----------------------------------------------------------------
		VALIDATION FOR PEER SYNC	
	----------------------------------------------------------------
	*/

	// takes chain, returns true or false;
	// chain, validation
	validateChain(chain) {
		// Ensure same genesis block
		if (chain[0] !== this.chain[0]) {
			console.log(
				`Genesis blocks don't match!\nOurs ${this.chain[0]}\nTheirs: ${chain[0]}`
			);
			return false;
		}

		// Loop through chain and validate each block:
		let previousBlock = chain[0];
		console.log({ genesis: previousBlock });
		let currentIndex = 1;

		while (currentIndex < chain.length) {
			const block = chain[currentIndex];
			console.log({ currentBlock: block });
			console.log('\n--------\n');

			const result = this.validateBlock(block, previousBlock);
			if (!result.valid) return false;

			previousBlock = block;
			currentIndex++;
		}

		// TODO:
		/* 
			If chain has all been executed and validated,
				if new chain's cumulativeDifficulty > our cumulativeDifficulty
					replace ours with the new chain
					clear all mining jobs (because they are invalid)
		*/

		return true;
	}

	validateBlock(block, previousBlock) {
		let validationErrors = {};
		// TODO:

		// validate block fields are present
		const fieldsResult = validateFields(
			Object.keys(block),
			blockBaseFields
		);
		if (!fieldsResult.valid) {
			console.log(
				`Block fields are not valid, missing: [${fieldsResult.missing.join(
					', '
				)}]`
			);
			validationErrors.blockFields.missing = fieldsResult.missing;
		}

		// validate block values
		const valuesResult = validateBlockValues(block, previousBlock);
		if (!valuesResult.valid) {
			console.log(
				`Block values are not valid, errors: [${valuesResult.errors.join(
					', '
				)}]`
			);
			validationErrors.blockValues.missing = valuesResult.errors;
		}

		// validate transactions in the block:
		// 	validate fields, values, recalculate txDataHash, validate signature, re-execute transactions, re-create minedInBlockIndex & transferSuccessful
		this.validateBlockTransactions(block);

		// Then recalculate blockDataHash & blockHash

		// ensure blockHash matches blockDifficulty

		// validate prevBlockHash === previous block's blockHash

		// cumulate difficulty

		//check hash of previous block
		if (block['prevBlockHash'] !== this.hash(previousBlock)) {
			console.log('Previous hash does not match!');
			return false;
		}

		if (!this.validProof(block)) {
			console.log('Block PoW is Invalid!');
			return false;
		}

		// TODO: validate transactions in this current block
		if (!this.validateBlockTransactions(block)) {
			console.log('Invalid transactions found!');
			return false;
		}
		return { valid: true, block };
	}

	// validation, utils
	// returns {valid: boolean; missing: array | null}
	validateFields(fields, requiredFields) {
		let missing = [];
		for (const field of requiredFields) {
			if (!fields.includes(field)) {
				missing.push(field);
			}
		}
		return missing.length > 0
			? { valid: false, missing }
			: { valid: true, missing: null };
	}

	validateBlockValues(block, prevBlock) {
		// go thru each entry and make sure the value fits the "requirements"
		console.log('--validateBlockValues:', { block, prevBlock });

		let missing = [];
		let field = '';
		let label = '';
		let currentValue;

		field = 'index';
		label = upperFirstLetter(field);
		currentValue = block[field];
		addFoundErrors({
			missing,
			error: typeCheck({ label, value: currentValue, type: 'number' }),
		});
		addFoundErrors({
			missing,
			error: valueCheck({
				label,
				value: currentValue,
				expected: prevBlock[field] + 1,
				type: '===',
			}),
		});

		// transactions: should be array, should have length >= 1
		field = 'transactions';
		label = upperFirstLetter(field);
		currentValue = block[field];
		addFoundErrors({
			missing,
			error: typeCheck({ label, value: currentValue, type: 'array' }),
		});
		addFoundErrors({
			missing,
			error: lengthCheck({
				label,
				value: currentValue,
				expected: 1,
				type: '>=',
			}),
		});

		// difficulty: should be a number
		field = 'difficulty';
		label = upperFirstLetter(field);
		currentValue = block[field];
		addFoundErrors({
			missing,
			error: typeCheck({ label, value: currentValue, type: 'number' }),
		});

		// prevBlockHash: should be a string, should have only certain characters ?hex?, should be so many characters (40?), should match prevBlock blockHash (will do more validation later)
		field = 'prevBlockHash';
		label = upperFirstLetter(field);
		currentValue = block[field];
		addFoundErrors({
			missing,
			error: typeCheck({ label, value: currentValue, type: 'string' }),
		});
		if (currentValue !== prevBlock.blockHash) {
			addFoundErrors({
				missing,
				error: invalidStringGen({
					label: upperFirstLetter(field),
					expected: "value to match previous block's blockHash",
					actual: `is ${currentValue} instead of ${prevBlock.blockHash}`,
				}),
			});
		}
		if (block.index === 1) {
			// special case, special messages on these two
			if (currentValue !== '1') {
				addFoundErrors({
					missing,
					error: invalidStringGen({
						label: upperFirstLetter(field),
						expected: "index 1 prevBlockHash to be '1'",
						actual: `index 1 prevBlockHash is ${currentValue}`,
					}),
				});
			}
			if (currentValue.length !== 1) {
				addFoundErrors({
					missing,
					error: invalidStringGen({
						label: upperFirstLetter(field),
						expected: 'index 1 prevBlockHash.length to be 1',
						actual: `index 1 prevBlockHash.length === ${currentValue.length}`,
					}),
				});
			}
		} else {
			// only hex characters
			addFoundErrors({
				missing,
				error: patternCheck({
					label,
					value: currentValue,
					pattern: hexPattern,
					expected: 'to be valid hex string',
					actual: 'not valid hex string',
				}),
			});

			// 64 length
			addFoundErrors({
				missing,
				error: lengthCheck({
					label,
					value: currentValue,
					expected: 64,
					type: '===',
				}),
			});
		}

		// minedBy: should be an address, certain characters? || all 0's, 40 characters, string
		field = 'minedBy';
		label = upperFirstLetter(field);
		currentValue = block[field];
		addFoundErrors({
			missing,
			error: typeCheck({ label, value: currentValue, type: 'string:' }),
		});
		addFoundErrors({
			missing,
			error: patternCheck({
				label,
				value: currentValue,
				pattern: hexPattern,
				expected: 'to be valid hex string',
				actual: `not valid hex string`,
			}),
		});
		addFoundErrors({
			missing,
			error: lengthCheck({
				label,
				value: currentValue,
				expected: 40,
				type: '===',
			}),
		});

		// blockDataHash: should be string, only have certain characters, 40 characters?, (Will recalculate later)
		field = 'blockDataHash';
		currentValue = block[field];
		label = upperFirstLetter(field);
		addFoundErrors({
			missing,
			error: typeCheck({ label, value: currentValue, type: 'string' }),
		});
		addFoundErrors({
			missing,
			error: patternCheck({
				label,
				value: currentValue,
				pattern: hexPattern,
				expected: 'to be valid hex string',
				actual: `not valid hex string`,
			}),
		});
		addFoundErrors({
			missing,
			error: lengthCheck({
				label,
				value: currentValue,
				expected: 64,
				type: '===',
			}),
		});

		// nonce: should be a number, (later, will validate should give us the correct difficulty)
		field = 'nonce';
		label = upperFirstLetter(field);
		currentValue = block[field];
		addFoundErrors({
			missing,
			error: typeCheck({ label, value: currentValue, type: 'number' }),
		});

		// dateCreated: should be a number?? should be after the previous block's dateCreated, should be before today??
		field = 'dateCreated';
		label = upperFirstLetter(field);
		currentValue = block[field];
		addFoundErrors({
			missing,
			error: typeCheck({ label, value: currentValue, type: 'number' }),
		});
		if (currentValue <= prevBlock[field]) {
			addFoundErrors({
				missing,
				error: invalidStringGen({
					label: upperFirstLetter(field),
					expected: `prevBlock to be created before block`,
					actual: `block created ${
						prevBlock[field] - currentValue
					}ms before prevBlock`,
				}),
			});
		}
		const currentTime = Date.now();
		if (currentValue > currentTime) {
			addFoundErrors({
				missing,
				error: invalidStringGen({
					label: upperFirstLetter(field),
					expected: `block to be created before current time`,
					actual: `block created ${
						currentValue - currentTime
					}ms after current time`,
				}),
			});
		}

		// blockHash: should be a string, only certain characters, 40 characters? (recalc later)
		field = 'blockHash';
		label = upperFirstLetter(field);
		currentValue = block[field];
		addFoundErrors({
			missing,
			error: typeCheck({ label, value: currentValue, type: 'string' }),
		});
		addFoundErrors({
			missing,
			error: patternCheck({
				label,
				value: currentValue,
				pattern: hexPattern,
				expected: 'to be valid hex string',
				actual: `not valid hex string`,
			}),
		});
		addFoundErrors({
			missing,
			error: lengthCheck({
				label,
				value: currentValue,
				expected: 64,
				type: '===',
			}),
		});

		// finally, return the results!
		if (missing.length > 0) return { valid: false, missing };
		return { valid: true, missing: null };
	} // validateBlockValues

	// validation, utils
	validateBlockTransactions(block) {
		const transactions = block.transactions;

		let i = 0;
		let valid = true;
		while (valid) {
			const transaction = transactions[i];

			// validating transaction fields
			const fieldsResult = validateFields(
				Object.keys(transaction),
				txAllFields
			);

			if (!fieldsResult.valid) {
				valid = false;
			}

			// validating transaction values, recalc txDataHash, validate signature
			const valuesResult = validateTxValues(block, transaction);

			if (!valuesResult.valid) {
				valid = false;
			}

			const result = reexecuteTransaction(transaction);

			if (!result.valid) {
				valid = false;
			}

			// TODO:
			//		re-execute all transactions?;
			//		recalculate values of minedInBlockIndex and transferSuccessful fields;

			// re-execute all transactions
			// making sure that the inputs and outputs and fees add up?

			// re-calculate values of minedInBlockIndex && transferSuccessful
			// minedInBlockIndex: check that the block index is correct? That this block has this transaction?
			// transferSuccessful: make sure the transaction is included in a block ?

			// if any invalid, return false (with info about why??)

			i++;
		}

		return true;
	} // validateBlockTransactions

	basicTxValidation(transaction, date_transactions) {
		let valid = true;
		let errors = [];

		// to:
		let toAddrResult = this.validateAddress(transaction.to);
		if (!toAddrResult.valid) {
			toAddrResult.missing.forEach((err) => errors.push(err));
		}

		// from:
		let fromAddrResult = this.validateAddress(transaction.from);
		if (!fromAddrResult.valid) {
			fromAddrResult.missing.forEach((err) => errors.push(err));
		}

		// value: number, >=0
		const valueResult = this.validateValue(transaction.value);
		if (!valueResult.valid) {
			valueResult.missing.forEach((err) => errors.push(err));
		}

		// fee: number, >minFee
		const feeResult = this.validateFee(transaction.fee);
		if (!feeResult.valid) {
			feeResult.missing.forEach((err) => errors.push(err));
		}

		// dateCreated: should be a number?? should be after the previous transaction's dateCreated, should be before today??
		const currentTime = Date.now();
		const prevDateCreated =
			date_transactions[date_transactions.indexOf(transaction) - 1]
				.dateCreated || undefined;
		const dateCreatedResult = this.validateDateCreated(
			transaction.dateCreated,
			prevDateCreated,
			currentTime
		);
		if (!dateCreatedResult.valid) {
			dateCreatedResult.missing.forEach((err) => errors.push(err));
		}

		// data: string,
		const dataResult = this.validateData(transaction.data);
		if (!dataResult.valid) {
			dataResult.missing.forEach((err) => errors.push(err));
		}

		// senderPubKey: string, hex, 65chars?
		const pubKeyResult = this.validatePublicKey(transaction.senderPubKey);
		if (!pubKeyResult.valid) {
			pubKeyResult.missing.forEach((err) => errors.push(err));
		}
		return { valid, errors };
	}

	// validates {from, to, value, fee, dateCreated, data, senderPubKey} and does {revalidateTransactionDataHash, and verify&validateSignature}
	validateTxValues(block, transaction) {
		console.log('-- validateTxValues', { block, transaction });

		let errors = [];
		let field = '';
		let label = '';
		let currentValue;

		// handles {to, from, value, fee, dateCreated, data, senderPubKey}
		const basicResults = this.basicTxValidation(
			transaction,
			block.transactions
		);
		if (!basicResults.valid) {
			basicResults.errors.forEach((err) => errors.push(err));
		}

		// Step 2:
		// recalculate transactionDataHash
		field = 'transactionDataHash';
		label = upperFirstLetter(field);
		currentValue = transaction[field];
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
		} = transaction;
		const newHash = this.hashTransactionData({
			from,
			to,
			value,
			fee,
			dateCreated,
			data,
			senderPubKey,
		});
		addFoundErrors({
			missing,
			error: valueCheck({
				label,
				value: currentValue,
				expected: blockchain.hashTransaction(transaction),
				type: '===',
			}),
		});

		// validate signature
		field = 'senderSignature';
		label = upperFirstLetter(field);
		currentValue = transaction[field];
		const sigValid = verifySignature(
			transactionDataHash,
			senderPubKey,
			senderSignature
		);
		if (!sigValid) {
			addFoundErrors({
				missing,
				error: invalidStringGen({
					label: upperFirstLetter(field),
					expected: `transaction signature to be valid`,
					actual: `transaction signature is invalid`,
				}),
			});
		}

		if (missing.length > 0) return { valid: false, missing };
		return { valid: true, missing: null };
	} // validateBlockValues

	reexecuteTransaction(transaction) {}
	// what does it mean to re-execute transactions?
	// Need to track balances; need to re-buid some functionality to allow that probably
	// OR, could do a swapidoodle and save the current chain and pendingTransactions in a backup, then:
	// (if genesis is same) reset the chain and read the incoming chain's transactions as processes and execute them all.
	// Then in the end, I should be on the updated chain. And then reconcile the pendingTransactions by:
	// take old pending transactions, drop (filter out) ones that are in the new chain, and keep any others that might exist (and propagate them?)

	/*
	----------------------------------------------------------------
		MINING
	----------------------------------------------------------------
	*/

	// mining
	mineBlock(block, nonce = 0) {
		let timestamp = new Date().toISOString();
		let hash = SHA256(block.blockDataHash + '|' + timestamp + '|' + nonce);

		while (!this.validHash(hash, block.difficulty)) {
			timestamp = new Date().toISOString();
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
		this.miningJobs.clear();
	}

	// mining
	saveMiningJob(candidate) {
		this.miningJobs.set(candidate.blockDataHash, candidate);
		console.log(
			`Mining job saved! Block candidate prepared for mining.\nThis candidate:${JSON.stringify(
				candidate
			)}`
		);
	}

	// mining
	prepareBlockCandidate(minerAddress, difficulty = this.difficulty) {
		const coinbaseTransaction = this.createCoinbaseTransaction({
			// STEP 1: prepare coinbase tx paying the minerAddress; stick in a temporary transactions list
			to: minerAddress,
		});
		const index = coinbaseTransaction.minedInBlockIndex;

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

		// STEP 3: build our data needed for blockDataHash;
		const prevBlockHash = this.hash(this.chain[this.chain.length - 1]);

		const blockDataHash = SHA256(
			JSON.stringify({
				index,
				allTransactions,
				difficulty,
				prevBlockHash,
				minedBy: minerAddress,
			})
		);

		// STEP 4: save the block candidate;
		this.saveMiningJob(
			new Block(
				index,
				allTransactions,
				difficulty,
				prevBlockHash,
				minerAddress,
				blockDataHash
			)
		);

		// STEP 5: prepare final response to send back to the miner
		return {
			index,
			transactionsIncluded: allTransactions.length,
			difficulty,
			expectedReward: coinbaseTransaction.value,
			rewardAddress: minerAddress,
			blockDataHash,
		};
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

		const foundBlock = this.miningJobs.get(blockDataHash) ?? null;

		if (!foundBlock) {
			return { status: 404, message: 'Mining job missing!' };
		}

		const isValid = this.validateBlockHash(
			dateCreated,
			nonce,
			blockDataHash,
			foundBlock.difficulty,
			blockHash
		);

		if (!isValid) {
			return { status: 400, message: 'Block hash is not valid!' };
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
	balancesOfAddress(address) {
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
							(+tx.fee + (tx.transferSuccessful === true)
								? +tx.value
								: 0)
						);
					}
				},
				0
			);

			balances.safeBalance += confirmedTransactions.reduce((sum, tx) => {
				if (
					this.transactionConfirmations(tx, chainTipIndex) >=
					this.config.safeConfirmCount
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
	allConfirmedAccountBalances() {
		console.log('---Getting all confirmed account balances...');
		let balances = {};
		for (const block of this.chain) {
			console.log('scanning block', block.index);
			for (const transaction of block.transactions) {
				// console.log('found transaction', transaction.transactionDataHash);
				const { from, to, value, fee } = transaction;
				//handle {to: address}
				if (to in balances) {
					console.log(
						'adding to existing entry for received transaction'
					);
					balances[to] += value;
				} else {
					console.log('creating new entry for received transaction');
					balances[to] = value;
				}

				//handle {from: address}
				if (from in balances) {
					console.log(
						'adding to existing entry for sent transaction'
					);
					balances[from] -= fee + value;
				} else {
					console.log('creating new entry for sent transaction');
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

module.exports = Blockchain;
// export default Blockchain;
