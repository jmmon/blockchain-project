const {workerData, parentPort, getEnvironmentData} = require('node:worker_threads');

//do hashes loop
const crypto = require("crypto");
const SHA256 = (message) => crypto.createHash('sha256').update(message).digest('hex');

const validProof = (hash, difficulty) => {
	return hash.slice(0, difficulty) === "0".repeat(difficulty);
}

const thisJob = getEnvironmentData("newJob");
const {blockDataHash, difficulty} = thisJob;
const index = workerData;
// console.log(`Worker ${index} started, process ${process.pid}`);

let nonce = 0;


while (true) {
	if (getEnvironmentData("newJob") == undefined) {
		console.log('new job is undefined; breaking');
		break;
	}

	const dateCreated = new Date().toISOString();
	const dataToHash = `${blockDataHash}|${dateCreated}|${nonce}`;
	const blockHash = SHA256(dataToHash);
	
	if (validProof(blockHash, difficulty)) {
		const workerInfo = {
			index,
			pid: process.pid,
			hashedBlockCandidate: {
				blockDataHash,
				dateCreated,
				nonce,
				blockHash
			},
		}

		parentPort.postMessage(workerInfo);
		break;

	} else {
		// log loading indicator
		const occurrence = Math.round((16 ** (difficulty)) / 100);
		if (nonce % occurrence == 0) {
			process.stdout.write(". ");
		}

		nonce++;
	}
}