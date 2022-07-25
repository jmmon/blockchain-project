const { Worker, setEnvironmentData } = require("node:worker_threads");

const fetch = (...args) =>
	import("node-fetch").then(({ default: fetch }) => fetch(...args));
const crypto = require("crypto");
const SHA256 = (message) =>
	crypto.createHash("sha256").update(message).digest("hex");

const runService = (workerData) => {
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

const mine = async (newJob, index) => {
	setEnvironmentData("newJob", newJob);

	// const miningCandidate = {
	// 	i: index,
	// 	...newJob
	// };

	const result = await runService(index);
	// const result = await runService("hello john doe");

	// console.log({result});
	return result;
	//submit job
};

const mineMany = async (newJob) => {
	setEnvironmentData("newJob", newJob);
	const promiseArray = [];
	for (let i = 0; i < 7; i++) {
		promiseArray.push(runService(i));
	}

	return await Promise.race(promiseArray).then((result) => {
		return result;
	});
};

const myAddress = "testAddress"; // address of my miner
const paddedAddress = myAddress + "0".repeat(40 - myAddress.length);

const nodeUrl = "https://stormy-everglades-34766.herokuapp.com/";
// const nodeUrl = "http://localhost:5555/";
const getMiningJobUrl = `mining/get-mining-job/${paddedAddress}`;
const postMiningJobUrl = `mining/submit-mined-block`;

const getNewJob = async () => {
	return (
		(await (await fetch(`${nodeUrl}${getMiningJobUrl}`)).json()) || {
			errorMsg: "Fetch error",
		}
	);
};

const postBlockCandidate = async (blockCandidate) => {
	return await (
		await fetch(`${nodeUrl}${postMiningJobUrl}`, {
			method: "POST",
			body: JSON.stringify(blockCandidate),
			headers: { "Content-Type": "application/json" },
		})
	).json();
};

const run = async () => {
	while (true) {
		console.log("run fires");

		const newBlockJob = await getNewJob();
		console.log("New Job Received:", JSON.stringify(newBlockJob));

		const blockCandidate = await mineMany(newBlockJob);
		console.log({blockCandidate});

		const postResult = await postBlockCandidate(blockCandidate);
		console.log("Post result:", postResult);
		console.log('\n-----------------\n');
	}
};

run();

// while(true) run();

// setInterval(() => run(), 2000);
