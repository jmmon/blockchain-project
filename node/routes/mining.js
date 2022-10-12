const express = require("express");
const router = express.Router();

// prepare block candidate and send to miner
// (miner then finds nonce and sends it back)
router.get("/get-mining-job/:address", (req, res) => {
	const blockchain = req.app.get("blockchain");
	const { address: minerAddress } = req.params;

	const blockCandidate = blockchain.prepareBlockCandidate(minerAddress);

	res.status(200).send(JSON.stringify(blockCandidate));
});



// Done, needs testing
router.post("/submit-mined-block", (req, res) => {
	const blockchain = req.app.get("blockchain");
	const minedBlockData = req.body;
	const response = blockchain.submitMinedBlock(minedBlockData);
	res.status(response.status).send(JSON.stringify(response));
});

module.exports = router;
