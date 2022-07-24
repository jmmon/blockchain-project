/* 
This should run the mining function, validate the hash, and return false or the hash ( i think ).
So should take the current nonce, the data, and then should be able to perform the hash and return the value


I guess the main function should just loop indefinitely, starting service workers. Once a service worker finds the correct validated hash, it should end the main thread loop  and end all service workers.
*/

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
	callback(null, true);
	// const {nonce, blockDataHash, difficulty} = input;
	// const timestamp = new Date().toISOString();
	// const dataToHash = `${blockDataHash}|${timestamp}|${nonce}`;
	// const blockHash = SHA256(dataToHash);
	// const result = validProof(blockHash, difficulty);
	// let response = null;
	// if (result) {
	// 	response = {dataToHash, blockHash}
	// 	// console.log(`${process.pid} - ${dataToHash} - ***********SUCCESS*********** - hash: ${blockHash}`);
	// }
	// // callback(null, JSON.stringify(response));
	// callback(null, true);
}