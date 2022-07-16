const express = require("express");
const router = express.Router();

// works:
router.get("/", (req, res) => {
	const blockchain = req.app.get('blockchain');
	res.status(200).send(JSON.stringify(blockchain.chain));
});


// works:
router.get("/:id", (req, res) => {
	const blockchain = req.app.get('blockchain');
	res.status(200).send(JSON.stringify(blockchain.chain[req.params.id - 1]));
});



module.exports = router;