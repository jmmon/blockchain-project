const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
	const blockchain = req.app.get("blockchain");
	res.status(200).send(JSON.stringify(blockchain.chain));
});

router.get("/:id", (req, res) => {
	const blockchain = req.app.get("blockchain");
	if (req.params.id < 0 || req.params.id > blockchain.chain.length - 1) {
		return res.status(404).send(JSON.stringify({errorMsg: "Block not found!"}));
	}
	res.status(200).send(JSON.stringify(blockchain.chain[req.params.id]));
});

module.exports = router;
