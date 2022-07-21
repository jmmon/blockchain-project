// let fetch 
// (async function () {
// 	fetch = await import("node-fetch");
// })
// import fetch from "node-fetch";
// let fetch = import('node-fetch');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const crypto = require("crypto");
const SHA256 = (message) => crypto.createHash('sha256').update(message).digest('hex');

const myAddress = "testAddress"; // address of my miner
const paddedAddress = myAddress + "0".repeat(40-myAddress.length);

// const nodeUrl = "https://stormy-everglades-34766.herokuapp.com/";
const nodeUrl = "http://localhost:5555/";
const getMiningJobUrl = `mining/get-mining-job/${paddedAddress}`;
const postMiningJobUrl = `mining/submit-mined-block`;

const getNewJob = async () => {
	return await (await fetch(`${nodeUrl}${getMiningJobUrl}`)).json();
}

const validProof = (hash, difficulty) => {
	return hash.slice(0, difficulty) === "0".repeat(difficulty);
}

const mineBlock = (block) => {
	let timestamp = new Date().toISOString();
	let nonce = 0;
	let data = block.blockDataHash+"|"+timestamp+"|"+nonce;
	let hash = SHA256(data);
	// process.stdout.write('Mining');
	
	while (!validProof(hash, block.difficulty)) {
		timestamp = new Date().toISOString();
		nonce += 1;
		data = block.blockDataHash+"|"+timestamp+"|"+nonce;
		hash = SHA256(data);
		const maxDots = 50;
		let dotsNumber = Math.round(nonce / (16 ** (block.difficulty - 1)));
		if (dotsNumber > maxDots) {
			dotsNumber -= maxDots
		}
		process.stdout.write('Mining ' +  nonce + " .".repeat(dotsNumber) + " .\033[0G");
		// process.stdout.write("Mining Hash: "+ hash + " \033[0G");
		// if (nonce % (16**(block.difficulty-1)) === 0) {
		// 	process.stdout.write('.');
		// }
	}
	process.stdout.write('\n');

	return {
		blockDataHash: block.blockDataHash,
		dateCreated: timestamp,
		nonce: nonce,
		blockHash: hash,
	};
}

const postBlockCandidate = async (blockCandidate) => {
	return await (await fetch(`${nodeUrl}${postMiningJobUrl}`, {
		method: "POST",
		body: JSON.stringify(blockCandidate),
		headers: { "Content-Type": "application/json" },
	})).json();
};


// 1. take a mining job:
// 	get nodeUrl/mining/get-mining-job/:address ??my miner's address?
// 2. Mine the mining job!
// 	Increment nonce until hash matches the block difficulty
// 3. Submit the mined job
//	post block to nodeUrl/mining/submit-mined-block

const miner = async () => {
	while(true) {
		const newBlockJob = await getNewJob();
		console.log('New Job:', newBlockJob);

		const minedBlockCandidate = await mineBlock(newBlockJob);
		console.log(`Block mined: Nonce: ${minedBlockCandidate.nonce}\n--blockHash: ${minedBlockCandidate.blockHash}`);

		const result = await postBlockCandidate(minedBlockCandidate);
		console.log('accepted?', result);
		console.log('\n---------\n');
	}
}

miner();