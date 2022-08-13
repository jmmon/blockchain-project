const path = require("path");
const express = require("express");
const ejsLayouts = require("express-ejs-layouts");
const session = require("express-session");
const favicon = require("serve-favicon");
const ejs = require("ejs");
const URL = require("url").URL;
// const cors = require("cors");

const app = express();
const PORT = 3003;

app.use(
	favicon(path.join(__dirname, "public", "images", "favicon.ico"), {
		maxAge: 0,
	})
);
// app.use(cors());

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
			decryptAndSign,
			submitTransaction,
		},
	} = await import("../walletUtils/index.js");
	const { default: fetch } = await import("node-fetch");

	app.get("/", async (req, res) => {
		const active = "index";

		// const balancesResponse = await fetch(`http://localhost:5555/address/a78fb34736836feb9cd2114e1215f9e3f0c1987d/balance`);
		// console.log('response:', balancesResponse);
		// // const body = await balancesResponse.text();
		// const json = await balancesResponse.json();
		// // console.log('response.text:', {body});
		// console.log('response.json:', {json});

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
		redrawForInvalidPasswords(password, repeatPassword, res, active, mnemonic);

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
		const response = decrypt(req.session.wallet.encryptedMnemonic, password);
		if (response.error) {
			drawView(res, active, {
				wallet: req.session.wallet,
				active,
				error: "Error decrypting wallet! Try a different password?",
			});
			return;
		}

		const { privateKey, publicKey, address } = await deriveKeysFromMnemonic(response.data);
		console.log({ privateKey, publicKey, address });

		// fetch balance from node!
		const balancesResponse = await fetch(`${nodeUrl}/address/${address}/balance`);
		const json = await balancesResponse.json();

		console.log("fetched data:", {json});
		

		drawView(res, active, {
			wallet: req.session.wallet,
			active,
			balances: `Safe Balance: ${json.safeBalance}\nConfirmed Balance: ${json.confirmedBalance}\nPending Balance: ${json.pendingBalance}`,
		});
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

			const {data, error} = await decryptAndSign(wallet, recipient, amount, password);

			if (error) {
				drawView(res, active, {
					wallet,
					active,
					error: error,
				});
				return;
			} 
			
			req.session.signedTransaction = data;
			req.session.save(() => {
				drawView(res, active, {
					wallet,
					active,
					signedTransaction: data,
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

			const response = submitTransaction(nodeUrl, signedTransaction);

			if (response.error) {
				drawView(res, active, {
					wallet,
					active,
					signedTransaction,
					error: response.error,
				});
				return;
			}

			//success:
			const previousTransaction = signedTransaction;
			req.session.signedTransaction = undefined;
			drawView(res, active, {
				wallet,
				active,
				transactionHash: previousTransaction.transactionDataHash,
				previousTransaction,
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

	app.listen(PORT, () => {
		console.log(`App running on http://localhost:${PORT}`);
	});
})();
