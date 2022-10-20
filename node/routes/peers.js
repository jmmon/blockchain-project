const express = require('express');
const router = express.Router();

// responds with map object holding {nodeId1: nodeUrl1, ...}
router.get('/', (req, res) => {
	const blockchain = req.app.get('blockchain');
	res.status(200).send(JSON.stringify(Array.from(blockchain.peers)));
});

// takes {peerUrl: "http://host:port"}
router.post('/connect', async (req, res) => {
	const blockchain = req.app.get('blockchain');
	const { peerUrl } = req.body;
	// takes peerUrl and adds it to our list of nodes
	if (!peerUrl || peerUrl === null) {
		return res.status(404).send('Error: Missing Peer Node URL');
	}

	const response = await blockchain.connectPeer(peerUrl); // add it to the list

	return res.status(response.status).send(JSON.stringify(response));
});

router.post('/notify-new-block', (req, res) => {
	const blockchain = req.app.get('blockchain');
	const data = req.body;
	console.log('Block notification received!', { data });

	blockchain.handleIncomingBlock(data);

	const response = {
		message: `Thank you for the notification.`,
	};
	res.status(200).send(JSON.stringify(response));
});

module.exports = router;
