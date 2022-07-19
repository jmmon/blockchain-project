const express = require("express");
const router = express.Router();

router.get("/get-mining-job/:address", (req, res) => {
	const blockchain = req.app.get("blockchain");
	// prepare block candidate and send to miner
	// (miner then finds nonce and sends it back)
	const { address: minerAddress } = req.params;

	const blockCandidate = blockchain.prepareBlockCandidate(minerAddress);

	res.status(200).send(JSON.stringify(blockCandidate));
});



// Done, needs testing
router.post("/submit-mined-block", (req, res) => {
	const blockchain = req.app.get("blockchain");
	const { blockDataHash, dateCreated, nonce, blockHash } = req.body;
	/* 
	miner sends us: {
		blockDataHash: block.blockDataHash,
		dateCreated: timestamp,
		nonce: nonce,
		blockHash: hash,
	};
	*/

	// step 1: find block candidate by its blockDataHash
	const foundBlock = blockchain.miningJobs.get(blockDataHash);
	/**Block: (
				coinbaseTransaction.minedInBlockIndex,
				transactionList,
				this.difficulty,
				prevBlockHash,
				minerAddress,
				blockDataHash
			) */

	// step 2: verify hash and difficulty
	const isValid = blockchain.validateBlockHash(
		dateCreated,
		nonce,
		blockDataHash,
		foundBlock.difficulty,
		blockHash
	);

	// step 3: if valid, add the new info to the block
	if (isValid) {
		foundBlock = { ...foundBlock, nonce, dateCreated, blockHash };
	}

	// step 4: check if block (index?) is not yet mined;
	// if not, we add our new verified block and propagate it! (notify other nodes so they may request it?)
	const response = {};
	const latestIndex = blockchain.chain.length - 1;
	if (foundBlock.index > latestIndex) {
		blockchain.chain.addValidBlock(foundBlock);
		
		response = {
			...response,
			message: `Block accepted, reward paid: 500350 microcoins`,
			status: 200,
		};
	} else {
		//if block is already mined, we were too slow so we return a sad error message!
		response = {
			...response,
			errorMsg: `Block not found or already mined`,
			message: `...Too slow! Block not accepted. Better luck next time!`,
			status: 404,
		};
	}

	res.status(response.status).send(JSON.stringify(response));
});

module.exports = router;
