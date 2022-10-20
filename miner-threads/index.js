const { Worker, setEnvironmentData } = require('node:worker_threads');
const fetch = (...args) =>
	import('node-fetch').then(({ default: fetch }) => fetch(...args));
const {
	CONFIG: { defaultServerPort },
} = require('../blockchain/src/constants.js');

const HARD_CODED_WALLET_INFOS = require('./constants');

const argv = require('minimist')(process.argv.slice(2));
const PORT = argv.p ?? argv.port ?? defaultServerPort;
const WALLET_INDEX = argv.w ?? argv.i ?? argv.wallet ?? argv.index ?? 0;

// const PORT = Number(process.argv[2]) ?? defaultServerPort;
// const WALLET_INDEX = Number(process.argv[3]) ?? 0;
const { address: MINER_ADDRESS } =
	HARD_CODED_WALLET_INFOS[WALLET_INDEX] ?? 'testAddress' + '0'.repeat(29);

// const TEST_ADDRESS = 'testAddress'; // address of my miner
// const MINER_ADDRESS = TEST_ADDRESS + '0'.repeat(40 - TEST_ADDRESS.length);

// const NODE_URL = "https://stormy-everglades-34766.herokuapp.com/";
const NODE_URL = `http://localhost:${PORT}/`;

const GET_MINING_JOB_ROUTE = `mining/get-mining-job/${MINER_ADDRESS}`;
const POST_MINING_JOB_ROUTE = `mining/submit-mined-block`;

const FETCH_URL = `${NODE_URL}${GET_MINING_JOB_ROUTE}`;
const POST_URL = `${NODE_URL}${POST_MINING_JOB_ROUTE}`;

// const CPU_CORES = require('os').cpus().length;
const CPU_CORES = 5;
let workers = [];
let timer;

console.log(
	`Miner started: [${WALLET_INDEX}] => ${MINER_ADDRESS}\nMining this server: ${NODE_URL}`
);

const newWorkerPromise = (index) =>
	new Promise((resolve, reject) => {
		const worker = new Worker('./worker.js', { workerData: index });

		worker.on('message', resolve);
		worker.on('error', reject);
		worker.on('exit', (code) => {
			if (code !== 0) {
				reject(new Error(`stopped with ${code} exit code`));
			}
		});
	});

const mineMany = async (newJob) => {
	workers.splice(0, workers.length); // clear all workers
	setEnvironmentData('newJob', newJob);

	process.stdout.write('Starting workers ');

	// create our workers
	const workerPromiseArray = [];
	let i;
	for (i = 0; i < CPU_CORES; i++) {
		workerPromiseArray.push(newWorkerPromise(i));
	}

	console.log(
		`. . . ${i} Worker threads Started:`
		// , JSON.stringify(workers)
	);

	process.stdout.write('Mining . . . \033[0G');

	return await Promise.race(workerPromiseArray).then(
		({ workerIndex, pid, hashedBlockCandidate }) => {
			process.stdout.write('\n');
			console.log(
				`*** Winning worker: ${workerIndex} process ${pid}\nNonce: ${hashedBlockCandidate.nonce}`
			);

			workers.forEach((worker) => worker.terminate()); // hope this clears the remaining workers!

			return hashedBlockCandidate;
		}
	);
};

const fetchJob = async () =>
	(await (await fetch(FETCH_URL)).json()) || {
		errorMsg: 'Fetch error',
	};

const postBlockCandidate = async (blockCandidate) =>
	await (
		await fetch(POST_URL, {
			method: 'POST',
			body: JSON.stringify(blockCandidate),
			headers: { 'Content-Type': 'application/json' },
		})
	).json();

const run = async () => {
	while (true) {
		const beginning = +new Date(); // for timer
		let newBlockJob;
		let blockCandidate;
		let timeAfterGetJob;
		let timeAfterBlockMined;
		try {
			// fetch job
			newBlockJob = await fetchJob();
			timeAfterGetJob = +new Date();
			console.log('New Job Received:', JSON.stringify(newBlockJob));
			console.log(
				`~~ node response time: ${timeAfterGetJob - beginning} ms`
			);
		} catch (err) {
			console.log('Error fetching block candidate:', err.message);

			if (timer) clearTimeout(timer);
			timer = setTimeout( run, 5000);

			console.log('Retrying in 5 seconds...');
			return;
		}

		try {
			// mine the job with the workers
			blockCandidate = await mineMany(newBlockJob);
			timeAfterBlockMined = +new Date();
			console.log(blockCandidate);
			console.log(
				`~~ mine block candidate: ${
					(timeAfterBlockMined - timeAfterGetJob) / 1000
				} s`
			);
		} catch (err) {
			console.log('Error mining the block:', err.message);
		}

		try {
			// post to the node
			const postResult = await postBlockCandidate(blockCandidate);
			const timeAfterPostResponse = +new Date();
			console.log('Post result:', postResult);
			console.log(
				`~~ fetch post results: ${
					timeAfterPostResponse - timeAfterBlockMined
				} ms`
			);
			console.log('\n-----------------\n');
		} catch (err) {
			console.log('Error posting block:', err.message);
		}
	}
};

run();