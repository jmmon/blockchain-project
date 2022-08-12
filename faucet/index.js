const path = require("path");
const express = require("express");
const session = require("express-session");
const favicon = require("serve-favicon");
const ejs = require("ejs");
const URL = require("url").URL;
const fs = require("fs");
const { get } = require("https");

const payoutRecord = "payoutRecord/"; //  TODO: set wallets directory
const filePath = `${payoutRecord}payoutRecord.json`;

const app = express();
const port = 3007;

app.use(
	favicon(path.join(__dirname, "public", "images", "favicon.ico"), {
		maxAge: 0,
	})
);

app.use(
	session({
		secret: "keyboard cat",
		resave: false,
		saveUninitialized: true,
	})
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set("view engine", "ejs");
app.engine("html", ejs.renderFile);
app.use(express.static("public"));

// We have an address. We need to check if it exists in our database (could use it as a key)
// if it exists,
//		we need to check the timestamp (the value) and make sure that one hour has passed.
// 		if not, we send an error
//		if so, we can update the value to the new timestamp and do our payout.

// if it doesn't exist,
// 		we can do the payout and add a new entry to our file (saving the timestamp)
const db = {
	init() {
		if (!fs.existsSync(payoutRecord)) {
			fs.mkdirSync(payoutRecord);
		}
		if (!fs.existsSync(filePath)) {
			fs.writeFileSync(filePath, "{}");
		}
		return true;
	},

	get() {
		let object = {};
		try {
			const fileContents = fs.readFileSync(filePath, "utf8");
			object = JSON.parse(fileContents);
			console.log({ object });
		} catch (err) {
			console.log(err);
		}
		return object;
	},

	updateAddress(object, address) {
		// request timestamp
		const currentTimeMs = Date.now();

		// if already exists
		if (object[address]) {
			// check timestamp
			const previousTimestampMs = Date.parse(object[address]);
			const differenceSeconds =
				(currentTimeMs - previousTimestampMs) / 1000;

			// if waited an hour or more
			if (differenceSeconds >= 4) {
				// 3600
				// add to file
				object[address] = new Date(currentTimeMs).toISOString();
				return true;
			} else {
				// error, not enough time has passed
				const endingTimestampMs = previousTimestampMs + 60 * 60 * 1000;
				const secondsRemaining =
					(endingTimestampMs - currentTimeMs) / 1000;
				const minutesRemaining = Math.ceil(secondsRemaining / 60);
				console.log(
					`Error: please wait about ${minutesRemaining} more minutes!`
				);

				return false;
			}
		}

		// new address, save the timestamp
		object[address] = new Date(currentTimeMs).toISOString();
		return true;
	},

	save(object) {
		try {
			// then re-save to file
			const dataJson = JSON.stringify(object);
			fs.writeFileSync(filePath, dataJson);
			console.log(
				"Done rewriting to file!\n",
				{ object },
				"\n",
				dataJson
			);
			return object;
		} catch (err) {
			console.log(err);
		}
	},

	findAndSave(address, callback) {
		// grab file contents (an array) and
		// eventually, overwrite file with our new array
		let object = this.get();
		const success = this.updateAddress(object, address);

		if (success) {
			const updatedDatabase = this.save(object);
			return callback(success, updatedDatabase);
		}
		return callback(false);
	},
};


(async () => {
	const {
		default: {
			decryptAndSign,
			submitTransaction,
		},
	} = await import("../walletUtils/index.js");
	const { default: fetch } = await import("node-fetch");

	db.init();

	const faucetWalletInfo = {
		mnemonic: 'bright pledge fan pet mesh crisp ecology luxury bulb horror vacuum brown',
		privateKey: '51a8bbf1192e434f8ff2761f95ddf1ba553447d2c1decd92cca2f43cd8609574',
		publicKey: '46da25d657a170c983dc01ce736094ef11f557f8a007e752ac1eb1f705e1b9070',
		address: 'eae972db2776e38a75883aa2c0c3b8cd506b004d',
	};

	const signAndSend = async (success, object = undefined) => {
		if (success) {
			console.log({newDatabase: object});
			// payout! sign and send transaction
			const keys = {
				privateKey: faucetWalletInfo.privateKey,
				publicKey: faucetWalletInfo.publicKey,
				address: faucetWalletInfo.address,
			};

			const getConfirmedBalance = async (nodeUrl, address) => {
				// fetch balance from node!
				const balanceData = await fetch(`${nodeUrl}/${address}/balance`);
				console.log("fetched data keys:", Object.keys(balanceData));

				if (balanceData.size === 0) {
					return 0;
				} else {
					return balanceData.confirmedBalance;
				}
			}

			const nodeUrlShouldComeFromHtml = 'http://localhost:5555';
			const confirmedBalance = await getConfirmedBalance(nodeUrlShouldComeFromHtml, faucetWalletInfo.address);
			const amount = (confirmedBalance > 1) ? 1 : confirmedBalance;

			const signedTransaction = await decryptAndSign(
				keys, // faucet keys
				address, // recipient
				amount, // amount
			);

			if (signedTransaction.error) {
				console.log('signing error:', signedTransaction.error);
				return {data: null, error: signedTransaction.error};
			}

			const submitResponse = await submitTransaction(nodeUrlShouldComeFromHtml, signedTransaction);

			if (submitResponse.error) {
				console.log('submit error:', submitResponse.error);
				return {data: null, error: submitResponse.error};
			}

			//transaction was signed and sent! draw success view:
			return {data: {transactionDataHash: signedTransaction.transactionDataHash, amount}, error: null};

		} else {
			// error saving, do not send transaction
			console.error("Error saving transaction!");
		}
	};

	app.get("/", async (req, res) => {
		const active = "index";
		const transactionData = req.session.data;
		if (!transactionData) {
			// render our entry page version
			drawView(res, active, {
				transactionData: undefined,
			});
		} else {
			// render our complete page version
			drawView(res, active, {
				transactionData,
			});
		}
	});

	app.post("/", async (req, res) => {
		const active = "index";
		const address = req.body.address;
		const nodeUrl = req.body.nodeUrl;
		const captcha = req.body.captcha;

		if (
			address === "" ||
			(address === undefined && nodeUrl === "") ||
			nodeUrl === undefined
		) {
			drawView(res, active, {
				transactionData: undefined,
				error: "Please be sure boxes are filled correctly!",
			});
			return;
		}

		if (!captcha) {
			drawView(res, active, {
				transactionData: undefined,
				error: "Invalid captcha!",
			});
			return;
		}

		// else we try sending a transaction to the recipient
		const response = await db.findAndSave(address, signAndSend);
		console.log('db save and send response: should have data with transaction data, and null error', {response});

		const transactionData = {...response.data, address}; // transactionDataHash, amount

		// on success:
		// const transactionData = {amount: 'some amount', address: 'some address', transactionDataHash: 'some transaction data hash'};
		req.session.transactionData = transactionData;
		req.session.save((err) => {
			if (err) {
				drawView(res, active, {
					transactionData: undefined,
					error: "Error saving to session!",
				});
				return;
			}

			drawView(res, active, {
				transactionData,
				error: undefined,
			});
		});
	});

	// Preset helper functions ===

	const drawView = (res, view, data = {}) =>
		res.render(__dirname + "/views/" + view + ".html", data);

	app.listen(port, () => {
		console.log(`App running on http://localhost:${port}`);
	});
})();
