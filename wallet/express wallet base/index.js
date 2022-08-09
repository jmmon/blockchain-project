const path = require("path");
const express = require("express");
const ejsLayouts = require("express-ejs-layouts");
const session = require("express-session");
const genuuid = require("uid-safe");

const favicon = require("serve-favicon");

const app = express();
app.use(
	favicon(path.join(__dirname, "public", "images", "favicon.ico"), {
		maxAge: 0,
	})
);
// app.use(cookieParser);
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
app.engine("html", require("ejs").renderFile);
app.use(express.static("public"));
app.use(ejsLayouts);
app.set("layout", "layouts/layout");


(async () => {
	const {
		default: {
			generateWallet,
			encrypt,
			decrypt,
			cryptPassword,
			comparePassword,
			deriveKeysFromMnemonic,
		},
	} = await import("./lib/walletUtils.js");
	// console.log({generateWallet, encrypt, decrypt, cryptPassword, comparePassword});

	const {default: fetch} = await import('node-fetch')

	app.get("/", (req, res) => {
		const active = "index";
		const wallet = req.session.wallet;
		drawView(res, active, {
			wallet,
			active,
		});
	});

	app.get("/create", (req, res) => {
		const active = "create";
		const wallet = req.session.wallet;
		drawView(res, active, {
			wallet,
			active,
		});
	});

	app.get("/recover", (req, res) => {
		const active = "recover";
		const wallet = req.session.wallet;
		drawView(res, active, {
			wallet,
			active,
		});
	});
	
	app.get("/balance", (req, res) => {
		const active = "balance";
		console.log(req.session.wallet);
		const wallet = req.session.wallet;
		drawView(res, active, {
			wallet,
			active,
		});
	});
	
	app.get("/send", (req, res) => {
		const active = "send";
		const wallet = req.session.wallet;
		const signedTransaction = req.session.signedTransaction;
		drawView(res, active, {
			wallet,
			active,

			signedTransaction,
		});
	});

	// logout simply removes wallet from session and loads index page
	app.get("/logout", (req, res) => {
		let active = "index";
		req.session.wallet = undefined;
		drawView(res, active, {
			wallet: undefined,
			active,
		});
	});

	//  Create endpoint
	app.post("/create", async (req, res) => {
		const active = "create";
		console.log("~req", req.body);
		const password = req.body.password;
		const repeatPassword = req.body.confirmPassword;

		// Make simple validation
		if (password !== repeatPassword) {
			drawView(res, active, {
				wallet: undefined,
				active,

				mnemonic: undefined,
				error: "Passwords do not match",
			});
		}

		// Generate wallet from random mnemonic
		const wallet = generateWallet();
		console.log({walletGenerated: wallet});
		const { mnemonic, privateKey, publicKey, address } = wallet;
		
		const encryptedMnemonic = encryptMnemWithPassword(mnemonic, password);
		console.log({encryptedMnemonic});

		const mnemonicAndAddress = {
			encryptedMnemonic,
			address
		}

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
		})
	});


	//recover wallet
	app.post("/recover", (req, res) => {
		const active = "recover";
		// fetch user data (mnemonic and password)
		const mnemonic = req.body.mnemonic;
		const password = req.body.password;
		const repeatPassword = req.body.confirmPassword;

		// Make simple validation
		if (password !== repeatPassword) {
			drawView(res, active, {
				wallet: undefined,
				active,

				mnemonic: mnemonic,
				error: "Passwords do not match",
			});
		}

		const {privateKey, publicKey, address} = deriveKeysFromMnemonic(mnemonic);

		console.log({privateKey, publicKey, address});

		// const wallet = {mnemonic, ...keys};

		// TODO: Encrypt wallet data
		const encryptedMnemonic = encryptMnemWithPassword(mnemonic, password);
		console.log({encryptedMnemonic});

		const mnemonicAndAddress = {
			encryptedMnemonic,
			address
		}

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
		})
	});


	app.post("/balance", async (req, res) => {
		console.log('balance post request');
		const active = "balance";
		const password = req.body.password;
		const nodeUrl = req.body.nodeUrl;

		console.log(req.session.wallet);

		if (!req.session.wallet) {
			drawView(res, active, {
				wallet: undefined,
				active,

				error: "Please load wallet from mnemonic, or create one."
			});
			return false;
		}

		// decrypt wallet and add to session
		const encryptedMnemonic = req.session.wallet.encryptedMnemonic;
		const decryptedMnemonic = decryptMnemWithPassword(encryptedMnemonic, password);
		console.log({decryptedMnemonic});

		const keys = deriveKeysFromMnemonic(decryptedMnemonic);

		console.log({keys});

		// TODO: fetch balance from node!
		const data = await fetch(`${nodeUrl}/${keys.address}/balance`);
		console.log('fetched data:', Object.keys(data));

		if (data.size === 0) {
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
	
				balances: `Private Key:\n${keys.privateKey}\nPublic Key:\n${keys.publicKey}\nAddress:\n${keys.address}`,
				error: undefined,
			});
		}
	});

	// have send view handle signing and sending:
	// if we have signed transaction, we attempt the send;
	// otherwise we sign transaction and reload the send view with the signed data
	app.post("/send", (req, res) => {
		const active = "send";
		// fetch user data (recipient,private key, and amount)
		const body = req.body;
		const wallet = req.session.wallet;
		let signedTransaction = req.session.signedTransaction;
		// const recipient = req.body.recipient;
		// const privateKey = req.body.privateKey;
		// const amount = req.body.amount;

		if (!signedTransaction) {
			// Sign the transaction
			// save it to session
			// redraw this page with it so next time it sends

			//simple validation
			// if (
			// 	recipient === "" ||
			// 	(recipient === undefined && fromAddress === "") ||
			// 	(fromAddress === undefined && amount === "") ||
			// 	amount === undefined ||
			// 	amount <= 0
			// ) {
			// 	drawView(res, active, {
			// 	wallet,
			// 	active,

			// 	signedTransaction: undefined,
			// 	transactionHash: undefined,
			// error: "Please be sure boxes are filled correctly!",
			// });
			// }
			//unlock wallet for signing

			//save tx in session, and redraw with signed transaction prepared;
			signedTransaction = {
				from: body.fromAddress, 
				to: body.recipient, 
				value: body.value,
				otherStuff: "blahblahblah, fetch default fee from server, sign and date"
			};
			req.session.signedTransaction = signedTransaction;
			drawView(res, active, {
				wallet,
				active,

				signedTransaction,
				transactionHash: "the transaction hash",
			})

		} else {
			// Send the transaction, redraw with success message
			const nodeUrl = body.nodeUrl;
			
			// post to node to submit signed transaction

			const previousTransaction = req.session.signedTransaction;
			drawView(res, active, {
				wallet,
				active,

				signedTransaction: undefined,
				transactionHash: "the transaction hash",
				previousTransaction,
			})
		}

	});

	// Preset helper functions ===

	// const unlockWallet = (password, req,) => {





	// }

	const encryptMnemWithPassword = (mnemonic, password) => {
		console.log('encryptt with password');
		const encryptedMnemonic = encrypt(mnemonic, password);
		return encryptedMnemonic;
	}

	const decryptMnemWithPassword = (encryptedMnemonic, password) => {
		console.log('decrypt with password');
		const decryptedMnemonic = decrypt(encryptedMnemonic, password);
		return decryptedMnemonic;
	}

	function drawView(res, view, data) {
		res.render(__dirname + "/views/" + view + ".html", data);
	}

	app.listen(3000, () => {
		console.log("App running on http://localhost:3000");
	});
})();