const express = require('express');
const { isValidUrl } = require( '../../libs/validation' );
const router = express.Router();

// responds with map object holding {nodeId1: nodeUrl1, ...}
router.get('/', (req, res) => {
	const blockchain = req.app.get('blockchain');
	res.status(200).send(JSON.stringify(Array.from(blockchain.peers)));
});

// takes {nodeIdentifier: "someNodeId", peerUrl: "http://host:port"}
// Connect this node to a given peer
router.post('/connect', async (req, res) => {
	const blockchain = req.app.get('blockchain');
	const { peerUrl } = req.body;
	// check for header
	const cameFromNode = req.get('from-node') || false;

	if (!peerUrl || peerUrl === null ) {
		return res.status(404).send('Error: Missing Peer Node URL');
	}

	if (!isValidUrl(peerUrl)) {
		return res.status(404).send('Error: URL is invalid!');
	}

	const response = await blockchain.connectAndSyncPeer(
		peerUrl,
		cameFromNode
	); // add it to the list

	return res.status(response.status).send(JSON.stringify(response));
});
/* 
Connecting peers:
When #1 is told to connect to #2,
	It needs to get info, check that chain is the same,
Then it should tell the node to connect back to us (and tell the node it came from us, so it can skip asking us to add it back)
Then it should ask for new chain
	 it should connect and then fetch the blockchain if it is better



It should also tell node #2 to connect to #1, with a {header} header
Node #2 then connects to #1 and then fetches the blockchain if it is better.
Then since it received {header}, it should not tell node #1 to connect to #2
*/

router.post('/notify-new-block', (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {blocksCount, cumulativeDifficulty, nodeUrl} = req.body;
	console.log('Block notification received!', { blocksCount, cumulativeDifficulty, nodeUrl});

	blockchain.handleIncomingBlock({blocksCount, cumulativeDifficulty, nodeUrl});

	res.status(200).send(JSON.stringify({
		message: `Thank you for the notification.`,
	}));
});

module.exports = router;





/*
Actual flow of peer sync: (Tell node 5554(13 blocks) to connect to 5555(1400 blocks, much better))
	fn connectAndSyncPeer
	fetch info, add peer (same chain ID), tell them to friend us back
	Their chain is better
	fn checkChainFromPeer
		validating chain, (executing incoming chain), genesisBlock (and transaction)
*/