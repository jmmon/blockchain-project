const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
	//responds with object holding {nodeId1: nodeUrl1, ...}
	const blockchain = req.app.get('blockchain');
	res.status(200).send(JSON.stringify(blockchain.getPeersList()));
});


// works
router.post("/connect", async (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {nodeIdentifier, peerUrl} = req.body;
	// takes peerUrl and adds it to our list of nodes
	if (!peerUrl || peerUrl === null) {
		return res.status(404).send("Error: Missing Peer Node URL");
	}
	const response = await blockchain.registerPeer({nodeIdentifier, peerUrl}); // add it to the list

	if (response.status === 404 || response.status === 400) {
		return res.status(response.status).send(JSON.stringify(response));
	}

	console.log(`TODO: synchronize chain with peer`);
// TODO: synchronize:
// 	if (response.status === 200) {
// 		console.log('*Peer successfully connected*');
// 		console.log(`--Attempting synchronization...`);
// 	}
// 	if (response.status === 409) {
// 		console.log(`*Peer ALREADY connected!!*`);
// 		console.log(`--Attempting synchronization...`);
// 	}


	return res.status(response.status).send(JSON.stringify(response));
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