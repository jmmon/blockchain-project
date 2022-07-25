const { Worker, setEnvironmentData } = require("node:worker_threads");
const fetch = (...args) =>
	import("node-fetch").then(({ default: fetch }) => fetch(...args));

// const CPU_CORES = require('os').cpus().length;
const CPU_CORES = 5;


// const NODE_URL = "https://stormy-everglades-34766.herokuapp.com/";
const NODE_URL = "http://localhost:5555/";

const MINER_ADDRESS = "testAddress"; // address of my miner
const PADDED_ADDRESS = MINER_ADDRESS + "0".repeat(40 - MINER_ADDRESS.length);
const GET_MINING_JOB_ROUTE = `mining/get-mining-job/${PADDED_ADDRESS}`;
const POST_MINING_JOB_ROUTE = `mining/submit-mined-block`;


const runWorker = (workerData) => {
	return new Promise((resolve, reject) => {
		const worker = new Worker("./worker.js", { workerData: workerData });
		// console.log("worker created");
		worker.on("message", resolve);
		worker.on("error", reject);
		worker.on("exit", (code) => {
			if (code !== 0) {
				reject(new Error(`stopped with ${code} exit code`));
			}
		});
	});
};




const mineMany = async (newJob) => {
	setEnvironmentData("newJob", newJob);

	const workerPromiseArray = [];
	for (let i = 0; i < CPU_CORES; i++) {
		workerPromiseArray.push(runWorker(i));
	}


	process.stdout.write("Mining ");
	return await Promise.race(workerPromiseArray).then(({index, pid, hashedBlockCandidate}) => {
		setEnvironmentData("newJob", undefined);
		process.stdout.write("\n");

		console.log(`*** Winning worker: ${index} process ${pid}\nNonce: ${hashedBlockCandidate.nonce}`);

		return hashedBlockCandidate;
	});
};


const getNewJob = async () => {
	return (
		(await (await fetch(`${NODE_URL}${GET_MINING_JOB_ROUTE}`)).json()) || {
			errorMsg: "Fetch error",
		}
	);
};

const postBlockCandidate = async (blockCandidate) => {
	return await (
		await fetch(`${NODE_URL}${POST_MINING_JOB_ROUTE}`, {
			method: "POST",
			body: JSON.stringify(blockCandidate),
			headers: { "Content-Type": "application/json" },
		})
	).json();
};

const run = async () => {
	while (true) {
		const beginning = +new Date();

		const newBlockJob = await getNewJob();
		const timeAfterGetJob = +new Date();
		console.log("New Job Received:", JSON.stringify(newBlockJob));
		console.log(`~~ fetch new job: ${timeAfterGetJob - beginning} ms`);

		const blockCandidate = await mineMany(newBlockJob);
		const timeAfterBlockMined = +new Date();
		console.log(blockCandidate);
		console.log(`~~ mine block candidate: ${(timeAfterBlockMined - timeAfterGetJob) / 1000} s`);


		const postResult = await postBlockCandidate(blockCandidate);
		const timeAfterPostResponse = +new Date();	
		console.log("Post result:", postResult);
		console.log(`~~ fetch post results: ${timeAfterPostResponse - timeAfterBlockMined} ms`);
		console.log('\n-----------------\n');
	}
};

run();

// while(true) run();

// setInterval(() => run(), 2000);
