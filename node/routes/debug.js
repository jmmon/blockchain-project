const express = require("express");
const router = express.Router();
// const crypto = require("node:crypto");
// const app = express();
// app.use(express.json());

router.get("/", (req, res) => {
	const blockchain = req.app.get('blockchain');
	//debug info
	// const debugInfo = {
	// 	selfUrl: "url of this node",
	// 	chain: blockchain.chain,
	// 	pendingTransactions: blockchain.pendingTransactions,
	// 	confirmedBalances: "get transactions with 1 confirmation??",
	// };

	const node = {
		nodeId: '',
		host: '',
		port: '',
		selfUrl: '',
		peers: {},
		chain: {
			blocks: [
				{ // genesis block
					index: 0,
					transactions: [
						// ...transaction schema
					],
					difficulty: 0,
					minedBy: '',
					blockDataHash: '',
					nonce: 0,
					dateCreated: '',
					blockHash: '',
				}, 
				{
					//block 1
				}
			],
			pendingTransactions: [
				// ... transaction schema
				// without minedInBlockIndex
				// without transferSuccessful
			],
			currentDifficulty: 5,
			miningJobs: {
				'...blockDataHash...': {
					index: 3,
					transactions: [
						{}, {}
					],
					difficulty: '',
					prevBlockHash: '',
					minedBy: '',
					blockDataHash: '',
					blockHash: '',
				}
			},
		},
		chainId: '(genesis block hash)'
	};

	const config = {
		defaultServerHost: '',
		defaultServerPort: '',
		faucetPrivateKey: '',
		faucetPublicKey: '',
		faucetAddress: '',
		nullAddress: '0000....',
		nullPubKey: '0000...',
		nullSignature: ['', ''],
		startDifficulty: 5,
		minTransactionFee: 10,
		maxTransactionFee: 1000000,
		blockReward: 5000000,
		maxTransferValue: 10000000000000,
		safeConfirmCount: 3,
		genesisBlock: {
			index: 0,
			transactions: [],
			difficulty: 0,
			minedBy: '',
			blockDataHash: '',
			nonce: 0,
			dateCreated: '',
			blockHash: ''
		}
	};

	const confirmedBalances = {
		'00000...0000': -10000000000,
		'...addr 1...': 123456,
		'...addr 2...': 23456,
		'...addr 3...': 3456,
		'...addr 4...': 0,
	};

	const debugInfo = {
		node,
		config,
		confirmedBalances
	};

	res.status(200).send(JSON.stringify(debugInfo));
});


// works:
router.get("/reset-chain", (req, res) => { 
	const blockchain = req.app.get('blockchain');
	const success = blockchain.reset();
	if (success) {
		console.log("Chain reset\n" + JSON.stringify(blockchain.chain));
		res.status(200).send("yes chain was reset to genesis block");
	} else {
		res.status(400).send("no chain was not reset");
	}
});


router.get("/mine/:minerAddress/:difficulty", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const { minerAddress, difficulty } = req.params;
	//mine a block for miner address at difficulty??
	// or generate a mining job at address && difficulty??
	res.status(200).send("this should mine the block at the difficulty");
});


module.exports = router;