const express = require("express");
const router = express.Router();
// const crypto = require("node:crypto");
// const app = express();
// app.use(express.json());

router.get("/", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const nodeInfo = req.app.get('nodeInfo');

	const node = {
		nodeId: nodeInfo.nodeId,
		host: nodeInfo.host,
		port: nodeInfo.port,
		selfUrl: nodeInfo.selfUrl,
		peers: blockchain.peers(),
		chain: blockchain.chain,
		chainId: blockchain.config.genesisBlock.blockHash,
	};


	// const confirmedBalances = {
	// 	'example': 9001,
	// 	'00000...0000': -10000000000,
	// 	'...addr 1...': 123456,
	// 	'...addr 2...': 23456,
	// 	'...addr 3...': 3456,
	// 	'...addr 4...': 0,
	// };

	const confirmedBalances = blockchain.allConfirmedAccountBalances();

	const debugInfo = {
		node,
		config: blockchain.config,
		confirmedBalances
	};

	res.status(200).send(JSON.stringify(debugInfo));
});


// works:
router.get("/reset-chain", (req, res) => { 
	const blockchain = req.app.get('blockchain');
	const success = blockchain.reset();
	if (success) {
		console.log("Chain reset\nChain: " + JSON.stringify(blockchain.chain));
		res.status(200).send("yes chain was reset to genesis block");
	} else {
		res.status(400).send("no chain was not reset");
	}
});



//Step 1: prepare block
//Step 2: mine block
//Step 3: submit block
router.get("/mine/:minerAddress/:difficulty", async (req, res) => {
	const blockchain = req.app.get('blockchain');
	const { minerAddress, difficulty } = req.params;
	const newBlockJob = blockchain.prepareBlockCandidate(minerAddress, difficulty);
	const minedBlockData = await blockchain.mineBlock(newBlockJob);
	const response = blockchain.submitMinedBlock(minedBlockData);
	res.status(response.status).send(JSON.stringify(response));
});


module.exports = router;