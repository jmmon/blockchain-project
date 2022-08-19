const walletUtils = import('../../walletUtils/index.js');
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


		//TODO: validate transaction data!!
		// validates transaction public key; validates signature
		// checks sender account balance >= value + fee
		// propagate transaction to all peer nodes! 


	//check for missing data object
	if (!signedTransaction) {
		return res.status(400).send(JSON.stringify({errorMsg: "Missing all transaction data"}));
	}

	//check for missing fields
	const result = blockchain.validateFields(signedTransaction);
	if (result.valid !== true) {
			return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: missing fields '${result.missing.join(", ")}'`}));
	}


	//check for invalid values :
		// value >= 0
	if (signedTransaction.value < 0) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'value' must be at least 0`}));
	}
		// fee >= minimum
	if (signedTransaction.fee < blockchain.config.minTransactionFee) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'fee' must be at least ${blockchain.config.minTransactionFee}`}));
	}
		// created date is BEFORE now
	const currentTime = Date.now();
	if (Date.parse(signedTransaction.dateCreated) > currentTime) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'dateCreated' cannot be created in the future! Transaction created: ${signedTransaction.dateCreated}; Current dateTime: ${currentTime.toISOString()}`}));
	}

		// valid to address
	if (!blockchain.validateAddress(signedTransaction.to)) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'to' address is invalid!`}));
	}

		// valid from address
	if (!blockchain.validateAddress(signedTransaction.from)) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'from' address is invalid!`}));
	}

		// sender account balance >= value + fee
		// (NOT allowing sending of pending funds)
	const balancesOfSender = blockchain.getBalancesOfAddress(signedTransaction.from);
	if (balancesOfSender.confirmedBalance < (signedTransaction.value + signedTransaction.fee)) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: 'from' address does not have enough funds!`}));
	}

	//validate transaction public key ??
	if (!blockchain.validatePublicKey(signedTransaction.senderPubKey)) {
		return res.status(400).send(JSON.stringify({errorMsg: `Public Key is invalid!`}));
	}
		// could validate the FROM address is derived from the public key
	const hexAddress = walletUtils.getAddressFromCompressedPubKey(
		signedTransaction.senderPubKey
	);
	if (signedTransaction.from !== hexAddress) {
		return res.status(400).send(JSON.stringify({errorMsg: `FROM address is not derived from sender's public key!`}));
	}

	//validate signature is from public key
	if (!walletUtils.verifySignature(signedTransaction.transactionDataHash, signedTransaction.senderPubKey, signedTransaction.senderSignature)) {
		return res.status(400).send(JSON.stringify({errorMsg: `Transaction signature is invalid!`}));
	}

	//check pendingTransactions for transaction with matching transactionDataHash (duplicate)
	const newTransaction = blockchain.createTransaction(signedTransaction);
	if (blockchain.findTransactionByHash(newTransaction.transactionDataHash)) {
		return res.status(400).send(JSON.stringify({errorMsg: `Invalid transaction: transaction is a duplicate!`}));
	}



	blockchain.addPendingTransaction(newTransaction);

	// need to propagate the transaction to other nodes!
	// TODO
	// Go through peers and send post requests to alert them of the new transaction (so they can add it to their pending transactions?)


	return res.status(200).send(JSON.stringify(newTransaction.transactionDataHash));
});


module.exports = router;