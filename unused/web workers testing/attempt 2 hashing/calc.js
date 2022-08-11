'use strict'

/* A simple π estimation function using a Monte Carlo method
 * For 0 to `points`, take 2 random numbers < 1, square and add them to
 * find the area under that point in a 1x1 square. If that area is <= 1
 * then it's *within* a quarter-circle, otherwise it's outside.
 * Take the number of points <= 1 and multiply it by 4 and you have an
 * estimate!
 * Do this across multiple processes and average the results to
 * increase accuracy.
 */

// module.exports = function (points, callback) {
//   let inside = 0
//     , i = points

//   while (i--)
//     if (Math.pow(Math.random(), 2) + Math.pow(Math.random(), 2) <= 1)
//       inside++

//   callback(null, (inside / points) * 4)
// }


const crypto = require("crypto");
const SHA256 = (message) => crypto.createHash('sha256').update(message).digest('hex');

const validProof = (hash, difficulty) => {
	return hash.slice(0, difficulty) === "0".repeat(difficulty);
}


// module.exports = function ({nonce, blockDataHash, difficulty}, callback) {
// 	// console.log({nonce, blockDataHash, difficulty});
// 	const timestamp = new Date().toISOString();
// 	const dataToHash = `${blockDataHash}|${timestamp}|${nonce}`;
// 	const blockHash = SHA256(dataToHash);
	
// 	const result = validProof(blockHash, difficulty);

// 	if (!result) {
// 		// console.log(`${process.pid} - ${dataToHash}`);
// 		callback(null, null);
// 	} else {
// 		console.log(`${process.pid} - ${dataToHash} - ***********SUCCESS*********** - hash: ${blockHash}`);
// 		const response = {dataToHash, blockHash};
// 		callback(null, response);
// 	}

// }
module.exports = function (input, callback) {
	// callback(null, true);
	const {nonce, blockDataHash, difficulty} = input;
	const timestamp = new Date().toISOString();
	const dataToHash = `${blockDataHash}|${timestamp}|${nonce}`;
	const blockHash = SHA256(dataToHash);
	const result = validProof(blockHash, difficulty);

	if (result) {
    console.log('Success with hash', blockHash);
    
	  callback(null, {
      blockDataHash,
      timestamp,
      nonce, 
      difficulty,
      blockHash
    });
		// console.log(`${process.pid} - ${dataToHash} - ***********SUCCESS*********** - hash: ${blockHash}`);
	} else {
    console.log('hash failed');
    callback(null, false);

  }
	// callback(null, JSON.stringify(response));
}