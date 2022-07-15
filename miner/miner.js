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
	const newJob = await fetch(`${nodeUrl}${getMiningJobUrl}`);
	return await newJob.json();
}

const validProof = (hash, difficulty) => {
	return hash.slice(0, difficulty) === "0".repeat(difficulty);
}

const mineBlock = (block) => {
	let timestamp = Date.now().toString();
	let nonce = 0;
	let data = block.blockDataHash+"|"+timestamp+"|"+nonce;
	let hash = SHA256(data);
	// console.log('data', data, '\n--->', hash);
	
	while (!validProof(hash, block.difficulty)) {
		timestamp = Date.now().toString();
		nonce += 1;
		data = block.blockDataHash+"|"+timestamp+"|"+nonce;
		// console.log('data', data, '\n--->', hash);
		hash = SHA256(data);
	}
	console.log('success!', hash);

	return {
		blockDataHash: block.blockDataHash,
		dateCreated: timestamp,
		nonce: nonce,
		blockHash: hash,
	};
}

const postBlockCandidate = async (blockCandidate) => {
	const postJob = await fetch(`${nodeUrl}${postMiningJobUrl}`, {
		method: "POST",
		body: JSON.stringify(blockCandidate),
		headers: { "Content-Type": "application/json" },
	});

	const message = await postJob.json();

	// console.log(message);
	return {
		status: postJob.status === 200,
		...message
	};
}

const miner = async () => {
	while(true) {
		//1. take a mining job:
		//	get nodeUrl/mining/get-mining-job/:address ??my miner's address?
		const newBlock = await getNewJob();
		console.log({newBlock});

		//2. Mine the mining job!
		//	Increment nonce until hash matches the block difficulty
		const minedBlockCandidate = await mineBlock(newBlock);

		// //3. Submit the mined job
		// //	post block to nodeUrl/mining/submit-mined-block
		const result = await postBlockCandidate(minedBlockCandidate);
		console.log({result});
	}
}

miner();