const express = require('express');
const router = express.Router();

// prepare block candidate and send to miner
// (miner then finds nonce and sends it back)
router.get('/get-mining-job/:minerAddress', async (req, res) => {
	const blockchain = req.app.get('blockchain');
	const { minerAddress } = req.params;

	const blockCandidate = await blockchain.prepareBlockCandidate(minerAddress);

	res.status(200).send(JSON.stringify(blockCandidate));
});

// Done, needs testing
router.post('/submit-mined-block', (req, res) => {
	console.log('Block received');
	const blockchain = req.app.get('blockchain');
	const minedBlockData = req.body;

	const response = blockchain.validateMinedBlock(minedBlockData);
	if (response.status !== 200) {
		return res.status(response.status).send(JSON.stringify(response));
	}

	const { foundBlockCandidate, completeBlock } = response.data;
	const result = blockchain.submitBlockAndPropagate({
		foundBlockCandidate,
		completeBlock,
	});
	return res.status(result.status).send(JSON.stringify(result));
});

module.exports = router;
