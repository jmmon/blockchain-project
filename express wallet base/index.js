const path = require('path');
const express = require('express');
const ejsLayouts = require('express-ejs-layouts');
const session = require('express-session');
const favicon = require('serve-favicon');
const ejs = require('ejs');
const URL = require('url').URL;
const convert = require('../libs/conversion');

const app = express();
const PORT = 3003;

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

app.use(
	favicon(path.join(__dirname, 'public', 'images', 'favicon.ico'), {
		maxAge: 0,
	})
);

app.use(
	session({
		secret: 'keyboard cat',
		resave: false,
		saveUninitialized: true,
	})
);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.set('view engine', 'ejs');
app.engine('html', ejs.renderFile);
app.use(express.static('public'));
app.use(ejsLayouts);
app.set('layout', 'layouts/layout');

// app.use((req, res, next) => {
// 	if (!req.session.wallet) {
// 		const TESTING_WALLET = {
// 			encryptedMnemonic: '84cb1b815fff36ca2027bc6d665794df3f66a99f2d60ab0bf4a3362fb4d7bb9b556cb3fe789a03c777f6f037705aa2697551ac1dd7f9ff90e58f82a56daccba20faadecc88ef522ef0945587e7c20d9352400a45ba6b2c83698ce61a44717ec1',
// 			address: 'a78fb34736836feb9cd2114e1215f9e3f0c1987d',
// 		}
// 		req.session.wallet = TESTING_WALLET;
// 	}
// 	next();
// })

/* testing target wallet
	Your mnemonic is : prosper during cross void flower oyster unveil mercy multiply effort person illegal
Generated Private Key fe203b722fbf8eac6d7281453e09d130573c774991189f35eb4b102f8af941f2
Extracted Public Key 145fc6f57e917473c55c17c625c92f3cd811c6b9393501e30c01bde00a9ec6ef0
Extracted Blockchain Address a78fb34736836feb9cd2114e1215f9e3f0c1987d
	
	*/

