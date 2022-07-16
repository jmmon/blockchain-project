const express = require("express");
const router = express.Router();


router.get("/:address/transactions", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {address} = req.params;
	//return transactions array of address
	//	crawl blockchain and build transaction list related to address

	//returns ALL transactions associated with the given address
	// (confirmed regardless of successful; && pending transactions)
	// sort transactions by "date and time" (ascending)
	// pending transactions will not have "minedInBlockIndex" -- should I remove it from the class?


	const result = {
		address: address,
		transactions: [
			{}, {}, {}
		]
	}
	res.status(200).send(JSON.stringify(result));
});


router.get("/:address/balance", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {address} = req.params;
	//return balance of address	
	//	crawl blockchain and build balance of address

	// each successful RECEIVED transaction will ADD value
	// all SPENT transactions SUBTRACT the transaction fee
	// each successful SPENT transaction will SUBTRACT value


	// return {0, 0, 0} for non-active addresses (addresses with no transactions) ?? address must be valid but still does not appear??
	// return {status: 404, errorMsg: "Invalid address"} for invalid addresses


	const result = {
		safeBalance: "balance of txs with >= 6 confirmations",
		confirmedBalance: "txs with >=1 confirmations;",
		pendingBalance: "all txs, including pending"
	};

	res.status(200).send(JSON.stringify(result));
});


module.exports = router;