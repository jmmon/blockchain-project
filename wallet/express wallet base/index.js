const fs = require("fs");
const path = require("path");
const express = require("express");
const ejsLayouts = require("express-ejs-layouts");
const session = require('express-session');
const genuuid = require("uid-safe")

const favicon = require("serve-favicon");

const app = express();
app.use(favicon(
	path.join(__dirname, "public", "images", "favicon.ico"),
	{ maxAge: 0 }
));
app.use(session({
	genid: (req) => genuuid(18),
	secret: 'keyboard cat',
	resave: false,
	rolling: true,
	saveUninitialized: true,
}));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set("view engine", "ejs");
app.engine("html", require("ejs").renderFile);
app.use(express.static("public"));
app.use(ejsLayouts);
app.set("layout", "layouts/layout");

const walletDirectory = "wallets/";
if (!fs.existsSync(walletDirectory)) {
	fs.mkdirSync(walletDirectory);
}

(async () => {
	// const {default: { bip32, bip39, bjs }} = await import("./lib/walletUtils.js");
	// console.log(typeof bip32);
	// console.log(typeof bip39);
	// console.log(typeof bjs);
	const {default: { generateWallet }} = await import("./lib/walletUtils.js");
	// console.log(typeof generateWallet);


	//  Homepage
	app.get("/", (req, res) => {
		const id = req.session.id || null;
		res.render(__dirname + "/views/index.html", {
			id
		});
	});

	//  Page for creating a wallet
	app.get("/create", (req, res) => {
		const id = req.session.id || null;
		res.render(__dirname + "/views/create.html", {
			id
		});
	});

	//  Create endpoint
	app.post("/create", (req, res) => {
		console.log("~req", req.body);
		const password = req.body.password;
		const repeatPassword = req.body.confirmPassword;

		// Make simple validation
		if (password !== repeatPassword) {
			res.render(path.join(__dirname, "views", "create.html"), {
				mnemonic: undefined,
				filename: null,
				privateKey: undefined,
				publicKey: undefined,
				address: undefined,
				error: "Passwords do not match",
			});
			return false;
		}

		// Generate wallet from random mnemonic
		const {mnemonic, privateKey, publicKey, address} = generateWallet();

		// TODO: Encrypt and save into session storage


		// req.session.wallet = ;

		drawView(res, "create", {
			mnemonic,
			privateKey, 
			publicKey, 
			address,
			filename: undefined,
			error: undefined,
		});


		// Encrypt and save as json file
		// wallet.encrypt(password).then((jsonWallet) => {
		// 	let filename =
		// 		"UTC_JSON_WALLET_" +
		// 		Math.round(+new Date() / 1000) +
		// 		"_" +
		// 		Math.random(10000, 10000) +
		// 		".json";

		// 	fs.writeFile(
		// 		walletDirectory + filename,
		// 		jsonWallet,
		// 		"utf-8",
		// 		(err) => {
		// 			if (err) {
		// 				drawView(res, "create", {
		// 					mnemonic: undefined,
		// 					jsonWallet: undefined,
		// 					filename: null,
		// 					error: "Problem writing to disk: " + err.message,
		// 				});
		// 			} else {
		// 				drawView(res, "create", {
		// 					mnemonic: wallet.mnemonic.phrase,
		// 					jsonWallet: JSON.stringify(jsonWallet),
		// 					filename: filename,
		// 					error: undefined,
		// 				});
		// 			}
		// 		}
		// 	);
		// });
	});

	//load your wallet
	app.get("/load", (req, res) => {
		res.render(__dirname + "/views/load.html");
	});

	app.post("/load", (req, res) => {
		// fetch user data (filename and password)
		const filename = req.body.filename;
		const password = req.body.password;

		fs.readFile(walletDirectory + filename, "utf8", (err, jsonWallet) => {
			//  Error handling
			if (err) {
				drawView(res, "load", {
					address: undefined,
					privateKey: undefined,
					mnemonic: undefined,
					error: "The file doesn't exist",
				});
				return;
			}

			// decrypt the wallet
			ethers.Wallet.fromEncryptedJson(jsonWallet, password)
				.then((wallet) => {
					drawView(res, "load", {
						address: wallet.address,
						privateKey: wallet.privateKey,
						mnemonic: wallet.mnemonic.phrase,
						error: undefined,
					});
				})
				.catch((err) => {
					drawView(res, "load", {
						address: undefined,
						privateKey: undefined,
						mnemonic: undefined,
						error: "Bad pasword: " + err.message,
					});
				});
		});
	});

	//recover wallet
	app.get("/recover", (req, res) => {
		res.render(__dirname + "/views/recover.html");
	});

	//recover wallet
	app.post("/recover", (req, res) => {
		// fetch user data (mnemonic and password)
		const mnemonic = req.body.mnemonic;
		const password = req.body.password;

		// make wallet instance of this mnemonic
		const wallet = ethers.Wallet.fromMnemonic(mnemonic);

		// encrypt and save the wallet
		wallet.encrypt(password).then((jsonWallet) => {
			let filename =
				"UTC_JSON_WALLET_" +
				Math.round(+new Date() / 1000) +
				"_" +
				Math.random(10000, 10000) +
				".json";

			// Make a file with the wallet data
			fs.writeFile(
				walletDirectory + filename,
				jsonWallet,
				"utf-8",
				(err) => {
					if (err) {
						drawView(res, "recover", {
							message: undefined,
							filename: undefined,
							mnemonic: undefined,
							error: "Recovery error: " + err.message,
						});
					} else {
						drawView(res, "recover", {
							message: "Wallet recover was successful!",
							filename,
							mnemonic: wallet.mnemonic.phrase,
							error: undefined,
						});
					}
				}
			);
		});
	});

	app.get("/balance", (req, res) => {
		res.render(__dirname + "/views/balance.html");
	});

	app.post("/balance", (req, res) => {
		// fetch user data (filename and password)
		const filename = req.body.filename;
		const password = req.body.password;

		//  read the file
		fs.readFile(
			walletDirectory + filename,
			"utf8",
			async (err, jsonWallet) => {
				if (err) {
					drawView(res, "balance", {
						wallets: undefined,
						error: "Error with file writing",
					});
				}

				ethers.Wallet.fromEncryptedJson(jsonWallet, password)
					.then(async (wallet) => {
						// generate 5 wallets from your master key

						let derivationPath = "m/44'/60'/0'/0/";
						let wallets = [];
						const NUMBER_OF_DERIVATIONS = 5;

						for (let i = 0; i < NUMBER_OF_DERIVATIONS; i++) {
							let hdNode = ethers.utils.HDNode.fromMnemonic(
								wallet.mnemonic.phrase
							).derivePath(derivationPath + i);
							let walletInstance = new ethers.Wallet(
								hdNode.privateKey,
								provider
							);
							let balance = await walletInstance.getBalance();

							wallets.push({
								keypair: walletInstance,
								balance: ethers.utils.formatEther(balance),
							});
						}

						drawView(res, "balance", { wallets, error: undefined });
					})
					.catch((err) => {
						drawView(res, "balance", {
							wallets: undefined,
							error: "Balance query error: " + err.message,
						});
					});
			}
		);
	});

	app.get("/send", (req, res) => {
		res.render(__dirname + "/views/send.html");
	});

	app.post("/send", (req, res) => {
		// fetch user data (recipient,private key, and amount)
		const recipient = req.body.recipient;
		const privateKey = req.body.privateKey;
		const amount = req.body.amount;

		//  Simple validation
		if (
			recipient === "" ||
			(recipient === undefined && privateKey === "") ||
			(privateKey === undefined && amount === "") ||
			amount === undefined ||
			amount <= 0
		) {
			return;
		}

		let wallet;

		try {
			// make instance of the wallet
			wallet = new ethers.Wallet(privateKey, provider);
		} catch (err) {
			drawView(res, "send", {
				transactionHash: undefined,
				error: err.message,
			});
			return;
		}

		let gasPrice = 6;
		let gas = 21000;

		// broadcast the transaction to the network
		wallet
			.sendTransaction({
				to: recipient,
				value: ethers.utils.parseEther(amount),
				gasLimit: gas * gasPrice,
			})
			.then((transaction) => {
				drawView(res, "send", {
					transactionHash: transaction.hash,
					error: undefined,
				});
			})
			.catch((err) => {
				console.log(err);
				drawView(res, "send", {
					transactionHash: undefined,
					error: err.message,
				});
			});
	});

	// Preset helper functions ===

	function drawView(res, view, data) {
		res.render(__dirname + "/views/" + view + ".html", data);
	}

	app.listen(3000, () => {
		console.log("App running on http://localhost:3000");
	});

})();
