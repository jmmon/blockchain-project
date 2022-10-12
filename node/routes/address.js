const express = require("express");
const router = express.Router();


router.get("/:address/transactions", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {address} = req.params;

	const transactions = blockchain.getTransactionsByAddress(address);

	res.status(200).send(JSON.stringify({address, transactions}));
});



// return 0 balances for non-active addresses (no transactions)
//return 404 message for invalid addresses
router.get("/:address/balance", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {address} = req.params;

	if (!blockchain.addressIsValid(address)) {
		res.status(404).send(JSON.stringify({errorMsg: "Invalid address"}));
		return;
	}

	res.status(200).send(JSON.stringify(blockchain.balancesOfAddress(address)));
});


module.exports = router;