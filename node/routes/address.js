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
//	crawl blockchain and build balances of address

// each successful RECEIVED transaction will ADD value
// all SPENT transactions SUBTRACT the transaction fee
// each successful SPENT transaction will SUBTRACT value

// return {0, 0, 0} for non-active addresses (addresses with no transactions) ?? address must be valid but still does not appear??
// return {status: 404, errorMsg: "Invalid address"} for invalid addresses

//"safe" transactions == ones with >=6 confirmations
//confirmed transactions == ones included in blocks
//pending transactions == ALL transactions (i.e. confirmed transactions + pending transactions)



// transactions with {to: ourAddress} && successful will add value
// 	if transaction has >= 6 confirmations, add to safeBalance
// 	if transaction has >= 1 confirmations, add to confirmedBalance

//transactions with {from: ourAddress}:		
//	if transaction has >= 6 confirmations:
//     subtract fee from safeBalance
//     if successful, also subtract value from safeBalance
//	if transaction has >= 1 confirmations:
//     subtract fee from confirmedBalance
//     if successful, also subtract value from confirmedBalance

// pending transactions: take confirmedBalance and:
// (for pending transactions) if {to: ourAddress}:
//		add to pendingBalance
// (for pending transactions) if {from: ourAddress}: 
//    subtract (fee + value) from pendingBalance

router.get("/:address/balance", (req, res) => {
	const blockchain = req.app.get('blockchain');
	const {address} = req.params;
	const result = {};
	const balances = {
		safeBalance: 0,
		confirmedBalance: 0,
		pendingBalance: 0,
	};

	const addressIsValid = (address) => {
		if (address.length !== 40) return false;
		//other validations...?
		return true;
	}

	if (!addressIsValid(address)) {
		result.status = 404;
		result.errorMsg = "Invalid address";
		res.status(result.status).send(JSON.stringify(result));
		return;
	}

	// check transactions in block (i.e. confirmed && safe):
	for (const block of blockchain.chain) {
		const foundTransactions = block.transactions.filter(transaction => transaction.to === address && transaction.transferSuccessful)

	}



	res.status(result.status).send(JSON.stringify(result));
});


module.exports = router;