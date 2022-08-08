const fs = require("fs");
const path = require("path");
const express = require("express");
const ejsLayouts = require("express-ejs-layouts");
const session = require("express-session");
const genuuid = require("uid-safe");

const favicon = require("serve-favicon");
const e = require( "express" );

const app = express();
app.use(
	favicon(path.join(__dirname, "public", "images", "favicon.ico"), {
		maxAge: 0,
	})
);
app.use(
	session({
		genid: (req) => genuuid(18),
		secret: "keyboard cat",
		resave: false,
		rolling: true,
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

const walletDirectory = "wallets/";
if (!fs.existsSync(walletDirectory)) {
	fs.mkdirSync(walletDirectory);
}


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

	//  Homepage
	app.get("/", (req, res) => {
		const id = req.session.id || null;
		drawView(res, "index", {
			id,
			active: "index",
		});
	});

	//  Page for creating a wallet
	app.get("/create", (req, res) => {
		const id = req.session.id || null;
		drawView(res, "create", {
			id,
			active: "create",
		});

	});

	//  Create endpoint
	app.post("/create", async (req, res) => {
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
		const { mnemonic, privateKey, publicKey, address } = generateWallet();
		
		// TODO: Encrypt and save into session storage
		const encryptSuccess = await encryptAndSave(mnemonic, password, address, req);
		console.log({encryptSuccess})

		if (encryptSuccess === true) {
			drawView(res, "create", {
				mnemonic,
				privateKey,
				publicKey,
				address,
				filename: undefined,
				error: undefined,
			});
		} else {
			drawView(res, "create", {
				mnemonic: null,
				privateKey: null,
				publicKey: null,
				address: null,
				filename: undefined,
				error: "Problem encrypting: " + err.message,
			});
		}
	});

	//load your wallet
	app.get("/load", (req, res) => {
		const id = req.session.id || null;
		drawView(res, "load", {
			id,
			active: "load",
		});
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
		const id = req.session.id || null;
		drawView(res, "recover", {
			id,
			active: "recover",
		});
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
		const id = req.session.id || null;
		drawView(res, "balance", {
			id,
			active: "balance",
			balances: undefined,
			error: undefined,
		});
	});

	app.post("/balance", (req, res) => {
		// fetch user data (filename and password)
		const password = req.body.password;
		// const wallet = req.session.wallet = {
		// 	encryptedMnemonic,
		// 	address,
		// }

		if (!req.session.wallet) {
			drawView(res, "balance", {
				wallets: undefined,
				error: "Please load wallet from mnemonic, or create one."
			});
			return false;
		}

		// decrypt wallet and add to session
		const encryptedMnemonic = req.session.wallet.encryptedMnemonic;
		const decryptedMnemonic = decrypt(encryptedMnemonic, password);
		console.log({decryptedWallet});

		const result = deriveKeysFromMnemonic(decryptedMnemonic);

		console.log({result});

		drawView(res, "balance", {
			active: "balance",
			balances: "some balances",
			error: undefined,
		});



		// const decryptSuccess = await encryptAndSave(mnemonic, password, address, req);

		//  read the file
		// fs.readFile(
		// 	walletDirectory + filename,
		// 	"utf8",
		// 	async (err, jsonWallet) => {
		// 		if (err) {
		// 			drawView(res, "balance", {
		// 				wallets: undefined,
		// 				error: "Error with file writing",
		// 			});
		// 		}

		// 		ethers.Wallet.fromEncryptedJson(jsonWallet, password)
		// 			.then(async (wallet) => {
		// 				// generate 5 wallets from your master key

		// 				let derivationPath = "m/44'/60'/0'/0/";
		// 				let wallets = [];
		// 				const NUMBER_OF_DERIVATIONS = 5;

		// 				for (let i = 0; i < NUMBER_OF_DERIVATIONS; i++) {
		// 					let hdNode = ethers.utils.HDNode.fromMnemonic(
		// 						wallet.mnemonic.phrase
		// 					).derivePath(derivationPath + i);
		// 					let walletInstance = new ethers.Wallet(
		// 						hdNode.privateKey,
		// 						provider
		// 					);
		// 					let balance = await walletInstance.getBalance();

		// 					wallets.push({
		// 						keypair: walletInstance,
		// 						balance: ethers.utils.formatEther(balance),
		// 					});
		// 				}

		// 				drawView(res, "balance", { 
		// 					wallets, 
		// 					error: undefined 
		// 				});
		// 			})
		// 			.catch((err) => {
		// 				drawView(res, "balance", {
		// 					wallets: undefined,
		// 					error: "Balance query error: " + err.message,
		// 				});
		// 			});
		// 	}
		// );
	});

	app.get("/send", (req, res) => {
		const id = req.session.id || null;
		drawView(res, "send", {
			id,
			active: "send",
		});
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

	// const unlockWallet = (password, req,) => {





	// }

	const encryptAndSave = (mnemonic, password, address, req) => {
		const result = cryptPassword(password);
		console.log({result});
		const encryptedMnemonic = encrypt(mnemonic, result);
		req.session.wallet = {
			encryptedMnemonic,
			address,
		}; 
		return true;
	}

	function drawView(res, view, data) {
		res.render(__dirname + "/views/" + view + ".html", data);
	}

	app.listen(3000, () => {
		console.log("App running on http://localhost:3000");
	});
})();