const authChecker = (req, res, next) => {
	if (req.session.wallet) {
		return next();
	}
	res.redirect('/create');
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
			fetchAddressBalance,
		},
	} = await import('../libs/walletUtils/dist/index.js');

	app.get('/', async (req, res) => {
		const active = 'index';
		drawView(res, active, {
			wallet: req.session.wallet,
			active,
		});
	});

	// logout simply removes wallet from session and loads index page
	app.get('/logout', authChecker, (req, res) => {
		const active = 'index';
		req.session.wallet = undefined;
		drawView(res, active, {
			active,
		});
	});

	//  Create
	app.get('/create', (req, res) => {
		const active = 'create';
		drawView(res, active, {
			wallet: req.session.wallet,
			active,
		});
	});

	app.get('/recover', (req, res) => {
		const active = 'recover';
		drawView(res, active, {
			wallet: req.session.wallet,
			active,
		});
	});

	app.get('/balance', authChecker, (req, res) => {
		const active = 'balance';
		const wallet = req.session.wallet;
		console.log(req.session.wallet);
		drawView(res, active, {
			wallet,
			active,
		});
	});

	app.get('/send', authChecker, (req, res) => {
		const active = 'send';
		drawView(res, active, {
			wallet: req.session.wallet,
			active,
			transactionInfo: req.session.transactionInfo,
			signedTransaction: req.session.signedTransaction,
		});
	});

	app.post('/create', async (req, res) => {
		const active = 'create';
		console.log('~req', req.body);
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
				error: 'Error encrypting wallet! Try again?',
			});
			return;
		}

		// save mnemonic and address to session
		const mnemonicAndAddress = {
			IV: response.data.IV,
			encryptedMnemonic: response.data.encrypted,
			address,
		};

		req.session.wallet = mnemonicAndAddress;
		req.session.save((err) => {
			if (err) {
				drawView(res, active, {
					active,
					error: 'Error saving session!',
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

	//recover wallet
	app.post('/recover', async (req, res) => {
		const active = 'recover';
		// fetch user data (mnemonic and password)
		const mnemonic = req.body.mnemonic;
		const password = req.body.password;
		const repeatPassword = req.body.confirmPassword;

		// Make simple validation
		redrawForInvalidPasswords(password, repeatPassword, res, active, mnemonic);

		const { privateKey, publicKey, address } = await deriveKeysFromMnemonic(mnemonic);
		console.log({ privateKey, publicKey, address });

		// encrypt mnemonic with password
		const response = encrypt(mnemonic, password);
		console.log({ encryptResponse: response });
		if (response.error) {
			drawView(res, active, {
				active,
				error: 'Error encrypting wallet! Try again?',
			});
			return;
		}

		// save mnemonic and address to session
		const mnemonicAndAddress = {
			IV: response.data.IV,
			encryptedMnemonic: response.data.encrypted,
			address,
		};

		req.session.wallet = mnemonicAndAddress;
		req.session.save((err) => {
			if (err) {
				drawView(res, active, {
					active,
					mnemonic,
					error: 'Error saving session!',
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

	app.post('/balance', async (req, res) => {
		const active = 'balance';
		const password = req.body.password;
		const nodeUrl = req.body.nodeUrl;
		console.log(req.session.wallet);

		if (!req.session.wallet) {
			drawView(res, active, {
				active,
				error: 'Please load wallet from mnemonic, or create one.',
			});
			return;
		}

		// decrypt wallet and add to session
		const encrypted = {
			IV: req.session.wallet.IV,
			encrypted: req.session.wallet.encryptedMnemonic,
		};
		const { data, error } = decrypt(encrypted, password);
		console.log('balance decrypted wallet:', data);
		if (error) {
			drawView(res, active, {
				wallet: req.session.wallet,
				active,
				error: 'Error decrypting wallet! Try a different password?',
			});
			return;
		}

		const { privateKey, publicKey, address } = await deriveKeysFromMnemonic(data);
		console.log({ privateKey, publicKey, address });

		// fetch balance from node!
		const balances = await fetchAddressBalance(nodeUrl, address);
		console.log('fetched data json:', { balances });
		const safe = convert.toCoins(balances.safeBalance);
		const conf = convert.toCoins(balances.confirmedBalance);
		const pending = convert.toCoins(balances.pendingBalance);


		drawView(res, active, {
			wallet: req.session.wallet,
			active,
			balances: {safe, confirmed: conf, pending} ,
		});
	});

	// have send view handle signing and sending:
	// if we have signed transaction, we attempt the send;
	// otherwise we sign transaction and reload the send view with the signed data

	app.post('/send', async (req, res) => {
		const active = 'send';
		const wallet = req.session.wallet;
		const nodeUrl = req.body.nodeUrl;

		if (!req.session.signedTransaction) {
			// Sign the transaction data
			// save it to session
			// redraw this page with signed transaction

			const addressFromForm = req.body.fromAddress;
			const recipient = req.body.recipient ?? '';
			const amount = req.body.amount ?? '';
			const units = req.body.units ?? 'coins';
			const password = req.body.password ?? '';

			const txInputsInfo = { fromAddress: addressFromForm, recipient, amount, units, nodeUrl };

			console.log('testing "value" fromAddress:', addressFromForm);

			//validation errors
			if (
				recipient === '' ||
				(recipient === undefined && amount === '') ||
				amount === undefined ||
				amount <= 0 ||
				!wallet
			) {
				drawView(res, active, {
					wallet,
					active,
					transactionInfo: txInputsInfo,

					error: 'Please be sure boxes are filled correctly!',
				});
				return;
			}
			
			// nodeUrl validation
			try {
				new URL(nodeUrl);
			} catch (err) {
				drawView(res, active, {
					wallet,
					active,
					error: 'Please use a valid Node URL',
					transactionInfo: txInputsInfo,
				});
				return;
			}

			// convert units if necessary
			const micros = +convert.toMicros(+amount).amount;
			const microcoins = units === 'microcoins' ? +amount : micros;
			const testCoins = +convert.toCoins(+micros).amount;
			console.log({original: amount, units, micros, reverted: testCoins});

			// decrypt and sign errors
			const { data, error } = await decryptAndSign(wallet, recipient, microcoins, password);
			console.log('decryptAndSign:', { data, error });
			if (error) {
				drawView(res, active, {
					wallet,
					active,
					error: error,
					transactionInfo: txInputsInfo,
				});
				return;
			}
			const totalValue = microcoins + data.fee;

			// fetch balance to see if the transaction will work
			const balances = await fetchAddressBalance(nodeUrl, wallet.address);
			console.log('fetched data json:', { balances });

			// check if we can spend unconfirmed funds, according to the blockchain config
			const info = await fetch(`${nodeUrl}/info`).then((res) => res.json());
			const spendingBalance = info.config.transactions.spendUnconfirmedFunds
				? balances.pendingBalance
				: balances.confirmedBalance;

			// balance check
			if (spendingBalance < totalValue) {
				drawView(res, active, {
					wallet,
					active,
					error: `Your account does not have enough funds! Available funds: ${convert.toCoins(spendingBalance).amount} coins (${spendingBalance} microcoins)`,
					transactionInfo: txInputsInfo,
				});
				return;
			}

			const transactionInfo = {
				hash: data.transactionDataHash ?? undefined,
				signedTransaction: data,
				nodeUrl,
				units,
			};

			// success
			req.session.transactionInfo = transactionInfo;
			req.session.signedTransaction = data;
			req.session.save(() => {
				drawView(res, active, {
					wallet,
					active,
					transactionInfo,
					signedTransaction: data,
				});
			});
		} else {
			// Send the transaction, redraw with success message
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
					error: 'Please use a valid Node URL',
				});
				return;
			}

			//submit transaction error
			const { data, error } = await submitTransaction(nodeUrl, signedTransaction);
			req.session.signedTransaction = undefined;
			if (error) {
				drawView(res, active, {
					wallet,
					active,
					signedTransaction: undefined,
					error: error,
				});
				return;
			}
			//success:
			console.log('Success sending transaction!');

/* 			console.log({value: signedTransaction.value, fee: signedTransaction.fee}); */
			// convert units 
			const valCoins = convert.toCoins(signedTransaction.value);
			const feeCoins = convert.toCoins(signedTransaction.fee);
/* 			console.log({valCoins, feeCoins}); */

			const previousTransaction = data;
			req.session.signedTransaction = undefined;
			req.session.transactionInfo = undefined;
			drawView(res, active, {
				wallet,
				active,
				transactionHash: data.transactionDataHash ?? undefined,
				previousTransaction,
				coins: {value: valCoins, fee: feeCoins},
			});
		}
	});

	// Helper functions

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
				error: 'Passwords do not match',
			});
		}
	};

	const drawView = (res, view, data) => res.render(__dirname + '/views/' + view + '.html', data);

	app.listen(PORT, () => {
		console.log(`Wallet running on http://localhost:${PORT}`);
	});
})();
