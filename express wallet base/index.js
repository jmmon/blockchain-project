const path = require("path");
const express = require("express");
const ejsLayouts = require("express-ejs-layouts");
const session = require("express-session");
const favicon = require("serve-favicon");
const ejs = require("ejs");
// const { parse } = require("url");

const app = express();

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
			CONSTANTS,
		},
	} = await import("./lib/walletUtils.js");
	const { default: fetch } = await import("node-fetch");

	app.get("/", (req, res) => {
		const active = "index";
		drawView(res, active, {
			wallet: req.session.wallet,
			active,
		});
	});

	// logout simply removes wallet from session and loads index page
	app.get("/logout", authChecker, (req, res) => {
		const active = "index";
		req.session.wallet = undefined;
		drawView(res, active, {
			wallet: undefined,
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
		redrawForInvalidPasswords(password, repeatPassword, active);

		// Generate wallet from random mnemonic
		const wallet = await generateWallet();
		console.log({ walletGenerated: wallet });
		const { mnemonic, privateKey, publicKey, address } = wallet;

		// encrypt mnemonic with password
		const encryptedMnemonic = encrypt(mnemonic, password);
		console.log({ encryptedMnemonic });

		// save mnemonic and address to session
		const mnemonicAndAddress = {
			encryptedMnemonic,
			address,
		};

		req.session.wallet = mnemonicAndAddress;
		req.session.save((err) => {
			if (err) {
				drawView(res, active, {
					wallet: undefined,
					active,

					mnemonic: undefined,
					error: "Error saving session!",
				});
			}

			drawView(res, active, {
				wallet: mnemonicAndAddress,
				active: active,

				mnemonic,
				privateKey,
				publicKey,
				address,
				error: undefined,
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
		redrawForInvalidPasswords(password, repeatPassword, active, mnemonic);

		const { privateKey, publicKey, address } = await deriveKeysFromMnemonic(
			mnemonic
		);
		console.log({ privateKey, publicKey, address });

		// Encrypt wallet data
		const encryptedMnemonic = encrypt(mnemonic, password);
		console.log({ encryptedMnemonic });

		const mnemonicAndAddress = {
			encryptedMnemonic,
			address,
		};

		req.session.wallet = mnemonicAndAddress;
		req.session.save((err) => {
			if (err) {
				drawView(res, active, {
					wallet: undefined,
					active,

					mnemonic,
					error: "Error saving session!",
				});
			}

			drawView(res, active, {
				wallet: mnemonicAndAddress,
				active,

				mnemonic,
				privateKey,
				publicKey,
				address,
				error: undefined,
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
				wallet: undefined,
				active,

				error: "Please load wallet from mnemonic, or create one.",
			});
		}

		// decrypt wallet and add to session
		const decryptedMnemonic = decrypt(
			req.session.wallet.encryptedMnemonic,
			password
		);
		console.log({ decryptedMnemonic });

		const { privateKey, publicKey, address } = await deriveKeysFromMnemonic(decryptedMnemonic);
		console.log({ privateKey, publicKey, address });

		// fetch balance from node!
		const balanceData = await fetch(`${nodeUrl}/${address}/balance`);
		console.log("fetched data keys:", Object.keys(balanceData));

		if (balanceData.size === 0) {
			drawView(res, active, {
				wallet: req.session.wallet,
				active,

				balances: `No balances found!`,
				error: undefined,
			});

		} else {
			drawView(res, active, {
				wallet: req.session.wallet,
				active,

				balances: `Private Key:\n${privateKey}\nPublic Key:\n${publicKey}\nAddress:\n${address}`,
				error: undefined,
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
		const recipient = req.body.recipient;
		const fromAddress = req.body.fromAddress;
		const amount = req.body.amount;
		const wallet = req.session.wallet;

		if (!req.session.signedTransaction) {
			// Sign the transaction data
			// save it to session
			// redraw this page with signed transaction

			//simple validation
			if (
				recipient === "" ||
				(recipient === undefined && fromAddress === "") ||
				(fromAddress === undefined && amount === "") ||
				amount === undefined ||
				amount <= 0
			) {
				drawView(res, active, {
					wallet,
					active,

					signedTransaction: undefined,
					transactionHash: undefined,
					error: "Please be sure boxes are filled correctly!",
				});
			}
			
			//unlock wallet for signing
			const decryptedMnemonic = decrypt(
				req.session.wallet.encryptedMnemonic,
				req.body.password
			);
			console.log({ decryptedMnemonic });

			// derive our keys
			const keys = await deriveKeysFromMnemonic(decryptedMnemonic);

			// prepare and hash our transaction data
			let txData = {
				from: fromAddress || wallet.address,
				to: recipient,
				value: amount,
				fee: CONSTANTS.defaultFee,
				dateCreated: new Date().toISOString(),
				data: "",
				senderPubKey: keys.publicKey,
			};
			const txDataHashBuffer = hashTransaction(txData);

			// add our hash and signature fields
			txData["transactionDataHash"] = txDataHashBuffer.toString("hex");
			txData["senderSignature"] = signTransaction(
				keys.privateKey,
				txDataHashBuffer
			);

			console.log("before saving", { txData });

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
			console.log({ sessionTx: req.session.signedTransaction });

			// post to node to submit signed transaction
			const response = await fetch(`${nodeUrl}/transactions/send`, {
				method: "POST",
				body: JSON.stringify(req.session.signedTransaction),
				headers: { "Content-Type": "application/json" },
			});
			console.log({ response });

			if (response.status === 400) {
				console.log(`error submitting transaction`);
				const json = await response.json();
				console.log('testing if i need to response.json():', {response, json});
				drawView(res, active, {
					wallet,
					active,

					signedTransaction: req.session.signedTransaction,
					error: json.errorMsg,
				});
				return;
			}

			// save our sent transaction for displaying
			const previousTransaction = req.session.signedTransaction;
			req.session.signedTransaction = undefined;

			drawView(res, active, {
				wallet,
				active,

				signedTransaction: undefined,
				transactionHash: previousTransaction.transactionDataHash,
				previousTransaction,
			});
		}
	});

	// Preset helper functions ===

	const redrawForInvalidPasswords = (
		password,
		repeatPassword,
		active,
		mnemonic = undefined
	) => {
		if (password !== repeatPassword) {
			drawView(res, active, {
				wallet: undefined,
				active,

				mnemonic: mnemonic,
				error: "Passwords do not match",
			});
		}
	};

	const drawView = (res, view, data) =>
		res.render(__dirname + "/views/" + view + ".html", data);

	app.listen(3000, () => {
		console.log("App running on http://localhost:3000");
	});
})();
