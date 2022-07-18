const express = require("express");
const router = express.Router();



router.get("/get-mining-job/:address", (req, res) => {
	const blockchain = req.app.get('blockchain');
	// prepare block candidate and send to miner
	// (miner then finds nonce and sends it back)
	const {address: minerAddress} = req.params;

	const blockCandidate = blockchain.prepareBlockCandidate(minerAddress);

	res.status(200).send(JSON.stringify(blockCandidate));
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


	// step 1: find block candidate by its blockDataHash
	// (node should have map of {blockDataHash1: block1 ...})

	// step 2: verify hash and difficulty (I guess we just use the provided info to double check the hash matches the block difficulty)

	// step 3: build the next block by adding the new info if correct

	// step 4: check if block (index?) is not yet mined;
	// if not, we add our new verified block and propagate it! (notify other nodes so they may request it?)

	//if block is already mined, we were too slow so we return a sad error message!

	const response = {};
	const valid = true;

	if (valid) {
		response.message = `Block accepted, reward paid: 500350 microcoins`;
		response.status = 200;
	} else {
		response.message = `...Too slow! Block not accepted. Better luck next time!`;
		response.errorMsg = `Block not found or already mined`;
		response.status = 404;
	}

	res.status(response.status).send(JSON.stringify(response));
});




module.exports = router;