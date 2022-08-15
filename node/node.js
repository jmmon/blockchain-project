const express = require("express");
const crypto = require("node:crypto");
const cors = require('cors');
const Blockchain = require("./Blockchain/Blockchain.js");
const nodeIdentifier = crypto.randomUUID().replaceAll("-", "");
const port = undefined;
const host = undefined;

const blockchain = new Blockchain();

const nodeInfo = {
	nodeId: nodeIdentifier,
	host: host ?? blockchain.config.defaultServerHost,
	port: port ?? blockchain.config.defaultServerPort,
	selfUrl: `http://${this.host}:${this.port}`,
};

console.log({ nodeIdentifier: nodeInfo.nodeId });
console.log(blockchain);

const app = express();
app.use(cors());
app.use(express.json());

app.set("blockchain", blockchain);
app.set("nodeInfo", nodeInfo);

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
		nodeId: nodeInfo.nodeId,
		chainId: blockchain.config.genesisBlock.blockHash,
		nodeUrl: nodeInfo.selfUrl,
		peers: blockchain.nodes.size,
		currentDifficulty: blockchain.difficulty,
		blocksCount: blockchain.chain.length,
		cumulativeDifficulty: blockchain.cumulativeDifficulty,
		confirmedTransactions: "number of transactions in blocks",
		pendingTransactions: blockchain.pendingTransactions.length,
	};

	res.status(200).send(JSON.stringify(data));
});

// done
// return ALL balances in the network
//non-zero + confirmed (in blocks)
app.get("/balances", (req, res) => {
	const allBalances = blockchain.getAllConfirmedAccountBalances();
	const balances = blockchain.filterOutNonZeroBalances(allBalances);
	console.log({allBalances, balances});
	return res.status(200).send(JSON.stringify(balances));
});

app.listen(nodeInfo.port, () => {
	console.log(`node listening on port ${nodeInfo.port}`);
});
