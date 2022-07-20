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

const nodeUrl = "https://stormy-everglades-34766.herokuapp.com/";
const getMiningJobUrl = `mining/get-mining-job/${myAddress}`;
const postMiningJobUrl = `mining/submit-mined-block`;

const getNewJob = async () => {
	return await (await fetch(`${nodeUrl}${getMiningJobUrl}`)).json();
}

const validProof = (hash, difficulty) => {
	return hash.slice(0, difficulty) === "0".repeat(difficulty);
}

const mineBlock = (block) => {
	let timestamp = Date.now().toISOString();
	let nonce = 0;
	let data = block.blockDataHash+"|"+timestamp+"|"+nonce;
	let hash = SHA256(data);
	
	while (!validProof(hash, block.difficulty)) {
		timestamp = Date.now().toISOString();
		nonce += 1;
		data = block.blockDataHash+"|"+timestamp+"|"+nonce;
		hash = SHA256(data);
	}

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
		console.log('hash candidate:', minedBlockCandidate.blockHash);

		const result = await postBlockCandidate(minedBlockCandidate);
		console.log('accepted?', result);
		console.log('\n---------\n');
	}
}

miner();