const express = require("express");
const crypto = require("node:crypto");
const app = express();
app.use(express.json());
const port = 5000;

const nodeIdentifier = crypto.randomUUID().replaceAll("-", "");
const Blockchain = require("../BlockchainJs/blockchain.js");
const blockchain = new Blockchain();

console.log({ nodeIdentifier });
console.log(blockchain);

getMethods = (obj) =>
	Object.getOwnPropertyNames(obj).filter(
		(item) => typeof obj[item] === "function"
	);

console.log(getMethods(blockchain));

/* 
NODE:
The node should hold:

the Chain,
the Peers, and
the REST endpoints (to access node functionality)


*/

/* 
REQUIRED ROUTES:

GET {
	"/", 				?? homepage for api?
	"/info", 		started
	"/debug",		started
	"/debug/mine/:minerAddress/:difficulty",	started
	"/balances", started
	"/address/:address/transactions", started
	"/address/:address/balance", started
	"/peers", started
	"/mining/get-mining-job/:address", started
}

POST {
	"/transactions/send", started
	"/peers/connect", started
	"/peers/notify-new-block", started
	"/mining/submit-mined-block", started
}


*/

app.get("/info", (req, res) => {
	const data = {
		about: "name of the node",
		nodeId: nodeIdentifier,
		chainId: "chain identifier based on genesis block",
		nodeUrl: "url of this node",
		peers: blockchain.nodes.size,
		currentDifficulty: blockchain.difficulty,
		blocksCount: blockchain.chain.length,
		cumulativeDifficulty: "running total of difficulty for mined blocks?",
		confirmedTransactions: "number of transactions in blocks",
		pendingTransactions: blockchain.pendingTransactions.length,
	};

	res.status(200).send(JSON.stringify(data));
});


app.get("/debug", (req, res) => {
	//debug info
	const debugInfo = {
		selfUrl: "url of this node",
		chain: blockchain.chain,
		pendingTransactions: blockchain.pendingTransactions,
		confirmedBalances: "get transactions with 1 confirmation??",
	};

	res.status(200).send(JSON.stringify(debugInfo));
});


// works:
app.get("/debug/reset-chain", (req, res) => { 
	const success = blockchain.reset();
	if (success) {
		console.log("Chain reset\n" + JSON.stringify(blockchain.chain));
		res.status(200).send("yes chain was reset to genesis block");
	} else {
		res.status(400).send("no chain was not reset");
	}
});


app.get("/debug/mine/:minerAddress/:difficulty", (req, res) => {
	const { minerAddress, difficulty } = req.params;
	//mine a block for miner address at difficulty??
	// or generate a mining job at address && difficulty??
});


// works:
app.get("/blocks", (req, res) => {
	res.status(200).send(JSON.stringify(blockchain.chain));
});


// works:
app.get("/blocks/:id", (req, res) => {
	res.status(200).send(JSON.stringify(blockchain.chain[req.params.id - 1]));
});


// works:
app.get("/transactions/pending", (req, res) => {
	//return pending transactions, in mempool
	res.status(200).send(JSON.stringify(blockchain.pendingTransactions));
});


