const {
	workerData: workerIndex,
	parentPort,
	getEnvironmentData,
} = require('node:worker_threads');
const { SHA256, isValidProof } = require('../libs/hashing.js');

const { blockDataHash, difficulty, index } = getEnvironmentData('newJob');

process.stdout.write('(' + workerIndex + ') ');
// process.stdout.write("Mining . . . " + nonce + " \033[0G");

let nonce = 0;
let dateCreated = new Date().toISOString();
let blockHash = SHA256(`${blockDataHash}|${dateCreated}|${nonce}`);

while (!isValidProof(blockHash, difficulty)) {
	nonce++; // increment for next loop!
	dateCreated = new Date().toISOString();
	blockHash = SHA256(`${blockDataHash}|${dateCreated}|${nonce}`);

	// loading indicator
	const occurrence = Math.round(16 ** difficulty);
	if (nonce % occurrence == 0) {
		process.stdout.write('. ');
	}
}

parentPort.postMessage({
	workerIndex,
	pid: process.pid,
	hashedBlockCandidate: {
		blockDataHash,
		dateCreated,
		nonce,
		blockHash,
	},
});