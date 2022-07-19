const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
	//responds with object holding {nodeId1: nodeUrl1, ...}
	const blockchain = req.app.get('blockchain');
	res.status(200).send(JSON.stringify(blockchain.getPeersList()));
});


// works
router.post("/connect", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {nodeIdentifier, peerUrl} = req.body;
	// takes peerUrl and adds it to our list of nodes
	if (!peerUrl || peerUrl === null) {
		res.status(400).send("Error: Missing Peer Node URL");
	}

	blockchain.registerNode({nodeIdentifier, peerUrl}); // add it to the list

	const response = {
		message: `Connected to peer ${peerUrl}`
	};

	res.status(201).send(JSON.stringify(response));
});


// TODO:
router.post("/notify-new-block", (req, res) => {
	const blockchain = req.app.get('blockchain');
	// receive new block notification
	const data = req.body;
	//data == {blocksCount: number, cumulativeDifficulty: number, nodeUrl: nodeUrl}

	//what then???

	const response = {
		message: `Thank you for the notification.`
	}
	res.status(200).send(JSON.stringify(response));
});


module.exports = router;