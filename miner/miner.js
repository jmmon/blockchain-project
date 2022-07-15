// let fetch 
// (async function () {
// 	fetch = await import("node-fetch");
// })
// import fetch from "node-fetch";
// let fetch = import('node-fetch');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const crypto = require("crypto");
const SHA256 = (message) => crypto.createHash('sha256').update(message).digest('hex');

const myAddress = "testAddress";

const nodeUrl = "https://stormy-everglades-34766.herokuapp.com/";
const getMiningJobUrl = `mining/get-mining-job/${myAddress}`;
const postMiningJobUrl = `mining/submit-mined-block`;




// while (true) {
	//1. take a mining job:
	//	get nodeUrl/mining/get-mining-job/:address ??my miner's address?
(async function() {

	const newJob = await fetch(`${nodeUrl}${getMiningJobUrl}`);
	const newBlock = await newJob.json();

	console.log(newBlock);


	const validProof = (hash) => {
		return hash.slice(0, newBlock.difficulty) === "0".repeat(newBlock.difficulty);
	}


	//2. Mine the mining job!
	//	Increment nonce until hash matches the block difficulty
	let timestamp = Date.now().toString();
	let nonce = 0;
	let data = newBlock.blockDataHash+"|"+timestamp+"|"+nonce;
	let hash = SHA256(data);
	// console.log('data', data, '\n--->', hash);
	
	while (!validProof(hash)) {
		timestamp = Date.now().toString();
		nonce += 1;
		data = newBlock.blockDataHash+"|"+timestamp+"|"+nonce;
		// console.log('data', data, '\n--->', hash);
		hash = SHA256(data);
	}

	console.log('success! Got hash', hash);

	//3. Submit the mined job
	//	post block to nodeUrl/mining/submit-mined-block
	let minedBlockCandidate = {
		blockDataHash: newBlock.blockDataHash,
		dateCreated: timestamp,
		nonce: nonce,
		blockHash: hash,
	}
	const postJob = await fetch(`${nodeUrl}${postMiningJobUrl}`, {
		method: "POST",
		body: JSON.stringify(minedBlockCandidate),
		headers: { "Content-Type": "application/json" },
	});

	const message = await postJob.json();
	const status = postJob.status;

	console.log(status);
	console.log(message);
// }

})()