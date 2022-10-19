const express = require('express');
const crypto = require('node:crypto');
const cors = require('cors');
const { SHA256 } = require( '../blockchain/src/hashing.js' );

(async function () {
	const { Blockchain } = require('../blockchain/src/index.js');

	const blockchain = new Blockchain();

	const port = +( process.argv[2] ?? blockchain.config.defaultServerPort);
	const host = blockchain.config.defaultServerHost;
	const selfUrl =  `http://${host}:${port}`;

	// const randomNodeId = crypto.randomUUID().replaceAll('-', '');
	const stableNodeId = SHA256(selfUrl).slice(0, 20);
	const nodeIdentifier = stableNodeId;

	const nodeInfo = {
		nodeId: nodeIdentifier,
		host,
		port,
		selfUrl,
		about: `Kingsland Blockchain Node ${nodeIdentifier.slice(0, 8)}`,
	};
	blockchain.config.nodeInfo = nodeInfo;

	console.log(blockchain);

	const app = express();
	app.use(cors());
	app.use(express.json());

	app.set('blockchain', blockchain);
	app.set('nodeInfo', nodeInfo);


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
			about: nodeInfo.about,
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

		console.log('get info called', { data });
		res.status(200).send(JSON.stringify(data));
	});

	// return ALL balances in the network
	//non-zero + confirmed (in blocks)
	app.get('/balances', (req, res) => {
		const allBalances = blockchain.allConfirmedAccountBalances();
		const balances = blockchain.filterNonZeroBalances(allBalances);
		console.log({ allBalances, balances });
		return res.status(200).send(JSON.stringify(balances));
	});

	app.listen(nodeInfo.port, () => {
		console.log(
			`****************************************\n~~~                                  ~~~\n~~~   node listening on port: ${nodeInfo.port}   ~~~\n~~~                                  ~~~\n****************************************\n`
		);
	});
})();





// connecting a peer:
/*
expect:
	node 1: fetch info from node 2
	node 1: add peer
	node 1: tellPeerToFriendUsBack (post to node 2)
		node 2: fetch info from node 1
		node 2: add peer
		node2: tellPeerToFriendUsBack

*/