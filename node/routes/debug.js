const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const node = req.app.get('node');

	const nodeInfo = {
		nodeId: node.nodeId,
		host: node.host,
		port: node.port,
		selfUrl: node.selfUrl,
		peers: blockchain.peers(),
		chain: blockchain.chain,
		chainId: blockchain.config.genesisBlock.blockHash,
	};

	const confirmedBalances = blockchain.allConfirmedAccountBalances();

	const debugInfo = {
		node: nodeInfo,
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