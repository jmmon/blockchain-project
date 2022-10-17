const walletUtils = import('../../walletUtils/index.js');
const { response } = require('express');
const express = require('express');
const { txBaseFields } = require('../../blockchain/src/constants.js');
const Transaction = require('../../blockchain/src/Transaction.js');
const { valueCheck } = require('../../blockchain/src/valueChecks.js');
const router = express.Router();

// works:
//return pending transactions, (in mempool)
router.get('/pending', (req, res) => {
	const blockchain = req.app.get('blockchain');
	return res
		.status(200)
		.send(JSON.stringify(blockchain.getPendingTransactions()));
});

// works:
//display all transactions in blocks
//	crawl blocks and build list to return
router.get('/confirmed', (req, res) => {
	const blockchain = req.app.get('blockchain');
	return res
		.status(200)
		.send(JSON.stringify(blockchain.getConfirmedTransactions()));
});

// works ??
router.get('/:tranHash', (req, res) => {
	const blockchain = req.app.get('blockchain');
	const { tranHash: transactionDataHash } = req.params;

	const foundTransaction =
		blockchain.getTransactionByHash(transactionDataHash);

	if (foundTransaction) {
		return res.status(200).send(JSON.stringify(foundTransaction));
	} else {
		return res
			.status(400)
			.send(JSON.stringify({ errorMsg: 'Transaction not found' }));
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

// Validate transaction
// Add to pending transactions
// Send tx to peer nodes thru REST API (/transactions/send ?)
router.post('/send', async (req, res) => {
	console.log('transaction received...');
	const blockchain = req.app.get('blockchain');

	//check for missing data object
	if (Object.values(req.body).length < 8) {
		return res.status(400).send(
			JSON.stringify({
				errorMsg: 'Missing transaction data!',
			})
		);
	}

	const signedTransaction = req.body;
	console.log({ signedTransaction });

	const {
		valid,
		errors,
		transaction: validatedTransaction,
	} = blockchain.validateNewTransaction(signedTransaction);

	if (!valid) {
		return res
			.status(400)
			.send(JSON.stringify({ errorMsg: errors.join('\n') }));
	}
	// add transaction to pending, send the response
	this.addPendingTransaction(validatedTransaction);
	res.status(200).send(
		JSON.stringify(validatedTransaction.transactionDataHash)
	);

	// BELOW is peer syncing

	// need to propagate the transaction to other nodes!
	// Go through peers and send post requests to send transaction to the nodes
	const sender = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
	const peers = blockchain.peers;

	console.log('transaction received from sender IP address:', sender);

	if (peers.size === 0) return;

	Promise.all(
		peers.entries().map(([peerId, peerUrl]) => {
			if (peerUrl.includes(sender)) {
				console.log(`--Skipping peer`, { sender, peerId, peerUrl });
				return;
			}
			console.log(`-- sending to: Node ${peerId} (${peerUrl})`);
			return fetch(`${peerUrl}/transactions/send`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(signedTransaction),
			})
				.then((res) => res.json())
				.then((res) =>
					console.log(
						`-- response from: Node ${peerId} (${peerUrl}) response:\n----${res}`
					)
				).catch((err) => console.log(`Error propagating transactions to Node ${peerid} (${peerUrl}): ${err.message}`));
		})
		// peers.forEach(async (peerId, peerUrl) => {
		// 	if (peerUrl.includes(sender)) {
		// 		console.log(`--Skipping peer`, { sender, peerId, peerUrl });
		// 		return;
		// 	}

		// 	console.log(`-- sending to: Node ${peerId} (${peerUrl})`);

		// 	const response = await (
		// 		await fetch(`${peerUrl}/transactions/send`, {
		// 			method: 'POST',
		// 			headers: { 'Content-Type': 'application/json' },
		// 			body: JSON.stringify(signedTransaction),
		// 		})
		// 	).json();

		// 	console.log(
		// 		`-- response from: Node ${peerId} (${peerUrl}) response:\n----${response}`
		// 	);

		// 	// version 2:
		// 	// await (
		// 	// 	await fetch(`${peerUrl}/transactions/send`, {
		// 	// 		method: 'POST',
		// 	// 		headers: { 'Content-Type': 'application/json' },
		// 	// 		body: JSON.stringify(signedTransaction),
		// 	// 	})
		// 	// ).json().then(response => console.log(`-- response from: Node ${peerId} (${peerUrl}) response:\n----${response}`));
		// })
	);
});

module.exports = router;
