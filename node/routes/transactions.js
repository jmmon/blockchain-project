const walletUtils = import("../../walletUtils/index.js");
const { response } = require("express");
const express = require("express");
const router = express.Router();

// works:
//return pending transactions, (in mempool)
router.get("/pending", (req, res) => {
	const blockchain = req.app.get("blockchain");
	return res
		.status(200)
		.send(JSON.stringify(blockchain.getPendingTransactions()));
});

// works:
//display all transactions in blocks
//	crawl blocks and build list to return
router.get("/confirmed", (req, res) => {
	const blockchain = req.app.get("blockchain");
	return res
		.status(200)
		.send(JSON.stringify(blockchain.getConfirmedTransactions()));
});

// works ??
router.get("/:tranHash", (req, res) => {
	const blockchain = req.app.get("blockchain");
	const { tranHash: transactionDataHash } = req.params;

	const foundTransaction =
		blockchain.getTransactionByHash(transactionDataHash);

	if (foundTransaction) {
		return res.status(200).send(JSON.stringify(foundTransaction));
	} else {
		return res
			.status(400)
			.send(JSON.stringify({ errorMsg: "Transaction not found" }));
	}
});

/*		 
Peer Connections / Syncing:
 		When sending transactions, node should:
			Validate transaction, (
				fields, 
				values,
				recalculated transactionDataHash,
				signature
			)
			Add to Pending Transactions,
			Propagate transaction to all peer nodes thru REST API (transactions/send I guess)
*/

router.post("/send", async (req, res) => {
	console.log("transaction received...");
	const blockchain = req.app.get("blockchain");
	const signedTransaction = req.body;
	console.log({ signedTransaction });

	//TODO: validate transaction data!!
	// validates transaction public key; validates signature
	// checks sender account balance >= value + fee
	// propagate transaction to all peer nodes!
	// to prevent infinite propagation loop:
	// check that we don't have the transaction hash inside our pending transactions?

	//check for missing data object
	if (!signedTransaction) {
		return res
			.status(400)
			.send(JSON.stringify({ errorMsg: "Missing all transaction data" }));
	}

	//check for transactionHash in our pending transactions
	// should also check confirmed transactions??
	if (
		!!blockchain.searchPendingTransactionsForTransactionHash(
			signedTransaction.transactionDataHash
		)
	) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg:
						"Transaction already included in pending transactions",
				})
			);
	}

	//check for missing fields
	const result = blockchain.validateFields(signedTransaction);
	if (result.valid !== true) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg: `Invalid transaction: missing fields '${result.missing.join(
						", "
					)}'`,
				})
			);
	}

	//check for invalid values :
	// value >= 0
	if (signedTransaction.value < 0) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg: `Invalid transaction: 'value' must be at least 0`,
				})
			);
	}
	// fee >= minimum
	if (signedTransaction.fee < blockchain.config.minTransactionFee) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg: `Invalid transaction: 'fee' must be at least ${blockchain.config.minTransactionFee}`,
				})
			);
	}
	// created date is BEFORE now
	const currentTime = Date.now();
	if (Date.parse(signedTransaction.dateCreated) > currentTime) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg: `Invalid transaction: 'dateCreated' cannot be created in the future! Transaction created: ${
						signedTransaction.dateCreated
					}; Current dateTime: ${currentTime.toISOString()}`,
				})
			);
	}

	// valid to address
	if (!blockchain.validateAddress(signedTransaction.to)) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg: `Invalid transaction: 'to' address is invalid!`,
				})
			);
	}

	// valid from address
	if (!blockchain.validateAddress(signedTransaction.from)) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg: `Invalid transaction: 'from' address is invalid!`,
				})
			);
	}

	// sender account balance >= value + fee
	// (NOT allowing sending of pending funds)
	const balancesOfSender = blockchain.getBalancesOfAddress(
		signedTransaction.from
	);
	if (
		balancesOfSender.confirmedBalance <
		signedTransaction.value + signedTransaction.fee
	) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg: `Invalid transaction: 'from' address does not have enough funds!`,
				})
			);
	}

	//validate transaction public key ??
	if (!blockchain.validatePublicKey(signedTransaction.senderPubKey)) {
		return res
			.status(400)
			.send(JSON.stringify({ errorMsg: `Public Key is invalid!` }));
	}
	// could validate the FROM address is derived from the public key
	const hexAddress = walletUtils.getAddressFromCompressedPubKey(
		signedTransaction.senderPubKey
	);
	if (signedTransaction.from !== hexAddress) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg: `FROM address is not derived from sender's public key!`,
				})
			);
	}

	//validate signature is from public key
	if (
		!walletUtils.verifySignature(
			signedTransaction.transactionDataHash,
			signedTransaction.senderPubKey,
			signedTransaction.senderSignature
		)
	) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg: `Transaction signature is invalid!`,
				})
			);
	}

	//check pendingTransactions for transaction with matching transactionDataHash (duplicate)
	const newTransaction = blockchain.createTransaction(signedTransaction);
	if (blockchain.getTransactionByHash(newTransaction.transactionDataHash)) {
		return res
			.status(400)
			.send(
				JSON.stringify({
					errorMsg: `Invalid transaction: transaction is a duplicate!`,
				})
			);
	}

	blockchain.addPendingTransaction(newTransaction);

	res.status(200).send(JSON.stringify(newTransaction.transactionDataHash));

	// need to propagate the transaction to other nodes!
	// Go through peers and send post requests to send transaction to the nodes
	const peers = blockchain.getPeersList();
	let responseList = [];
	peers.forEach(async (peer) => {
		// send post request with transaction
		// peer == {nodeIdentifier: peerUrl};
		// TODO: change peers to an object, instead of a set/array of objects?
		const peerUrl = Object.values(peer)[0];
		// don't really need to await the responses, but will for testing purposes:
		responseList.push(
			new Promise(async () => {
				let response = await (
					await fetch(`${peerUrl}/transactions/send`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(signedTransaction),
					})
				).json();
				return {
					response,
					peerUrl,
					peerId: Object.keys(peer)[0],
				};
			})
		);
		// const jsonResponse = await (await fetch(`${peerUrl}/transactions/send`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(signedTransaction)})).json()
		// console.log(`Node ${Object.keys(peer)[0]} (${peerUrl}) response:\n----`, {jsonResponse});
	});

	Promise.all(responseList).then((resolves) =>
		resolves.forEach((res) =>
			console.log(
				`Node ${res.peerId} (${res.peerUrl}) response:\n----${res.response}`
			)
		)
	);

	// return res.status(200).send(JSON.stringify(newTransaction.transactionDataHash));
});

module.exports = router;
