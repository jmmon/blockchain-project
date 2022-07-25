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
	if (thisJob != getEnvironmentData("newJob")) {
		throw new Error('Job changed');
	}

	const dateCreated = new Date().toISOString();
	const dataToHash = `${blockDataHash}|${dateCreated}|${nonce}`;
	const blockHash = SHA256(dataToHash);

	if (validProof(blockHash, difficulty)) {
		const returnData = {
			blockDataHash,
			dateCreated,
			nonce,
			blockHash
		};
		console.log(`***Success: Worker ${index} process ${process.pid}\nNonce: ${nonce}`);
		//on success:
		parentPort.postMessage(returnData);
		break;
	}
	nonce++;
}

// console.log(thisJob == getEnvironmentData("newJob") ? "Jobs are still the same" : "jobs are different");
