const walletUtils = import('../../walletUtils/index.js');
const { response } = require('express');
const express = require('express');
const { txBaseFields } = require('../../blockchain/src/constants.js');
const Transaction = require( '../../blockchain/src/Transaction.js' );
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
				errorMsg:'Missing transaction data!',
			})
		);
	}

    const signedTransaction = req.body;

	// const {to, from, value, fee, dateCreated, data, senderPubKey, senderSignature} = req.body;
	// const signedTransaction = new Transaction(from, to, value, fee, dateCreated, data, senderPubKey, undefined, senderSignature);

	console.log({ signedTransaction });

	// validate the FROM address is derived from the public key
	const hexAddress = walletUtils.getAddressFromCompressedPubKey(
		signedTransaction.senderPubKey
	);
	if (signedTransaction.from !== hexAddress) {
		return res.status(400).send(
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
		return res.status(400).send(
			JSON.stringify({
				errorMsg: `Transaction signature is invalid!`,
			})
		);
	}

	// Validation
	let errors = [];


	// check for all fields
	const result = blockchain.validateFields(
		Object.keys(signedTransaction),
		txBaseFields
	);
	if (result.valid !== true) {
		result.missing.forEach((errMsg) => errors.push(errMsg));
	}

	//check for invalid values :

	// handles {to, from, value, fee, dateCreated, data, senderPubKey}
	const basicResults = blockchain.basicTxValidation(signedTransaction, blockchain.pendingTransactions);
	if (!basicResults.valid) {
		basicResults.errors.forEach((err) => errors.push(err));
	}

	// check balance of sender

	// sender account balance >= value + fee
	// (NOT allowing sending of pending funds)
	const balancesOfSender = blockchain.balancesOfAddress(
		signedTransaction.from
	);
	const spendingBalance = blockchain.config.SPEND_UNCONFIRMED_FUNDS
		? balancesOfSender.pendingBalance
		: balancesOfSender.confirmedBalance;
	if (spendingBalance < signedTransaction.value + signedTransaction.fee) {
		errors.push( `Invalid transaction: 'from' address does not have enough funds!`);
	}


	// create new transaction
	const newTransaction = blockchain.createHashedTransaction(signedTransaction);
	const hash = newTransaction.transactionDataHash;
	// const hash = signedTransaction.hashData();

	// check blockchain AND pending transactions for this transactionHash
	const foundTransaction =
		blockchain.getTransactionByHash(hash);
	if (!foundTransaction) {
		errors.push( `Duplicate transaction data hash!`);
	}

	// if errors, return the errors
	if (errors.length > 0) {
		return res
			.status(400)
			.send(JSON.stringify({ errorMsg: errors.join('\n ') }));
	}

	// do the thing!
	// add transaction to pending, send the response
	blockchain.addPendingTransaction(newTransaction);
	res.status(200).send(JSON.stringify(newTransaction.transactionDataHash));

	// need to propagate the transaction to other nodes!
	// Go through peers and send post requests to send transaction to the nodes
	const sender = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
	const peers = blockchain.peers();

	console.log('sender from req.socket.remoteAddress:', sender)

	Promise.all(
		peers.forEach(async (peerId, peerUrl) => {
			if (peerUrl.includes(sender)) {
				console.log(`--Skipping peer`, { sender, peerId, peerUrl });
				return;
			}

			let response = await (
				await fetch(`${peerUrl}/transactions/send`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(signedTransaction),
				})
			).json();

			console.log(
				`Node ${peerId} (${peerUrl}) response:\n----${response}`
			);
		})
	);
});

module.exports = router;
