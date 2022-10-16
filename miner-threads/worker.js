const {workerData, parentPort, getEnvironmentData} = require('node:worker_threads');
const {sha256HashTransaction} = import('../walletUtils/index');

const validProof = (hash, difficulty) => {
	return hash.slice(0, difficulty) === "0".repeat(difficulty);
}

const thisJob = getEnvironmentData("newJob");
const {blockDataHash, difficulty, index: blockIndex } = thisJob;
// console.log({blockDataHash, difficulty});
const index = workerData;

// if (index == 0) {
// 	process.stdout.write("" + index);
// } else {
// 	process.stdout.write(", " + index);
// }

process.stdout.write("(" + index + ") ");
let nonce = 0;
let continueLoop = true;


while (continueLoop) {
	if (getEnvironmentData("newJob") == undefined) {
		console.log('new job is undefined; breaking');
		break;
		// process.exit();
	}

	const dateCreated = new Date().toISOString();
	const dataToHash = `${blockDataHash}|${dateCreated}|${nonce}`;
	const blockHash = sha256HashTransaction(dataToHash);
	// process.stdout.write("Mining . . . " + nonce + " \033[0G");
	
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