// works:
app.get("/transactions/confirmed", (req, res) => {
	//display all transactions in blocks
	//	crawl blocks and build list to return
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


app.get("/transactions/:tranHash", (req, res) => { // not working
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


app.get("/balances", (req, res) => {
	res.status(200).send("supposed to get balances ??of all addresses on the network??");
});


app.get("/address/:address/transactions", (req, res) => {
	const {address} = req.params;
	//return transactions array of address
	//	crawl blockchain and build transaction list related to address
	res.status(200).send("get transactions related to address "+address);
});


app.get("/address/:address/balance", (req, res) => {
	const {address} = req.params;
	//return balance of address	
	//	crawl blockchain and build balance of address
	res.status(200).send("get balance of particular address "+address);
});


app.get("/peers", (req, res) => {
	//responds with object holding {nodeId1: nodeUrl1, ...}
	res.status(200).send(JSON.stringify(blockchain.nodes));
});


app.get("/mining/get-mining-job/:address", (req, res) => {
	// prepare block candidate and send to miner
	// (miner then finds nonce and sends it back)
	const {address: minerAddress} = req.params;


	const response = {
		index: blockchain.chain.length + 1,	// index of next block
		transactionsIncluded: blockchain.pendingTransactions,	// # of transactions in next block
		difficulty: 5,	// difficulty of next block
		expectedReward: 5000350, // standard reward
		rewardAddress: minerAddress,
		blockDataHash: "hash of block without nonce; miner takes this and increments nonce to find correct hash"
	};
	res.status(200).send(JSON.stringify(response));
});





// POST ROUTES


app.post("/transactions/send", (req, res) => {
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


// done, need to check
app.post("/peers/connect", (req, res) => {
	const {peerUrl} = req.body;
	// takes peerUrl and adds it to our list of nodes
	if (!peerUrl || peerUrl === null) {
		res.status(400).send("Error: Missing Peer Node URL");
	}

	blockchain.registerNode(peerUrl); // add it to the list

	const response = {
		message: `Connected to peer ${peerUrl}`
	};

	res.status(201).send(JSON.stringify(response));
});


// started
app.post("/peers/notify-new-block", (req, res) => {
	// receive new block notification
	const data = req.body;
	//data == {blocksCount: number, cumulativeDifficulty: number, nodeUrl: nodeUrl}

	//what then???

	const response = {
		message: `Thank you for the notification.`
	}
	res.status(200).send(JSON.stringify(response));
});


app.post("/mining/submit-mined-block", (req, res) => {
	const data = req.body;
	/* 
	// receive completed (hashed) mining job from miner:

	data: {
		blockDataHash: block.blockDataHash,
		dateCreated: timestamp,
		nonce: nonce,
		blockHash: hash,
	};
	*/
	//should verify it and use it and propagate to other nodes?

	const response = {};
	const valid = true;

	if (valid) {
		response.message = `Block accepted, reward paid: 500350 microcoins`;
	} else {
		response.message = `...Too slow! Block not accepted. Better luck next time!`;
	}

	res.status(200).send(JSON.stringify(response));
});
















/* OLD ROUTES BELOW */

app.get("/chain", (req, res) => {
	const response = {
		chain: blockchain.chain,
		length: blockchain.chain.length,
	};

	res.status(200).send(JSON.stringify(response));
});

// app.post("/transactions/new", (req, res) => {
// 	console.log(req.body);
// 	const transactionData = req.body;

// 	if (!transactionData) {
// 		res.status(400).send("Missing Body");
// 	}

// 	const required = ["sender", "recipient", "amount"];

// 	let missing = false;
// 	for (const each of required) {
// 		if (!Object.keys(transactionData).includes(each)) {
// 			missing = true;
// 			console.log("Missing", each);
// 			break;
// 		}
// 	}
// 	if (missing) {
// 		res.status(400).send("Missing Values");
// 	}

// 	const index = blockchain.newTransaction(
// 		transactionData["sender"],
// 		transactionData["recipient"],
// 		transactionData["amount"]
// 	);

// 	const response = {
// 		message: `Transaction will be added to block #${index}`,
// 	};

// 	res.status(201).send(JSON.stringify(response));
// });

app.get("/mine", (req, res) => {
	//add our mining reward
	blockchain.newTransaction(
		(sender = "0"),
		(recipient = nodeIdentifier),
		(amount = 1)
	);

	//create the block and attempt to mine it
	const block = blockchain.newBlock((proof = 0));
	blockchain.proofOfWork(block);

	const response = {
		message: "New block mined!",
		index: block["index"],
		transactions: block["transactions"],
		proof: block["proof"],
		previousHash: block["previousHash"],
	};

	res.status(200).send(JSON.stringify(response));
});

app.post("/nodes/register", (req, res) => {
	const data = req.body;
	const nodes = data["nodes"];

	if (!nodes || nodes == null) {
		res.status(400).send("Error: Please supply a valid list of nodes");
	}

	for (const node of nodes) {
		blockchain.registerNode(node);
	}

	const response = {
		message: "new nodes have been added!",
		total_nodes: [...blockchain.nodes],
	};

	res.status(201).send(JSON.stringify(response));
});

app.get("/nodes/resolve", (req, res) => {
	const replaced = blockchain.resolveConflict();

	let response;
	if (replaced) {
		response = {
			message: "Our chain was replaced",
			newChain: blockchain.chain,
		};
	} else {
		response = {
			message: "Our chain is authoritative",
			chain: blockchain.chain,
		};
	}

	res.status(200).send(JSON.stringify(response));
});

app.listen(port, () => {
	console.log(`node listening on port ${port}`);
});
