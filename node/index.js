const express = require('express');
const crypto = require('node:crypto');
const cors = require('cors');
const nodeIdentifier = crypto.randomUUID().replaceAll('-', '');
(async function () {
	// const Blockchain = await import("../blockchain/src/blockchain.js");
	const { Blockchain } = require('../blockchain/src/index.js');

	const blockchain = new Blockchain();
	const host = blockchain.config.defaultServerHost;
	const port = blockchain.config.defaultServerPort;

	const nodeInfo = {
		nodeId: nodeIdentifier,
		host,
		port,
		selfUrl: `http://${host}:${port}`,
	};
	console.log(nodeInfo.selfUrl);

	console.log({ nodeIdentifier: nodeInfo.nodeId });
	console.log(blockchain);

	const app = express();
	app.use(cors());
	app.use(express.json());

	app.set('blockchain', blockchain);
	app.set('nodeInfo', nodeInfo);

	// console.log(blockchain.addressIsValid("eae972db2776e38a75883aa2c0c3b8cd506b004b"));

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

	app.use('/debug', require('./routes/debug'));
	app.use('/peers', require('./routes/peers'));
	app.use('/blocks', require('./routes/blocks'));
	app.use('/transactions', require('./routes/transactions'));
	app.use('/address', require('./routes/address'));
	app.use('/mining', require('./routes/mining'));

	app.get('/info', (req, res) => {
		const data = {
			about: 'name of the node',
			nodeId: nodeInfo.nodeId,
			chainId: blockchain.config.genesisBlock.blockHash,
			nodeUrl: nodeInfo.selfUrl,
			peers: blockchain.peers.size,
			currentDifficulty: blockchain.difficulty,
			blocksCount: blockchain.chain.length,
			cumulativeDifficulty: blockchain.cumulativeDifficulty,
			confirmedTransactions: blockchain.getConfirmedTransactions().length,
			pendingTransactions: blockchain.pendingTransactions.length,
		};

		res.status(200).send(JSON.stringify(data));
	});

	// done
	// return ALL balances in the network
	//non-zero + confirmed (in blocks)
	app.get('/balances', (req, res) => {
		const allBalances = blockchain.allConfirmedAccountBalances();
		const balances = blockchain.filterNonZeroBalances(allBalances);
		console.log({ allBalances, balances });
		return res.status(200).send(JSON.stringify(balances));
	});

	app.listen(nodeInfo.port, () => {
		console.log(`node listening on port ${nodeInfo.port}`);
	});
})();
