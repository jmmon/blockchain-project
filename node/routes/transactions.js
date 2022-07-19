const express = require("express");
const router = express.Router();

// works:
//return pending transactions, (in mempool)
router.get("/transactions/pending", (req, res) => {
	const blockchain = req.app.get('blockchain');
	res.status(200).send(JSON.stringify(blockchain.pendingTransactions));
});


// works:
//display all transactions in blocks
//	crawl blocks and build list to return
router.get("/transactions/confirmed", (req, res) => {
	const blockchain = req.app.get('blockchain');
	let transactionsJson = "[";
	for (const block of blockchain.chain) {
		for (const transaction of block.transactions) {
			thisTransaction = JSON.stringify(transaction);
			transactionsJson += thisTransaction + ",";
		}
	}
	// slice off last comma
	transactionsJson = transactionsJson.slice(0, transactionsJson.length - 1);
	transactionsJson += "]";

	res.status(200).send(transactionsJson);
});

 // works ??
router.get("/transactions/:tranHash", (req, res) => {
	const blockchain = req.app.get('blockchain');

	const {tranHash: transactionDataHash} = req.params;
	console.log('Searching for tx', transactionDataHash);
	const result = {
		status: 200,
	}

	for (const block of blockchain.chain) {
		for (const transaction of block.transactions) {
			if (transaction?.transactionDataHash === transactionDataHash) {
				result.foundTransaction = JSON.stringify(transaction);
				break;
			}
		}
	}

	// slice off last comma
	if (!result.foundTransaction) {
		result.message = "Error: Transaction not found";
		res.status(result.status).send(JSON.stringify(result.message));
	} else {
		res.status(result.status).send(result.foundTransaction);
	}
});



// works
router.post("/transactions/send", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const transactionData = req.body;
	const requiredData = ["from", "to", "value", "fee", "dateCreated", "data", "senderPubKey", "senderSignature"];

		//TODO: validate transaction data!!
		// check for missing / invalid fields; invalid values
		// skip duplicated transactions ?? check pending transactions probably?
		// validates transaction public key; validates signature
		// checks sender account balance >= value + fee
		// checks value >= 0 && fee >= this.config.minTransactionFee
		// push to pendingTransactions
		// propagate transaction to all peer nodes! 

	//check for missing data object
	if (!transactionData) {
		res.status(400).send(JSON.stringify({errorMsg: "Missing all transaction data"}));
		return;
	}


	//check for missing fields
	let missing = [];
	for (const each of requiredData) {
		if (!Object.keys(transactionData).includes(each)) {
			missing.push(each);
		}
	}
	if (missing.length > 0) {
		res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: missing fields '${missing.join(", ")}'`}));
		return;
	}


	//check for invalid values :
	if (transactionData.value < 0) {
		res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'value' must be at least 0`}));
	}

	if (transactionData.fee < blockchain.config.minTransactionFee) {
		res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'fee' must be at least ${blockchain.config.minTransactionFee}`}));
	}

	const currentTime = Date.now();
	if (Date.parse(transactionData.dateCreated) > currentTime) {
		res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'dateCreated' cannot be created in the future! Transaction created: ${transactionData.dateCreated}; Current dateTime: ${currentTime.toISOString()}`}));
	}

	if (!blockchain.addressIsValid(transactionData.to)) {
		res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'to' address is invalid!`}));
	}
	if (!blockchain.addressIsValid(transactionData.from)) {
		res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'from' address is invalid!`}));
	}


	//check pendingTransactions for transaction with matching transactionDataHash (duplicate)
	// TODO

	//validate transaction public key ??
	// TODO

	//validate signature is from public key
	// TODO




	const transactionDataHash = blockchain.createTransaction(transactionData);

	res.status(200).send(JSON.stringify(transactionDataHash));
});


module.exports = router;