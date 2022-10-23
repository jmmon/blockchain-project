const express = require('express');
const router = express.Router();

// responds with map object holding {nodeId1: nodeUrl1, ...}
router.get('/', (req, res) => {
	const blockchain = req.app.get('blockchain');
	res.status(200).send(JSON.stringify(Array.from(blockchain.peers)));
});

// takes {peerUrl: "http://host:port"}
// Connect this node to a given peer
router.post('/connect', async (req, res) => {
	const blockchain = req.app.get('blockchain');
	const { peerUrl } = req.body;
	const needToReciprocate = req.get('need-to-reciprocate');
	// takes peerUrl and adds it to our list of nodes
	if (!peerUrl || peerUrl === null) {
		return res.status(404).send('Error: Missing Peer Node URL');
	}

	const response = await blockchain.connectAndSyncPeer(
		peerUrl,
		needToReciprocate
	); // add it to the list

	return res.status(response.status).send(JSON.stringify(response));
});
/* 
Connecting peers:
When #1 is told to connect to #2, it should connect and then fetch the blockchain if it is better
It should also tell node #2 to connect to #1, with a {need-to-reciprocate: false} header
Node #2 then connects to #1 and then fetches the blockchain if it is better.
Then since it received need-to-reciprocate: false, it should not tell node #1 to connect to #2
*/

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
