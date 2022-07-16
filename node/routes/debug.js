const express = require("express");
const router = express.Router();
// const crypto = require("node:crypto");
// const app = express();
// app.use(express.json());

router.get("/", (req, res) => {
	const blockchain = req.app.get('blockchain');
	//debug info
	const debugInfo = {
		selfUrl: "url of this node",
		chain: blockchain.chain,
		pendingTransactions: blockchain.pendingTransactions,
		confirmedBalances: "get transactions with 1 confirmation??",
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