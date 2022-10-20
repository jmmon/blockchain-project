const {
	workerData: workerIndex,
	parentPort,
	getEnvironmentData,
} = require('node:worker_threads');
const { SHA256 } = require('../blockchain/src/hashing.js');

const isValidProof = (hash, difficulty) => {
	return hash.slice(0, difficulty) === '0'.repeat(difficulty);
};

const {
	blockDataHash,
	difficulty,
	index: blockIndex,
} = getEnvironmentData('newJob');

let nonce = 0;

process.stdout.write('(' + workerIndex + ') ');

while (true) {
	const dateCreated = new Date().toISOString();
	const blockHash = SHA256(`${blockDataHash}|${dateCreated}|${nonce}`);
	// process.stdout.write("Mining . . . " + nonce + " \033[0G");

	if (isValidProof(blockHash, difficulty)) {
		const workerInfo = {
			workerIndex,
			pid: process.pid,
			hashedBlockCandidate: {
				blockDataHash,
				dateCreated,
				nonce,
				blockHash,
			},
		};

		parentPort.postMessage(workerInfo);
		break;
	}
	
	// loading indicator
	// const occurrence = Math.round(16 ** difficulty / 100);
	const occurrence = Math.round(16 ** difficulty);
	if (nonce % occurrence == 0) {
		process.stdout.write('. ');
	}

	nonce++; // increment for next loop!
}