const express = require("express");
const router = express.Router();



router.get("/get-mining-job/:address", (req, res) => {
	const blockchain = req.app.get('blockchain');
	// prepare block candidate and send to miner
	// (miner then finds nonce and sends it back)
	const {address: minerAddress} = req.params;

	const blockDataHash = "hash of block without nonce; miner takes this and increments nonce to find correct hash";

	const response = {
		index: blockchain.chain.length + 1,	// index of next block
		transactionsIncluded: blockchain.pendingTransactions,	// # of transactions in next block
		difficulty: 5,	// difficulty of next block
		expectedReward: blockchain.blockReward,
		rewardAddress: minerAddress,
		blockDataHash
	};

	res.status(200).send(JSON.stringify(response));
});



// TODO:
router.post("/submit-mined-block", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const data = req.body;
	/* 
	// receive completed (hashed) mining job from miner:

	data: {
		blockDataHash: block.blockDataHash,
		dateCreated: timestamp,
		nonce: nonce,
		blockHash: hash,
	};
	*/
	//should verify it and use it and propagate to other nodes?

	const response = {};
	const valid = true;

	if (valid) {
		response.message = `Block accepted, reward paid: 500350 microcoins`;
	} else {
		response.message = `...Too slow! Block not accepted. Better luck next time!`;
	}

	res.status(200).send(JSON.stringify(response));
});




module.exports = router;