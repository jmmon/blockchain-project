const express = require("express");
const router = express.Router();

// works:
//return pending transactions, (in mempool)
router.get("/pending", (req, res) => {
	const blockchain = req.app.get('blockchain');
	return res.status(200).send(JSON.stringify(blockchain.getPendingTransactions()));
});


// works:
//display all transactions in blocks
//	crawl blocks and build list to return
router.get("/confirmed", (req, res) => {
	const blockchain = req.app.get('blockchain');
	return res.status(200).send(JSON.stringify(blockchain.getConfirmedTransactions()));
});



 // works ??
router.get("/:tranHash", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {tranHash: transactionDataHash} = req.params;

	const foundTransaction = blockchain.findTransactionByHash(transactionDataHash);

	if (foundTransaction) {
		return res.status(200).send(JSON.stringify(foundTransaction));
	} else {
		return res.status(400).send(JSON.stringify({errorMsg: "Transaction not found"}));
	}

});



// done
router.post("/send", (req, res) => {
	console.log('transaction received...');
	const blockchain = req.app.get('blockchain');
	const signedTransaction = req.body;
	console.log({signedTransaction});
	const requiredFields = ["from", "to", "value", "fee", "dateCreated", "data", "senderPubKey", "transactionDataHash", "senderSignature"];


		//TODO: validate transaction data!!
		// validates transaction public key; validates signature
		// checks sender account balance >= value + fee
		// propagate transaction to all peer nodes! 


	//check for missing data object
	if (!signedTransaction) {
		return res.status(400).send(JSON.stringify({errorMsg: "Missing all transaction data"}));
	}

	//check for missing fields
	let missing = [];
	const incomingDataKeys = Object.keys(signedTransaction);
	for (const each of requiredFields) {
		if (!incomingDataKeys.includes(each)) {
			missing.push(each);
		}
	}
	if (missing.length > 0) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: missing fields '${missing.join(", ")}'`}));
	}


	//check for invalid values :
	if (signedTransaction.value < 0) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'value' must be at least 0`}));
	}

	if (signedTransaction.fee < blockchain.config.minTransactionFee) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'fee' must be at least ${blockchain.config.minTransactionFee}`}));
	}

	const currentTime = Date.now();
	if (Date.parse(signedTransaction.dateCreated) > currentTime) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'dateCreated' cannot be created in the future! Transaction created: ${signedTransaction.dateCreated}; Current dateTime: ${currentTime.toISOString()}`}));
	}

	if (!blockchain.addressIsValid(signedTransaction.to)) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'to' address is invalid!`}));
	}
	if (!blockchain.addressIsValid(signedTransaction.from)) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'from' address is invalid!`}));
	}

	// checks sender account balance >= value + fee
	const balancesOfSender = blockchain.getBalancesOfAddress(signedTransaction.from);
	// console.log('--attempting send transaction\n balances of from account:', {balancesOfSender});
	if (balancesOfSender.confirmedBalance < (signedTransaction.value + signedTransaction.fee)) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'from' address does not have enough funds!`}));
	}





	//validate transaction public key ??
	// TODO

	//validate signature is from public key
	// TODO


	//check pendingTransactions for transaction with matching transactionDataHash (duplicate)
	const newTransaction = blockchain.createTransaction(signedTransaction);
	if (blockchain.findTransactionByHash(newTransaction.transactionDataHash)) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: transaction is a duplicate!`}));
	}



	blockchain.addPendingTransaction(newTransaction);

	// need to propagate the transaction to other nodes!
	// TODO


	return res.status(200).send(JSON.stringify(newTransaction.transactionDataHash));
});


module.exports = router;