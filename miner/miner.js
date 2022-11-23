const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { SHA256, isValidProof } = require('../libs/hashing.js');

const myAddress = "testAddress"; // address of my miner
const paddedAddress = myAddress + "0".repeat(40-myAddress.length);

const NODE_URL = "http://localhost:5555/";
const GET_MINING_JOB_ROUTE = `mining/get-mining-job/${paddedAddress}`;
const POST_MINING_JOB_ROUTE =  `mining/submit-mined-block`;

const FETCH_URL = `${NODE_URL}${GET_MINING_JOB_ROUTE}`;
const POST_URL = `${NODE_URL}${POST_MINING_JOB_ROUTE}`;

const fetchJob = async () =>
	(await (await fetch(FETCH_URL)).json()) || {
		errorMsg: 'Fetch error',
	};

const mineBlock = (block) => {
	let nonce = 0;
	let maxZeroesFound = 0; // for logging

	while (true) {
		const dateCreated = new Date().toISOString();
		const data = block.blockDataHash+"|"+dateCreated+"|"+nonce;
		const blockHash = SHA256(data);

		//logging:
		const zeroesAtStartArray = Array.from(blockHash.slice(0, block.difficulty)).filter(char => char === "0");
		if (zeroesAtStartArray.length > maxZeroesFound) {
			maxZeroesFound = zeroesAtStartArray.length;
		}
		const zeroesAtStartString = zeroesAtStartArray.join('') + "-".repeat(block.difficulty - zeroesAtStartArray.length);

		const maxDots = 20;
		let dotsNumber = Math.round(nonce / (16 ** (block.difficulty - 1)));
		while (dotsNumber > maxDots) {
			dotsNumber -= maxDots;
		}
		// process.stdout.write('Mining ' +  nonce + " : " + maxZeroesFound + " | " + zeroesAtStartString + " .".repeat(dotsNumber) + " .\033[0G");
		process.stdout.write('Mining ' +  nonce + " : " + maxZeroesFound + " | " + zeroesAtStartString + "\033[0G");
		//end logging

		// actual validating proof
		if (isValidProof(blockHash, block.difficulty)) {
			process.stdout.write('\n');
			return {
				blockDataHash: block.blockDataHash,
				dateCreated: dateCreated,
				nonce: nonce,
				blockHash: blockHash,
			};
		}
		nonce++;
	}
}

const postBlockCandidate = async (blockCandidate) => {
	return await (await fetch(POST_URL, {
		method: "POST",
		body: JSON.stringify(blockCandidate),
		headers: { "Content-Type": "application/json" },
	})).json();
};

const run = async () => {
	while(true) {
		// get job
		const newBlockJob = await fetchJob();
		console.log('New Job Received:', newBlockJob);

		// mine block (and calculate duration and hash per second)
		const timerStart = Date.now();
		const minedBlockCandidate = await mineBlock(newBlockJob);
		const timerTotalSeconds = (Date.now() - timerStart) / 1000;
		const hashesPerSecond = minedBlockCandidate.nonce / timerTotalSeconds;
		console.log(`Block mined! Nonce: ${minedBlockCandidate.nonce}, HashesPerSecond: ${Math.round(hashesPerSecond)}\n--blockHash: ${minedBlockCandidate.blockHash}`);

		// attempt submit block to node
		const result = await postBlockCandidate(minedBlockCandidate);
		console.log({result});
		console.log('\n-----------------\n');
	}
}

run();