const path = require("path");
const express = require("express");
const ejsLayouts = require("express-ejs-layouts");
const session = require("express-session");
const favicon = require("serve-favicon");
const ejs = require("ejs");
const URL = require("url").URL;
const fs = require("fs");
const { get } = require("https");

const payoutRecord = "payoutRecord/"; //  TODO: set wallets directory
const filePath = `${payoutRecord}payoutRecord.json]`;

const initPayoutRecordDirectory = async() => {
	if (!fs.existsSync(payoutRecord)) {
		fs.mkdirSync(payoutRecord);
	}
	if (!fs.existsSync(filePath)) {
		fs.writeFileSync(filePath, "{}");
	}
	return true;
};




const app = express();
const port = 3007;

let addressNumber = 0;

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
app.use(ejsLayouts);
app.set("layout", "layouts/layout");

const authChecker = (req, res, next) => {
	if (req.session.wallet) {
		return next();
	}
	res.redirect("/create");
};

(async () => {
	const {
		default: {
			generateWallet,
			encrypt,
			decrypt,
			deriveKeysFromMnemonic,
			signTransaction,
			hashTransaction,
			getAddressFromCompressedPubKey,
			CONSTANTS,
		},
	} = await import("../walletUtils/index.js");
	const { default: fetch } = await import("node-fetch");

	initPayoutRecordDirectory();



	const dbUpdate = (object) => {
		try {
			// then re-save to file
			const dataJson = JSON.stringify(object);
			fs.writeFileSync(filePath, dataJson);
			console.log('Done rewriting to file!\n', {object}, '\n', dataJson);

		} catch(err) {
			console.log(err);
		}
	}

	const dbGet = () => {
		let object = {};
		try {
			const fileContents = fs.readFileSync(filePath, "utf8");
			object = JSON.parse(fileContents);
			console.log({object});

		} catch(err) {
			console.log(err);
		}
		return object;
	}

	const updateAddress = (object) => {
		// request timestamp
		const currentTimeMs = Date.now();

		// if already exists
		if (object[address]) {
			// check timestamp
			const previousTimestampMs = Date.parse(object[address]);
			const differenceSeconds = (currentTimeMs - previousTimestampMs) / 1000;

			// if waited an hour or more
			if (differenceSeconds >= 4) { // 3600
				// add to file
				object[address] = new Date(currentTimeMs).toISOString();
				return true;

			} else {
				// error, not enough time has passed
				const endingTimestampMs = previousTimestampMs + (60 * 60 * 1000);
				const secondsRemaining = (endingTimestampMs - currentTimeMs) / 1000;
				const minutesRemaining = Math.ceil(secondsRemaining / 60);
				console.log(`Error: please wait about ${minutesRemaining} more minutes!`);

				return false;
			}

		}

		// new address, save the timestamp
		object[address] = new Date(currentTimeMs).toISOString();
		return true;
	}

	const updateDb = (address, callback) => {
		// We have an address. We need to check if it exists in our database (could use it as a key)
		// if it exists,
		//		we need to check the timestamp (the value) and make sure that one hour has passed.
		// 		if not, we send an error
		//		if so, we can update the value to the new timestamp and do our payout.

		// if it doesn't exist,
		// 		we can do the payout and add a new entry to our file (saving the timestamp)

		// grab file contents (an array) and 
		// eventually, overwrite file with our new array
		let object = dbGet();

		const success = updateAddress(object);

		if (success) {
			dbUpdate(object);
			return callback(success, object);
		}
		return callback(false);
		
	}



	app.get("/", async (req, res) => {
		const active = "index";
		drawView(res, active, {
			wallet: req.session.wallet,
			active,
		});

		// for testing: add an item to our "db" on each get request

		
		// generate random address
		const address = "" + getAddressFromCompressedPubKey("" + addressNumber);
		console.log({ address });
		// for testing duplicate addresses
		addressNumber++;
		if (addressNumber > 4) addressNumber = 0;

		updateDb(address, (success, object = undefined) => {
			if (success) {
				// payout!
			} else {
				// error saving, do not send transaction
			}
		});
		
	});

	// logout simply removes wallet from session and loads index page
	app.get("/logout", authChecker, (req, res) => {
		const active = "index";
		req.session.wallet = undefined;
		drawView(res, active, {
			active,
		});
	});

	//  Create endpoint
	app.get("/create", (req, res) => {
		const active = "create";
		drawView(res, active, {
			wallet: req.session.wallet,
			active,
		});
	});

	app.post("/create", async (req, res) => {
		const active = "create";
		console.log("~req", req.body);
		const password = req.body.password;
		const repeatPassword = req.body.confirmPassword;

		// Make simple validation
		redrawForInvalidPasswords(password, repeatPassword, res, active);

		// Generate wallet from random mnemonic
		const wallet = await generateWallet();
		console.log({ walletGenerated: wallet });
		const { mnemonic, privateKey, publicKey, address } = wallet;

		// encrypt mnemonic with password
		const response = encrypt(mnemonic, password);
		console.log({ encryptResponse: response });
		if (response.error) {
			drawView(res, active, {
				active,
				error: "Error encrypting wallet! Try again?",
			});
			return;
		}

		// save mnemonic and address to session
		const mnemonicAndAddress = {
			encryptedMnemonic: response.data,
			address,
		};

		req.session.wallet = mnemonicAndAddress;
		req.session.save((err) => {
			if (err) {
				drawView(res, active, {
					active,
					error: "Error saving session!",
				});
				return;
			}

			drawView(res, active, {
				wallet: mnemonicAndAddress,
				active,
				mnemonic,
				privateKey,
				publicKey,
				address,
			});
		});
	});

	app.get("/recover", (req, res) => {
		const active = "recover";
		drawView(res, active, {
			wallet: req.session.wallet,
			active,
		});
	});

	//recover wallet
	app.post("/recover", async (req, res) => {
		const active = "recover";
		// fetch user data (mnemonic and password)
		const mnemonic = req.body.mnemonic;
		const password = req.body.password;
		const repeatPassword = req.body.confirmPassword;

		// Make simple validation
		redrawForInvalidPasswords(
			password,
			repeatPassword,
			res,
			active,
			mnemonic
		);

		const { privateKey, publicKey, address } = await deriveKeysFromMnemonic(
			mnemonic
		);
		console.log({ privateKey, publicKey, address });

		// encrypt mnemonic with password
		const response = encrypt(mnemonic, password);
		console.log({ encryptResponse: response });
		if (response.error) {
			drawView(res, active, {
				active,
				error: "Error encrypting wallet! Try again?",
			});
			return;
		}

		// save mnemonic and address to session
		const mnemonicAndAddress = {
			encryptedMnemonic: response.data,
			address,
		};

		req.session.wallet = mnemonicAndAddress;
		req.session.save((err) => {
			if (err) {
				drawView(res, active, {
					active,
					mnemonic,
					error: "Error saving session!",
				});
				return;
			}

			drawView(res, active, {
				wallet: mnemonicAndAddress,
				active,
				mnemonic,
				privateKey,
				publicKey,
				address,
			});
		});
	});

	app.get("/balance", authChecker, (req, res) => {
		const active = "balance";
		const wallet = req.session.wallet;
		console.log(req.session.wallet);
		drawView(res, active, {
			wallet,
			active,
		});
	});

	app.post("/balance", async (req, res) => {
		const active = "balance";
		const password = req.body.password;
		const nodeUrl = req.body.nodeUrl;
		console.log(req.session.wallet);

		if (!req.session.wallet) {
			drawView(res, active, {
				active,
				error: "Please load wallet from mnemonic, or create one.",
			});
			return;
		}

		// decrypt wallet and add to session
		const response = decrypt(
			req.session.wallet.encryptedMnemonic,
			password
		);
		if (response.error) {
			drawView(res, active, {
				wallet: req.session.wallet,
				active,
				error: "Error decrypting wallet! Try a different password?",
			});
			return;
		}

		const { privateKey, publicKey, address } = await deriveKeysFromMnemonic(
			response.data
		);
		console.log({ privateKey, publicKey, address });

		// fetch balance from node!
		const balanceData = await fetch(`${nodeUrl}/${address}/balance`);
		console.log("fetched data keys:", Object.keys(balanceData));

		if (balanceData.size === 0) {
			drawView(res, active, {
				wallet: req.session.wallet,
				active,
				balances: `No balances found!`,
			});
		} else {
			drawView(res, active, {
				wallet: req.session.wallet,
				active,
				balances: `Private Key:\n${privateKey}\nPublic Key:\n${publicKey}\nAddress:\n${address}`,
			});
		}
	});

	app.get("/send", authChecker, (req, res) => {
		const active = "send";
		drawView(res, active, {
			wallet: req.session.wallet,
			active,
			signedTransaction: req.session.signedTransaction,
		});
	});

	// have send view handle signing and sending:
	// if we have signed transaction, we attempt the send;
	// otherwise we sign transaction and reload the send view with the signed data
	app.post("/send", async (req, res) => {
		const active = "send";
		const wallet = req.session.wallet;

		if (!req.session.signedTransaction) {
			// Sign the transaction data
			// save it to session
			// redraw this page with signed transaction

			const recipient = req.body.recipient;
			const amount = req.body.amount;
			const password = req.body.password;

			//simple validation
			if (
				recipient === "" ||
				(recipient === undefined && amount === "") ||
				amount === undefined ||
				amount <= 0 ||
				!wallet
			) {
				drawView(res, active, {
					wallet,
					active,

					error: "Please be sure boxes are filled correctly!",
				});
				return;
			}

			// //unlock wallet for signing
			// const decryptedMnemonic = decrypt(
			// 	req.session.wallet.encryptedMnemonic,
			// 	req.body.password
			// );
			// console.log({ decryptedMnemonic });

			// decrypt wallet for signing
			const response = decrypt(wallet.encryptedMnemonic, password);
			if (response.error) {
				drawView(res, active, {
					wallet,
					active,
					error: "Error decrypting wallet! Try a different password?",
				});
				return;
			}

			// derive our keys
			const { privateKey, publicKey, address } =
				await deriveKeysFromMnemonic(response.data);

			// prepare and hash our transaction data
			let txData = {
				from: address,
				to: recipient,
				value: amount,
				fee: CONSTANTS.defaultFee,
				dateCreated: new Date().toISOString(),
				data: "",
				senderPubKey: publicKey,
			};
			const txDataHashBuffer = hashTransaction(txData);

			// attempt signing
			const signResponse = signTransaction(privateKey, txDataHashBuffer);
			if (signResponse.error) {
				drawView(res, active, {
					wallet,
					active,
					error: "Error signing transaction!",
				});
				return;
			}

			// add our hash and signature fields
			txData["transactionDataHash"] = txDataHashBuffer.toString("hex");
			txData["senderSignature"] = signResponse.data;

			console.log("tx data before saving", { txData });

			req.session.signedTransaction = txData;
			req.session.save(() => {
				drawView(res, active, {
					wallet,
					active,
					signedTransaction: txData,
				});
			});
		} else {
			// Send the transaction, redraw with success message
			const nodeUrl = req.body.nodeUrl;
			const signedTransaction = req.session.signedTransaction;
			console.log({ sessionTx: signedTransaction });

			// nodeUrl validation
			try {
				new URL(nodeUrl);
			} catch (err) {
				drawView(res, active, {
					wallet,
					active,
					signedTransaction,
					error: "Please use a valid Node URL",
				});
				return;
			}

			// post to node to submit signed transaction
			const response = await fetch(`${nodeUrl}/transactions/send`, {
				method: "POST",
				body: JSON.stringify(signedTransaction),
				headers: { "Content-Type": "application/json" },
			});
			console.log({ nodeResponse: response });

			if (response.status === 200) {
				// save our sent transaction for displaying
				const previousTransaction = signedTransaction;
				req.session.signedTransaction = undefined;

				drawView(res, active, {
					wallet,
					active,
					transactionHash: previousTransaction.transactionDataHash,
					previousTransaction,
				});
				return;
			}

			console.log(`error submitting transaction`);
			const json = await response.json();

			if (response.status === 400) {
				drawView(res, active, {
					wallet,
					active,
					signedTransaction,
					error: json.errorMsg,
				});
				return;
			}

			// other node errors (offline)
			drawView(res, active, {
				wallet,
				active,
				signedTransaction,
				error: "Error connecting to node",
			});
		}
	});

	// Preset helper functions ===

	const redrawForInvalidPasswords = (
		password,
		repeatPassword,
		res,
		active,
		mnemonic = undefined
	) => {
		if (password !== repeatPassword) {
			drawView(res, active, {
				active,
				mnemonic,
				error: "Passwords do not match",
			});
		}
	};

	const drawView = (res, view, data) =>
		res.render(__dirname + "/views/" + view + ".html", data);

	app.listen(port, () => {
		console.log(`App running on http://localhost:${port}`);
	});
})();
