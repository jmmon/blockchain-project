const workerFarm = require('worker-farm');
const FARM_OPTIONS     = {
	maxConcurrentWorkers        : require('os').cpus().length
, maxCallsPerWorker           : Infinity
, maxConcurrentCallsPerWorker : Infinity
};
const	workers = workerFarm(FARM_OPTIONS, require.resolve('./child'));
// const	workers = workerFarm(require.resolve('./child'));


const blockDataHash = "blockDataHash";
const difficulty = 2;
let success = false;
let nonce = 0;

let blockCandidate = {
	blockDataHash,
	dateCreated: '',
	nonce,
	blockHash: '',
};

console.log('starting while loop');

const loop = () => {
	const input = {
		nonce,
		blockDataHash,
		difficulty
	}

	const callback = (err, result) => {
		//always called in/from the main thread
		if (result) {
			const {dataToHash, blockHash} = result;
			const [data, timestamp, nonce] = dataToHash.split("|");

			blockCandidate = {
				...blockCandidate,
				dateCreated: timestamp,
				nonce,
				blockHash
			}

			success = blockCandidate;

			// onSuccess(success);
		}
	}
	if (success) return success;

	workers(input, callback);
	nonce++; // increment for next loop
}

// setInterval(loop, 1);

while (!success) {
	success = loop();
}
onSuccess(success);

const onSuccess = (blockCandidate) => {
	console.log(blockCandidate);
	console.log('while loop has ended');
	workerFarm.end(workers);
	process.exit();
}
