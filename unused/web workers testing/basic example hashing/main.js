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

let blockCandidate = {
	blockDataHash,
	dateCreated: '',
	nonce: 0,
	blockHash: '',
};

console.log('starting while loop');

for (let nonce = 0; !success; nonce++) {
	// console.log(success);
	if (success) break;
	const input = {
		nonce,
		blockDataHash,
		difficulty
	};

	//callback always called in/from the main thread
	workers(input, (err, response) => {
		console.log(response);
		if (!response) return;

		const {dataToHash, blockHash} = JSON.parse(response);
		const [data, timestamp, nonce] = dataToHash.split("|");

		blockCandidate = {
			...blockCandidate,
			dateCreated: timestamp,
			nonce,
			blockHash
		}
		success = blockCandidate;
		console.log(' *********** success recorded *********** ');
		console.log(success);
		console.log('while loop has ended');
		workerFarm.end(workers);
		process.exit();
		
	});
}


