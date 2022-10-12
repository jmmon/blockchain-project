const express = require("express");
const router = express.Router();

// responds with map object holding {nodeId1: nodeUrl1, ...}
router.get("/", (req, res) => {
	const blockchain = req.app.get('blockchain');
	res.status(200).send(JSON.stringify(blockchain.peers()));
});

// takes {peerUrl: "http://host:port"}
// connects peer, and if needed syncs chain
router.post("/connect", async (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {peerUrl} = req.body;
	// takes peerUrl and adds it to our list of nodes
	if (!peerUrl || peerUrl === null) {
		return res.status(404).send("Error: Missing Peer Node URL");
	}

	const response = await blockchain.connectPeer(peerUrl); // add it to the list

	if (response.status === 404 || response.status === 400) {
		return res.status(response.status).send(JSON.stringify(response));
	}

	return res.status(response.status).send(JSON.stringify(response));
});


// TODO:
router.post("/notify-new-block", (req, res) => {
	const blockchain = req.app.get('blockchain');
	// receive new block notification
	const data = req.body;
	//data == {blocksCount: number, cumulativeDifficulty: number, nodeUrl: nodeUrl}

	//what then???
	// Validate the new block (transactions, etc)
	// add the block to our chain
	// re-sync pending transactions?
	//

	const response = {
		message: `Thank you for the notification.`
	}
	res.status(200).send(JSON.stringify(response));
});


module.exports = router;