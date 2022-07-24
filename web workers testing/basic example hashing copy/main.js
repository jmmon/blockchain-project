const workerFarm = require('worker-farm');
const FARM_OPTIONS     = {
	maxConcurrentWorkers        : require('os').cpus().length - 1
, maxCallsPerWorker           : Infinity
, maxConcurrentCallsPerWorker : Infinity
};
// const	workers = workerFarm(FARM_OPTIONS, require.resolve('./child'));
const	workers = workerFarm(require.resolve('./child'));


const blockDataHash = "blockDataHash";
const difficulty = 6;
let success = false;

let blockCandidate = {
	blockDataHash,
	dateCreated: '',
	nonce: 0,
	blockHash: '',
};

console.log('starting while loop');



const start = +new Date();


for (let i = 0; i < FARM_OPTIONS.maxConcurrentWorkers; i++) {
// for (let i = 0; i < 1; i++) {
	const input = {blockDataHash, difficulty}
	workers(input, (err, response) => {
		// console.log(response);
		// if (!response) return;

		const {
			timestamp,
			nonce,
			blockHash
		} = response;

		blockCandidate = {
			...blockCandidate,
			dateCreated: timestamp,
			nonce,
			blockHash
		}
		success = blockCandidate;
		onSuccess();
	})

}

const onSuccess = () => {
	const end = +new Date();
	workerFarm.end(workers);
	console.log(' *********** success recorded *********** ');
	console.log(success);
	console.log('while loop has ended');
	console.log(`Time taken: ${(end - start) / 1000} seconds`);
	process.exit();

}




/* NOTES 
This version simply starts 7 different mining threads, and so whichever one finishes first is the hash we go with.

Much easier and likely more efficient ? than the other method of starting 7 different hashing threads all working on the same nonce list.

*/