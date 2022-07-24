const workerFarm = require('worker-farm');
const FARM_OPTIONS     = {
	maxConcurrentWorkers        : require('os').cpus().length
, maxCallsPerWorker           : Infinity
, maxConcurrentCallsPerWorker : 1
};
const	workers = workerFarm(FARM_OPTIONS, require.resolve('./child'));


const crypto = require("crypto");
const SHA256 = (message) => crypto.createHash('sha256').update(message).digest('hex');

// const defaultOptions = {
	// 	workerOptions               : {}
	// , maxCallsPerWorker           : Infinity
// , maxConcurrentWorkers        : require('os').cpus().length
// , maxConcurrentCallsPerWorker : 10
// , maxConcurrentCalls          : Infinity
// , maxCallTime                 : Infinity
// , maxRetries                  : Infinity
// , autoStart                   : false
// , onChild                     : function() {}
// };

// let numberOfAttempts = 0;
// const end = 1000;
// for (let i = 0; i < end; i++) {
	// 	const callback = (err, output) => {
	// 		console.log(output);
	// 		if (++numberOfAttempts == end) {
	// 			workerFarm.end(workers);
	// 		}
	// 	}
	// 	workers(`#${i} FOO`, callback);
	// }


const data = "blockDataHash";
let success = false;
let nonce = 0;

while (!success) {
	const callback = (err, output) => {
		console.log(output);
		if (++numberOfAttempts == end) {
			workerFarm.end(workers);
		}
	}
	workers(`#${i} FOO`, callback);
}

// 

const validProof = (hash, difficulty) => {
	return hash.slice(0, difficulty) === "0".repeat(difficulty);
}

const mineBlock = (block) => {
	let timestamp = new Date().toISOString();
	let nonce = 0;
	let data = block.blockDataHash+"|"+timestamp+"|"+nonce;
	let hash = SHA256(data);
	// process.stdout.write('Mining');
	let maxZeroesFound = Array.from(hash.slice(0, block.difficulty)).filter(char => char === "0").length;
	
	while (!validProof(hash, block.difficulty)) {
		timestamp = new Date().toISOString();
		nonce += 1;
		data = block.blockDataHash+"|"+timestamp+"|"+nonce;
		hash = SHA256(data);


  	// for logging:
		const zeroesAtStartArray = Array.from(hash.slice(0, block.difficulty)).filter(char => char === "0");
		if (zeroesAtStartArray.length > maxZeroesFound) {
			maxZeroesFound = zeroesAtStartArray.length;
		}
		const zeroesAtStartString = zeroesAtStartArray.join('') + "-".repeat(block.difficulty - zeroesAtStartArray.length);

		const maxDots = 20;
		let dotsNumber = Math.round(nonce / (16 ** (block.difficulty - 1)));
		while (dotsNumber > maxDots) {
			dotsNumber -= maxDots;
		}
		process.stdout.write('Mining ' +  nonce + " : " + maxZeroesFound + " | " + zeroesAtStartString + " .".repeat(dotsNumber) + " .\033[0G");
	}
	process.stdout.write('\n');

	return {
		blockDataHash: block.blockDataHash,
		dateCreated: timestamp,
		nonce: nonce,
		blockHash: hash,
	};
}