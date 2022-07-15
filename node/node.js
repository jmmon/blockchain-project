const express = require('express');
const crypto = require('node:crypto');
const app = express();
const port = 5000;

const nodeIdentifier = crypto.randomUUID().replaceAll('-', '');
const Blockchain = require('../BlockchainJs/blockchain.js');
const blockchain = new Blockchain();

console.log({nodeIdentifier});
console.log(blockchain);

getMethods = (obj) => Object.getOwnPropertyNames(obj).filter(item => typeof obj[item] === 'function')

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
	"/",
	"/info",
	"/debug",
	"/debug/reset-chain",
	"/debug/mine/:minerAddress/:difficulty",
	"/blocks",
	"/blocks/:index",
	"/transactions/pending",
	"/transactions/confirmed",
	"/transactions/:tranHash",
	"/balances",
	"/address/:address/transactions",
	"/address/:address/balance",
	"/peers",
	"/mining/get-mining-job/:address",
}

POST {
	"/transactions/send",
	"/peers/connect",
	"/peers/notify-new-block",
	"/mining/submit-mined-block",
}


*/

app.get('/info', (req, res) => {
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
	}

	res.status(200).send(JSON.stringify(data));
})


app.get('/chain', (req, res) => {
	const response = {
		chain: blockchain.chain,
		length: blockchain.chain.length
	};

	res.status(200).send(JSON.stringify(response));
});


app.post('/transactions/new', (req, res) => {
	const data = req.body;
	console.log({values: data});
	console.log('typeof values', typeof data);

	if (!data) {
		res.status(400).send("Missing Body");
	}

	const required = ["sender", "recipient", "amount"];

	let missing = false;
	for (const each of required) {
		if (!Object.keys(data).includes(each)) {
			missing = true;
			console.log('Missing', each);
			break;
		}
	}
	if (missing) {
		res.status(400).send('Missing Values');
	}

	const index = blockchain.newTransaction(data["sender"], data["recipient"], data["amount"]);

	const response = {message: `Transaction will be added to block #${index}`};

	res.status(201).send(JSON.stringify(response));
});


app.get('/mine', (req, res) => {
	//add our mining reward
	blockchain.newTransaction(
		sender = "0",
		recipient = nodeIdentifier,
		amount = 1,
	);
	
	//create the block and attempt to mine it
	const block = blockchain.newBlock(proof = 0);
	blockchain.proofOfWork(block);

	const response = {
		message: 			"New block mined!",
		index: 				block["index"],
		transactions: block["transactions"],
		proof: 				block["proof"],
		previousHash: block["previousHash"],
	};

	res.status(200).send(JSON.stringify(response));
});


app.post('/nodes/register', (req, res) => {
	const data = req.body;
	const nodes = data["nodes"];

	if (!nodes || nodes == null) {
		res.status(400).send('Error: Please supply a valid list of nodes');
	}

	for (const node of nodes) {
		blockchain.registerNode(node);
	}

	const response = {
		message: 'new nodes have been added!',
		total_nodes: [...blockchain.nodes],
	};

	res.status(201).send(JSON.stringify(response));
});


app.get('/nodes/resolve', (req, res) => {
	const replaced = blockchain.resolveConflict();

	let response;
	if (replaced) {
		response = {
			message: 'Our chain was replaced',
			newChain: blockchain.chain
		};
	} else {
		response = {
			message: 'Our chain is authoritative',
			chain: blockchain.chain
		};
	}

	res.status(200).send(JSON.stringify(response));
});



app.listen(port, () => {
	console.log(`node listening on port ${port}`);
})