const path = require("path");
const express = require("express");
const ejsLayouts = require("express-ejs-layouts");
const session = require("express-session");

const favicon = require("serve-favicon");
const { parse } = require( "url" );

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
app.engine("html", require("ejs").renderFile);
app.use(express.static("public"));
app.use(ejsLayouts);
app.set("layout", "layouts/layout");

const authChecker = (req, res, next) => {
	// FOR TESTING:
	// req.session.wallet = {
	// 	encryptedMnemonic: 'ac94db3255bf41eaed41fd6237b5461aa7f1fb1f16999a5ef7cff62a0494da4d5d3acbd727aae59f939e85e88008821972256ace89a1eb2065b3d4f427a50c3c63e116e02440c81c1a4ae77dfb4d4af9',
	// 	address: '1GLCDWgdmGGmzpmVshPfjrQs47d6sC47FR'
	// }
	
	if (req.session.wallet) {
		next();
	} else {
		res.redirect("/create");
	}
}
// shaft armed broccoli peasant absurd siren drip gospel prevent excess donkey angry
(async () => {
	const {
		default: {
			generateWallet,
			encrypt,
			decrypt,
			deriveKeysFromMnemonic,
			eccSign,
			hashSha256,
			generateBytes,
			splitSignature,
			CONSTANTS,
		},
	} = await import("./lib/walletUtils.js");

	const {default: fetch} = await import('node-fetch')

	app.get("/", (req, res) => {
		const active = "index";
		const wallet = req.session.wallet;

		// if (!wallet) req.session.wallet = {
		// 	encryptedMnemonic: 'ac94db3255bf41eaed41fd6237b5461aa7f1fb1f16999a5ef7cff62a0494da4d5d3acbd727aae59f939e85e88008821972256ace89a1eb2065b3d4f427a50c3c63e116e02440c81c1a4ae77dfb4d4af9',
		// 	address: '1GLCDWgdmGGmzpmVshPfjrQs47d6sC47FR'
		// }
// 12CrQaLb9rVcQzgsAEnFZgcVcTT14UCMbW
// 0007a00df70afa51bd02e59d060546c517a585f9004d6a012e
// 000d35f19cef288c012ac3fb58b446f65ba102475a7f5ee0e9
// 00a82b27067973d9637e47e914e7fb1769f34aa8aa58e686c4

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
	
	app.get("/balance", authChecker, (req, res) => {
		const active = "balance";
		console.log(req.session.wallet);
		const wallet = req.session.wallet;
		drawView(res, active, {
			wallet,
			active,
		});
	});
	
	app.get("/send", authChecker, (req, res) => {
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
	app.get("/logout", authChecker, (req, res) => {
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
		const wallet = await generateWallet();
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
	app.post("/recover", async (req, res) => {
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

		const {privateKey, publicKey, address} = await deriveKeysFromMnemonic(mnemonic);

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
		const decryptedMnemonic = decryptMnemWithPassword(req.session.wallet.encryptedMnemonic, password);
		console.log({decryptedMnemonic});

		const keys = await deriveKeysFromMnemonic(decryptedMnemonic);

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
	app.post("/send", async (req, res) => {
		const active = "send";
		const recipient = req.body.recipient;
		const fromAddress = req.body.fromAddress;
		const amount = req.body.amount;
		const wallet = req.session.wallet;

		if (!req.session.signedTransaction) {
			// Sign the transaction data
			// save it to session
			// redraw this page with it so next time it sends

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
			const fee = CONSTANTS.defaultFee;

			const encryptedMnemonic = req.session.wallet.encryptedMnemonic;
			const decryptedMnemonic = decryptMnemWithPassword(encryptedMnemonic, req.body.password);
			console.log({decryptedMnemonic});
	
			const keys = await deriveKeysFromMnemonic(decryptedMnemonic);

			let txData = {
				from: fromAddress || wallet.address, 
				to: recipient, 
				value: amount,
				fee,
				dateCreated: new Date().toISOString(),
				data: '',
				senderPubKey: keys.publicKey,
			};

			const hashTransaction = ({from, to, value, fee, dateCreated, data, senderPubKey}) => {
				// escape data field spaces
				data = data.replaceAll(/\s/gm, "\ ");

				const txDataJson = JSON.stringify({
					from, to, value, fee, dateCreated, data, senderPubKey
				});
				
				// replace non-escaped spaces
				const dataNoNonEscapedSpaces = txDataJson.replace(/(?<!\\)\s/gm, '');
	
				return hashSha256(dataNoNonEscapedSpaces);
			}

			const txDataHashBuffer = hashTransaction(txData)

			// still need to actually sign it:
			//ECDSA signature of the txDataHash!
			// use deterministic ECDSA signature, based on secp256k1 and RFC-6979 with HMAC-SHA256

			txData["transactionDataHash"] = txDataHashBuffer.toString('hex');

			const privateKeyArray = Uint8Array.from(Buffer.from(keys.privateKey, 'hex'));
			const signature = Buffer.from(eccSign(txDataHashBuffer, privateKeyArray));
			const {r, s} = splitSignature(signature);
			txData["senderSignature"] = [r, s];

			console.log('before saving',{txData});

			req.session.signedTransaction = txData;
			req.session.save(() => {
				drawView(res, active, {
					wallet,
					active,
	
					signedTransaction: txData,
				})
			})

		} else {
			// Send the transaction, redraw with success message
			const nodeUrl = req.body.nodeUrl;
			console.log({sessionTx: req.session.signedTransaction});

			// post to node to submit signed transaction
			const response = await fetch(`${nodeUrl}/transactions/send`, {method: 'POST', body: JSON.stringify(req.session.signedTransaction), headers: {'Content-Type': 'application/json'}});

			console.log({response});

			if (response.status === 400) {
				console.log(`catch err submitting transaction`);
				const json = await response.json();
				drawView(res, active, {
					wallet,
					active,
	
					signedTransaction: req.session.signedTransaction,
					error: json.errorMsg,
				});
				return;
			} 
			
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