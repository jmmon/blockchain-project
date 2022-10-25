const { SHA256 } = require('../libs/hashing.js');
const CONFIG = require('./constants.js');
class Node {
	constructor({host, port, blockchain}) {
		this.config = {
			host: host ?? CONFIG.defaultServerHost,
			port: port ?? CONFIG.defaultServerPort,
			url: `http://${host}:${port}`,
			// nodeId :  require("crypto").randomUUID().replaceAll('-', ''),
			nodeId : SHA256(url).slice(0, 20),
			about: `Kingsland Blockchain Node ${nodeId.slice(0, 8)}`,
			chainId: blockchain.config.chainId,
		};
		this.peers = new Map();
		this.blockchain = blockchain;
		// mining jobs??
		// this.miningJobs = new Map();
	}


	isTheirChainBetter(theirCumulativeDifficulty) {
		return theirCumulativeDifficulty > this.cumulativeDifficulty;
	}
	// isTheirChainLonger(length) {
	// 	return length > this.chain.length;
	// }
	isDifferentChain(theirId) {
		return this.config.chainId !== theirId;
	}
	// connect peer if not connected
	async connectAndSyncPeer(peerUrl, needToReciprocate) {
		// try to fetch info
		const response = await fetch(`${peerUrl}/info`);
		console.log('fn connectPeer', { connectingTo: peerUrl });
		if (response.status !== 200) {
			console.log(`-- fetch peer info`);
			return {
				status: 400,
				errorMsg: `Network error: Could not get peer info`,
			};
		}

		const peerInfo = await response.json();
		const peerNodeId = peerInfo.nodeId;
		console.log(`-- fetched info from peer node:`, { peerInfo });

		// check chainId
		if (this.isDifferentChain(peerInfo.chainId)) {
			console.log('-- Other node is not on same chain');
			return {
				status: 400,
				errorMsg: `Chain ID does not match!`,
				thisChainId: this.config.chainId,
				peerChainId: peerInfo.chainId,
			};
		}

		// if nodeId is already connected, don't try to connect again
		if (!needToReciprocate || this.peers.get(peerNodeId)) {
			console.log(`-- check nodeId`, {
				status: 409,
				errorMsg: `Already connected to peer ${peerUrl}`,
			});
		} else {
			// same chain, node added
			this.peers.set(peerNodeId, peerUrl);
			console.log(`-- added peer:`, { peerNodeId, peerUrl });
			// Send connect request to the new peer to ensure bi-directional connection
			tellPeerToFriendUsBack(peerUrl);
		}

		//synchronize chain AND pending transactions

		if (this.isTheirChainBetter(peerInfo.cumulativeDifficulty)) {
			console.log('-- is their chain better? YES', { peerInfo });
			this.checkChainFromPeer(peerUrl);
		} else {
			console.log('-- is their chain better? NO', { peerInfo });
		}

		console.log(` END fn connectPeer`);
		return {
			status: 200,
			message: `Connected to peer ${peerUrl}`,
		};
	}

	// tell them to add us
	async tellPeerToFriendUsBack(peerUrl) {
		console.log(`-- tellPeerToFriendUsBack ( ${peerUrl} )`);
		try {
			const response = await (
				await fetch(`${peerUrl}/peers/connect`, {
					method: 'POST',
					body: JSON.stringify({
						peerUrl: this.config.Url,
					}),
					headers: {
						'Content-Type': 'application/json',
						'need-to-reciprocate': 'false',
					},
				})
			).json();
			console.log(`-- friend's response:`, { response });
			return response;
		} catch (err) {
			console.log('Error friending back the peer!', err.message);
		}
	}


	/*
	----------------------------------------------------------------
		Syncing between peers/nodes
	----------------------------------------------------------------
	*/

