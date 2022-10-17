/* 
This should run the mining function, validate the hash, and return false or the hash ( i think ).
So should take the current nonce, the data, and then should be able to perform the hash and return the value


I guess the main function should just loop indefinitely, starting service workers. Once a service worker finds the correct validated hash, it should end the main thread loop  and end all service workers.
*/

const {sha256Hash} = import('../../walletUtils/index');

const validProof = (hash, difficulty) => {
	return hash.slice(0, difficulty) === "0".repeat(difficulty);
}

module.exports = function (input, callback) {
	//runs its own loop and keeps track of its own nonce
	const {i, blockDataHash, difficulty} = input;
	console.log(`Worker ${i} started, process ${process.pid}`);

	let nonce = 0;

	while (true) {
		const dateCreated = new Date().toISOString();
		const dataToHash = `${blockDataHash}|${dateCreated}|${nonce}`;
		const blockHash = sha256Hash(dataToHash);

		if (isValidProof(blockHash, difficulty)) {
			console.log(`***Success: Worker ${i} process ${process.pid}`);
			callback(null, {
				dateCreated,
				nonce,
				blockHash
			});
			break;
		}
		nonce++;
	}
}