const workerFarm = require('worker-farm');
// const FARM_OPTIONS     = {
// 	maxConcurrentWorkers        : require('os').cpus().length - 1
// , maxCallsPerWorker           : 1
// , maxConcurrentCallsPerWorker : 1
// };
// const	workers = workerFarm(FARM_OPTIONS, require.resolve('./child'));
const	workers = workerFarm(require.resolve('./child'));


const blockDataHash = "blockDataHash";
const difficulty = 6;
let blockCandidateHash = null;

console.log('starting while loop');

const start = +new Date();
const cpus = require('os').cpus().length;

for (let i = 0; i < cpus; i++) {
	// console.log(`starting worker #${i}...`);
// for (let i = 0; i < 1; i++) {
	const input = {i, blockDataHash, difficulty};
	workers(input, (err, { dateCreated, nonce, blockHash }) => {
		blockCandidateHash = {
			blockDataHash,
			dateCreated,
			nonce,
			blockHash
		};
		onSuccess();
	})

}

const onSuccess = () => {
	workerFarm.end(workers);
	const end = +new Date();
	console.log(' *********** success recorded *********** ');
	console.log(blockCandidateHash);
	console.log('while loop has ended');
	console.log(`Time taken: ${(end - start) / 1000} seconds`);
	process.exit();
}




/* NOTES 
This version simply starts 7 different mining threads, and so whichever one finishes first is the hash we go with.

Much easier and likely more efficient ? than the other method of starting 7 different hashing threads all working on the same nonce list.

*/