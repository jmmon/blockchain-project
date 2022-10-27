const express = require('express');
const cors = require('cors');
const { Blockchain } = require('../blockchain/src/index.js');
const { SHA256 } = require('../libs/hashing.js');
const CONFIG = require('./constants.js');

// npm start --- (-p/--port) 5556
const argv = require('minimist')(process.argv.slice(2));
const PORT = argv.p ?? argv.port ?? CONFIG.defaultServerPort;
const HOST = CONFIG.defaultServerHost;
// const WALLET_INDEX = argv.w ?? argv.i ?? argv.wallet ?? argv.index ?? 0;

(async function () {

	const blockchain = new Blockchain();
	await blockchain.createGenesisBlock();

	const url = `http://${HOST}:${PORT}`;
	const selfUrl = url;

	// const randomNodeId = crypto.randomUUID().replaceAll('-', '');
	const stableNodeId = SHA256(selfUrl).slice(0, 20);
	const nodeId = stableNodeId;

	const about = `Kingsland Blockchain Node ${nodeId.slice(0, 8)}`;

	// const blockchain = new Blockchain();
	// await blockchain.createGenesisBlock();
	// const node = new Node({host: someHost, port: somePort, blockchain});
	const node = {
		nodeId,
		host: HOST,
		port: PORT,
		selfUrl,
		about,
	};

	blockchain.config.node = node;

	console.log(blockchain);

	const app = express();
	app.use(cors());
	app.use(express.json());

	const sendError = (error, req, res, message) => {
		const response = `Caught a request error! ${message}: ${error.message}`;
		console.log(response);
	}

	app.use((error, req, res, next) => {
		if (error instanceof SyntaxError) {
			sendError(error, req, res, 'Syntax error in the request');
		} else if (error instanceof Error) {
			sendError(error, req, res, 'General error in the request');
		} else {
			next();
		}
	})

	app.set('blockchain', blockchain);
	app.set('node', node);

	/* 
NODE:
The node should hold:

the Chain,
the Peers, and
the REST endpoints (to access node functionality)
*/
	app.use('/debug', require('./routes/debug'));
	app.use('/peers', require('./routes/peers'));
	app.use('/blocks', require('./routes/blocks'));
	app.use('/transactions', require('./routes/transactions'));
	app.use('/address', require('./routes/address'));
	app.use('/mining', require('./routes/mining'));

	app.get('/info', (req, res) => {
		const data = {
			about: node.about,
			nodeId: node.nodeId,
			chainId: blockchain.config.genesisBlock.blockHash,
			nodeUrl: node.selfUrl,
			peers: blockchain.peers.size,
			currentDifficulty: blockchain.difficulty,
			blocksCount: blockchain.chain.length,
			cumulativeDifficulty: blockchain.cumulativeDifficulty,
			confirmedTransactions: blockchain.getConfirmedTransactions().length,
			pendingTransactions: blockchain.pendingTransactions.length,
		};

		console.log('(get info called)');
		res.status(200).send(JSON.stringify(data));
	});

	// return ALL balances in the network
	//non-zero + confirmed (in blocks)
	app.get('/balances', (req, res) => {
		const allBalances = blockchain.allConfirmedAccountBalances();
		const balances = blockchain.filterNonZeroBalances(allBalances);
		console.log(`(get balances called)`, { allBalances, balances });
		return res.status(200).send(JSON.stringify(balances));
	});

	const getDateString = () => {
		let date = Date().toString().split(' ').slice(0, 5).join(' ');
		let front = true;
		while (date.length < 34) {
			date = front ? ' ' + date : date + ' ';
			front = !front;
		}
		return date;
	};

	app.listen(node.port, () => {
		console.log(
			`****************************************\n~~~                                  ~~~\n~~~   node listening on port: ${
				node.port
			}   ~~~\n~~~                                  ~~~\n~~~${getDateString()}~~~\n~~~                                  ~~~\n****************************************\n`
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