	// peers, sync
	// async historyFrom(peerUrl) {
	async checkChainFromPeer(peerUrl) {
		console.log(`-- fn checkChainFromPeer`);
		// let theirChain, theirPending;
		console.log({ peerUrl });
		const theirChain = await fetch(`${peerUrl}/blocks`).then(
			async (res) => await res.json()
		);
		const theirPending = await fetch(
			`${peerUrl}/transactions/pending`
		).then(async (res) => await res.json());

		// async validateChain(theirChain, peerUrl) {
		console.log('-- Validating chain');
		try {
			// execute the whole chain in a new blockchain
			const { valid, cumulativeDifficulty, error } =
				await executeIncomingChain(theirChain);

			if (!valid) {
				console.log(error);
				return console.log(`-- -- chain validation`, {
					valid: false,
					error: `Their chain isn't valid!`,
				});
			}

			console.log('-- -- Chain is valid! Checking difficulty...');
			console.log({
				ours: this.cumulativeDifficulty,
				theirs: cumulativeDifficulty,
			});

			if (!this.isTheirChainBetter(cumulativeDifficulty)) {
				return console.log(`-- -- difficulty check`, {
					valid: false,
					error: `The valid chain isn't better than ours!`,
				});
			}
			console.log('-- -- Difficulty is better! Adding chain...');

			// CHAIN IS VALID AND BETTER:

			// replace chain,
			this.chain = theirChain;
			this.updateDifficulty();

			// clear mining jobs (they are invalid)
			this.clearMiningJobs();
			console.log('-- -- Notifying peers of the new chain...');

			this.propagateBlock(peerUrl);
		} catch (err) {
			return console.log(`-- validateChain error:`, {
				valid: false,
				error: err.message,
			});
		}
		// }
		// syncPendingTransactions(theirPending) {
		// SYNC PENDING TRANSACTIONS:

		// Clean up current pendingTransactions:
		// Add those that are in the peer's pendingTransactions
		const uniqueTransactions = new Set([
			...this.pendingTransactions,
			...theirPending,
			// ...(await theirPending),
		]);
		// Keep those that are not in the chain
		this.pendingTransactions = this.transactionsWeHaveNotSeen(
			Array.from(uniqueTransactions)
		);
		return console.log(`-- Sync Pending Transactions`, {
			valid: true,
			message: 'Their chain was accepted!',
		});
	}

	// should be run any time the chain changes (when a block is mined)
	propagateBlock(skipPeer = null) {
		console.log(`fn propagateBlock`, { peers: this.peers });

		if (this.peers.size === 0) return;

		// notify peers of new chain!
		const data = {
			blocksCount: this.chain.length,
			cumulativeDifficulty: this.cumulativeDifficulty,
			nodeUrl: this.config.node.selfUrl,
		};

		this.peers.entries().map(([peerId, peerUrl]) => {
			if (skipPeer !== null && skipPeer === peerUrl) {
				console.log(`Skipping peer ${{ peerId, skipPeer }}`);
				return;
			}

			console.log(`Checking Peer ${{ peerId, peerUrl }}`);

			fetch(`${peerUrl}/peers/notify-new-block`, {
				method: 'POST',
				body: JSON.stringify(data),
				headers: { 'Content-Type': 'application/json' },
			})
				.then((res) => {
					// delete peers that don't respond
					if (res.status !== 200) {
						this.peers.delete(id);
					}
					return res.json();
				})
				.then((res) =>
					console.log(
						`-- peer ${peerId} (${peerUrl}) response:${res}`
					)
				)
				.catch((err) =>
					console.log(
						`Error propagating block to Node ${peerId} (${peerUrl}): ${err.message}`
					)
				);
		});
	}

	// for propagating received transactions after they have been verified and added to the node
	propagateTransaction(signedTransaction, peers, sender) {
		if (peers.size === 0) {
			console.log(`fn propagateTransaction: no peers connected!`);
			return;
		}

		console.log(
			`fn propagateTransaction: Attempting propagation to ${peers.size} peers...`
		);
		Promise.all(
			peers.entries().map(([peerId, peerUrl]) => {
				if (sender && peerUrl.includes(sender)) {
					console.log(`--Skipping peer`, { sender, peerId, peerUrl });
					return;
				}
				console.log(`-- sending to: Node ${peerId} (${peerUrl})`);
				return fetch(`${peerUrl}/transactions/send`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'sending-node-url': this.config.selfUrl,
					},
					body: JSON.stringify(signedTransaction),
				})
					.then((res) => {
						if (res.status !== 200 && res.status !== 400) {
							// assuming no response, remove node
							this.peers.delete(peerId);
							console.log(
								`-- deleting peer ${peerId} because of incorrect response`
							);
						}
						return res.json();
					})
					.then((res) =>
						console.log(
							`-- response from: Node ${peerId} (${peerUrl}) response:\n----${res}`
						)
					)
					.catch((err) =>
						console.log(
							`Error propagating transactions to Node ${peerId} (${peerUrl}): ${err.message}`
						)
					);
			})
		);
	}

	isTheirChainBetter(theirCumulativeDifficulty) {
		return theirCumulativeDifficulty > this.cumulativeDifficulty;
	}
	isTheirChainLonger(length) {
		return length > this.chain.length;
	}

	/* 
		check whether new block results in higher cumulativeDifficulty
		accepts the new chain
		new chain is then downloaded from /blocks endpoint
	*/
	handleIncomingBlock({ blocksCount, cumulativeDifficulty, nodeUrl }) {
		if (
			this.isTheirChainLonger(blocksCount) &&
			this.isTheirChainBetter(cumulativeDifficulty)
		) {
			// download new chain from /blocks
			this.checkChainFromPeer(nodeUrl);
		}
	}
}

module.exports = Node;