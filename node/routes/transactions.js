const express = require('express');
const router = express.Router();

// works:
//return pending transactions, (in mempool)
router.get('/pending', (req, res) => {
	const blockchain = req.app.get('blockchain');
	return res.status(200).send(JSON.stringify(blockchain.getPendingTransactions()));
});

// works:
//display all transactions in blocks
//	crawl blocks and build list to return
router.get('/confirmed', (req, res) => {
	const blockchain = req.app.get('blockchain');
	return res.status(200).send(JSON.stringify(blockchain.getConfirmedTransactions()));
});

// works ??
router.get('/:tranHash', (req, res) => {
	const blockchain = req.app.get('blockchain');
	const { tranHash: transactionDataHash } = req.params;
	console.log(`transaction hash lookup received...`, transactionDataHash);

	const foundTransaction = blockchain.getTransactionByHash(transactionDataHash);
	console.log(`transaction found?`, { foundTransaction });

	if (foundTransaction) {
		return res.status(200).send(JSON.stringify(foundTransaction));
	} else {
		return res.status(400).send(JSON.stringify({ errorMsg: 'Transaction not found' }));
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


// If received from a node, if the node is not a peer we need to add it!
router.post('/send', async (req, res) => {
	console.log('transaction received...');
	const blockchain = req.app.get('blockchain');
	const sendingNodeUrl = req.get('sending-node-url') || false;

	const signedTransaction = req.body;
	console.log({ signedTransaction });

	//check for missing data object
	if (Object.values(signedTransaction).length < 8) {
		return res.status(400).send(
			JSON.stringify({
				errorMsg: 'Missing transaction data!',
			})
		);
	}

	const {
		valid,
		errors,
		transaction: validatedTransaction,
	} = await blockchain.validateNewTransaction(signedTransaction);

	if (!valid) {
		console.log({ errors });
		return res.status(400).send(JSON.stringify({ errorMsg: errors.join('\n') }));
	}

	// add transaction to pending, send the response
	blockchain.addPendingTransaction(validatedTransaction);

	res.status(200).send(JSON.stringify(buffToHex(validatedTransaction.transactionDataHash)));

	// propagate the transaction to other nodes
	console.log(
		sendingNodeUrl
			? `transaction came from node ${sendingNodeUrl}`
			: `transaction did not come from a node`
	);

	const peerData = blockchain.peers.get(sendingNodeUrl);
	console.log({peers: blockchain.peers, peerData});
	if (!peerData) {
		// add the peer
		blockchain.connectAndSyncPeer(sendingNodeUrl, sendingNodeUrl);
	}
	blockchain.propagateTransaction(signedTransaction, blockchain.peers, sendingNodeUrl);
});

const buffToHex = (input) => {
	const data = Buffer.from(input);
	return Array.prototype.map
		.call(new Uint8Array(data), (x) => ('00' + x.toString(16)).slice(-2))
		.join('')
		.match(/[a-fA-F0-9]{2}/g)
		.reverse()
		.join('');
};
module.exports = router;
