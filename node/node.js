const express = require("express");
const crypto = require("node:crypto");
const app = express();
app.use(express.json());
const port = 5000;

const nodeIdentifier = crypto.randomUUID().replaceAll("-", "");
const Blockchain = require("../BlockchainJs/blockchain.js");
const blockchain = new Blockchain();
app.set('blockchain', blockchain);
const nodeInfo = {
	nodeId: nodeIdentifier,
	host: 'localhost',
	port: port,
	selfUrl: `http://${this.host}:${this.port}`
};
app.set('nodeInfo', nodeInfo);


console.log({ nodeIdentifier });
console.log(blockchain);



/* 
NODE:
The node should hold:

the Chain,
the Peers, and
the REST endpoints (to access node functionality)


REQUIRED ROUTES:

GET {
	"/", 				?? homepage for api?
	"/info", 		started
	"/debug",		started
	"/balances", started
}

POST {
	"/peers/notify-new-block", started
}
*/


app.use("/debug", require("./routes/debug"));
app.use("/peers", require("./routes/peers"));
app.use("/blocks", require("./routes/blocks"));
app.use("/transactions", require("./routes/transactions"));
app.use("/address", require("./routes/address"));
app.use("/mining", require("./routes/mining"));

app.get("/info", (req, res) => {
	const data = {
		about: "name of the node",
		nodeId: nodeIdentifier,
		chainId: "chain identifier based on genesis block",
		nodeUrl: nodeInfo.selfUrl,
		peers: blockchain.nodes.size,
		currentDifficulty: blockchain.difficulty,
		blocksCount: blockchain.chain.length,
		cumulativeDifficulty: "running total of difficulty for mined blocks?",
		confirmedTransactions: "number of transactions in blocks",
		pendingTransactions: blockchain.pendingTransactions.length,
	};

	res.status(200).send(JSON.stringify(data));
});


app.get("/balances", (req, res) => {
	// list all accounts that have non-zero CONFIRMED balance
	// (The all-0's address - genesis address - will have a NEGATIVE balance)

	/**
	{
		00000...: -9999999,
		address1: 12345,
		address2: 1234,
		address3: 123, 
	}
	*/
	res.status(200).send("supposed to get balances ??of all addresses on the network??");
});











/* OLD ROUTES BELOW */

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
