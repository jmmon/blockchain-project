const express = require("express");
const router = express.Router();

//return transactions array of address
//	crawl blockchain and build transaction list related to address

//returns ALL transactions associated with the given address
// (confirmed regardless of successful; && pending transactions)
// sort transactions by "date and time" (ascending)
// pending transactions will not have "minedInBlockIndex"
router.get("/:address/transactions", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {address} = req.params;

	//get all transactions from blocks, associated with address
	const transactionsForAddress = [];
	for (const block of blockchain.chain) {
		transactionsForAddress = [
			...transactionsForAddress, // keep previous ones
			...block.transactions.filter(transaction => transaction.to === address || transaction.from === address) // add new ones
		];
	}

	//get all transactions from pending, associated with address
	transactionsForAddress = [
		...transactionsForAddress, // keep previous ones
		...blockchain.pendingTransactions.filter(transaction => transaction.to === address || transaction.from === address)
	];

	// sort by parsed date string
	transactionsForAddress.sort((a, b) => Date.parse(a.dateCreated) - Date.parse(b.dateCreated))


	const result = {
		address: address,
		transactions: transactionsForAddress
	}

	res.status(200).send(JSON.stringify(result));
});


//return balance of address	
//	crawl blockchain and build balance of address

// each successful RECEIVED transaction will ADD value
// all SPENT transactions SUBTRACT the transaction fee
// each successful SPENT transaction will SUBTRACT value

// return {0, 0, 0} for non-active addresses (addresses with no transactions) ?? address must be valid but still does not appear??
// return {status: 404, errorMsg: "Invalid address"} for invalid addresses

//"safe" transactions == ones with >=6 confirmations
//confirmed transactions == ones included in blocks
//pending transactions == ALL transactions
router.get("/:address/balance", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {address} = req.params;
	const result = {
		safeBalance: "balance of txs with >= 6 confirmations",
		confirmedBalance: "txs with >=1 confirmations;",
		pendingBalance: "all txs, including pending"
	};



	res.status(200).send(JSON.stringify(result));
});


module.exports = router;