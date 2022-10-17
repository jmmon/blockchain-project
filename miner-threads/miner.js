const { Worker, setEnvironmentData } = require('node:worker_threads');
const fetch = (...args) =>
	import('node-fetch').then(({ default: fetch }) => fetch(...args));

// const CPU_CORES = require('os').cpus().length;
const CPU_CORES = 5;
let workers = [];

const MINER_ADDRESS = 'testAddress'; // address of my miner
const PADDED_ADDRESS = MINER_ADDRESS + '0'.repeat(40 - MINER_ADDRESS.length);

// const NODE_URL = "https://stormy-everglades-34766.herokuapp.com/";
const NODE_URL = 'http://localhost:5555/';

const GET_MINING_JOB_ROUTE = `mining/get-mining-job/${PADDED_ADDRESS}`;
const POST_MINING_JOB_ROUTE = `mining/submit-mined-block`;

const FETCH_URL = `${NODE_URL}${GET_MINING_JOB_ROUTE}`;
const POST_URL = `${NODE_URL}${POST_MINING_JOB_ROUTE}`;

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
		({ index, pid, hashedBlockCandidate }) => {
			process.stdout.write('\n');
			console.log(
				`*** Winning worker: ${index} process ${pid}\nNonce: ${hashedBlockCandidate.nonce}`
			);

			workerPromiseArray.forEach(worker => worker.terminate()); // hope this clears the remaining workers!

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

		// fetch job
		const newBlockJob = await fetchJob();
		const timeAfterGetJob = +new Date();
		console.log('New Job Received:', JSON.stringify(newBlockJob));
		console.log(`~~ node response time: ${timeAfterGetJob - beginning} ms`);

		// mine the job with the workers
		const blockCandidate = await mineMany(newBlockJob);
		const timeAfterBlockMined = +new Date();
		console.log(blockCandidate);
		console.log(
			`~~ mine block candidate: ${
				(timeAfterBlockMined - timeAfterGetJob) / 1000
			} s`
		);

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
	}
};

run();

// while(true) run();

// setInterval(() => run(), 2000);
