const path = require("path");
const express = require("express");
const ejsLayouts = require("express-ejs-layouts");
const session = require("express-session");
const genuuid = require("uid-safe");

const favicon = require("serve-favicon");
const cookieParser = require('cookie-parser')

const app = express();
app.use(
	favicon(path.join(__dirname, "public", "images", "favicon.ico"), {
		maxAge: 0,
	})
);
// app.use(cookieParser);
app.use(
	session({
		// genid: (req) => genuuid(18),
		secret: "keyboard cat",
		resave: false,
		// rolling: true,
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

	//  Homepage
	app.get("/", (req, res) => {
		// if (req.session.page_views) {
		// 	req.session.page_views++;
		// 	res.send("You visited this page " + req.session.page_views + " times");
		// } else {
		// 	req.session.page_views = 1;
    //   res.send("Welcome to this page for the first time!");
		// }
		const active = "index";
		const wallet = req.session.wallet;
		drawView(res, active, {
			wallet,
			active,
		});
	});

	// app.get("/test", (req, res) => {
	// 	if (req.session.page_views) {
	// 		req.session.page_views++;
	// 		res.send("TEST: You visited this page " + req.session.page_views + " times");
	// 	} else {
	// 		req.session.page_views = 1;
  //     res.send("TEST: Welcome to this page for the first time!");
	// 	}
	// 	// const active = "index";
	// 	// const wallet = req.session.wallet || null;
	// 	// drawView(res, active, {
	// 	// 	wallet,
	// 	// 	active,
	// 	// });
	// });

	//  Page for creating a wallet
	app.get("/create", (req, res) => {
		const active = "create";
		const wallet = req.session.wallet;
		drawView(res, active, {
			wallet,
			active,
		});

	});

	//recover wallet
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
			balances: undefined,
			error: undefined,
		});
	});
	
	app.get("/send", (req, res) => {
		const active = "send";
		const wallet = req.session.wallet;
		drawView(res, active, {
			wallet,
			active,
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
				filename: null,
				privateKey: undefined,
				publicKey: undefined,
				address: undefined,
				error: "Passwords do not match",
			});
		}

		// Generate wallet from random mnemonic
		const wallet = generateWallet();
		console.log({walletGenerated: wallet});
		const { mnemonic, privateKey, publicKey, address } = wallet;
		
		// TODO: Encrypt and save into session storage
		const encryptedWallet = await encryptMnemWithPassword(mnemonic, password, address);
		console.log({encryptedWallet});

		req.session.wallet = encryptedWallet;
		req.session.save((err) => {
			if (err) {
				drawView(res, active, {
					wallet: undefined,
					active,
	
					mnemonic: undefined,
					filename: null,
					privateKey: undefined,
					publicKey: undefined,
					address: undefined,
					error: "Error saving session!",
				});
			}

			drawView(res, active, {
				wallet: encryptedWallet,
				active: active,

				mnemonic,
				privateKey,
				publicKey,
				address,
				filename: undefined,
				error: undefined,
			});
		})




		// if (encryptSuccess === true) {


		// } else {
		// 	drawView(res, active, {
		// 		wallet: undefined,
		// 		active: active,

		// 		mnemonic: null,
		// 		privateKey: null,
		// 		publicKey: null,
		// 		address: null,
		// 		filename: undefined,
		// 		error: "Problem encrypting: " + err.message,
		// 	});
		// }
	});


	//recover wallet
	app.post("/recover", (req, res) => {
		const active = "recover";
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
						drawView(res, active, {
							wallet: undefined,
							active,
	
							message: undefined,
							filename: undefined,
							mnemonic: undefined,
							error: "Recovery error: " + err.message,
						});
					} else {
						drawView(res, active, {
							wallet: undefined,
							active,
	
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


	app.post("/balance", (req, res) => {
		console.log('balance post request');
		const active = "balance";
		// fetch user data (filename and password)
		const password = req.body.password;
		const nodeUrl = req.body.nodeUrl;
		// const wallet = req.session.wallet = {
		// 	encryptedMnemonic,
		// 	address,
		// }
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


		drawView(res, active, {
			wallet: req.session.wallet,
			active,

			balances: `Private Key: ${keys.privateKey}\nPublic Key: ${keys.publicKey}\nAddress: ${keys.address}`,
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


	app.post("/send", (req, res) => {
		const active = "send";
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
			drawView(res, active, {
				wallet: undefined,
				active,
				
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
				drawView(res, active, {
					wallet: undefined,
					active,

					transactionHash: transaction.hash,
					error: undefined,
				});
			})
			.catch((err) => {
				console.log(err);
				drawView(res, active, {
					wallet: undefined,
					active,

					transactionHash: undefined,
					error: err.message,
				});
			});
	});

	// Preset helper functions ===

	// const unlockWallet = (password, req,) => {





	// }

	const encryptMnemWithPassword = (mnemonic, password, address) => {
		console.log('encryptt with password');
		// const hashedPassword = cryptPassword(password);
		// console.log({result: hashedPassword});
		const encryptedMnemonic = encrypt(mnemonic, password);
		return {
			encryptedMnemonic,
			address,
		};
	}

	const decryptMnemWithPassword = (encryptedMnemonic, password) => {
		console.log('decrypt with password');
		// const hashedPassword = cryptPassword(password);
		// console.log({result: hashedPassword});
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