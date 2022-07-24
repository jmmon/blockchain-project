// let fetch 
// (async function () {
// 	fetch = await import("node-fetch");
// })
// import fetch from "node-fetch";
// let fetch = import('node-fetch');

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const crypto = require("crypto");
const SHA256 = (message) => crypto.createHash('sha256').update(message).digest('hex');

// import mineBlock from "./basic example hashing copy/main";
const mineBlock = require('./basic example hashing copy/main');

const myAddress = "testAddress"; // address of my miner
const paddedAddress = myAddress + "0".repeat(40-myAddress.length);

const nodeUrl = "https://stormy-everglades-34766.herokuapp.com/";
// const nodeUrl = "http://localhost:5555/";
const getMiningJobUrl = `mining/get-mining-job/${paddedAddress}`;
const postMiningJobUrl = `mining/submit-mined-block`;

const getNewJob = async () => {
	return await (await fetch(`${nodeUrl}${getMiningJobUrl}`)).json() || {errorMsg: "Fetch error"};
}

const validProof = (hash, difficulty) => {
	return hash.slice(0, difficulty) === "0".repeat(difficulty);
}

// const mineBlock = (block) => {
// 	let nonce = 0;

// 	while (true) {
// 		const dateCreated = new Date().toISOString();
// 		const data = block.blockDataHash+"|"+dateCreated+"|"+nonce;
// 		const blockHash = SHA256(data);
// 		if (validProof(blockHash, block.difficulty)) {
// 			return {
// 				blockDataHash: block.blockDataHash,
// 				dateCreated,
// 				nonce,
// 				blockHash,
// 			};
// 		}
// 		nonce++;
// 	}
// }

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
		console.log('New Job Received:', newBlockJob);

		const timerStart = Date.now();
		// const minedBlockCandidate = await mineBlock(newBlockJob);
		let minedBlockCandidate;
		await mineBlock(newBlockJob, async (result) => {
			minedBlockCandidate = await result;
		})
		console.log("Block mined!", {minedBlockCandidate});


		
		// logging:
		// const timerTotalSeconds = (Date.now() - timerStart) / 1000;
		// const hashesPerSecond = minedBlockCandidate.nonce / timerTotalSeconds;
		// console.log(`Block mined! Nonce: ${minedBlockCandidate.nonce}, HashesPerSecond: ${Math.round(hashesPerSecond)}\n--blockHash: ${minedBlockCandidate.blockHash}`);

		const result = await postBlockCandidate(minedBlockCandidate);
		console.log({result});
		console.log('\n-----------------\n');
	}
}

miner();