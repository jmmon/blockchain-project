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

 // not working
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
	// console.log('received transaction request');
	const transactionData = req.body;
	
	if (!transactionData) {
		res.status(400).send("Missing Body");
		return;
	}

	const requiredData = ["from", "to", "value", "fee", "dateCreated", "data", "senderPubKey", "senderSignature"];
	let missing = [];
	for (const each of requiredData) {
		if (!Object.keys(transactionData).includes(each)) {
			missing.push(each);
			console.log("Missing", each);
		}
	}
	if (missing.length > 0) {
		const response = {
			message: "Missing values",
			missing
		};
		res.status(400).send(JSON.stringify(response));
		return;
	}

	const transactionDataHash = blockchain.createTransaction(transactionData);

	res.status(200).send(JSON.stringify(transactionDataHash));
});


module.exports = router;