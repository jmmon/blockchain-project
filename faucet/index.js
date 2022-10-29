const path = require('path');
const express = require('express');
const session = require('express-session');
const favicon = require('serve-favicon');
const ejs = require('ejs');
const db = require('./libs/db');

const { CONFIG } = require('../blockchain/src/constants');
const convert = require('../libs/conversion');
const faucetWalletInfo = { ...CONFIG.faucet };
console.log('init:', { faucetWalletInfo });

// const captchaUrl = '/captcha.jpg';
// const captchaMathUrl = '/captcha_math.jpg';
// const captchaSessionId = 'captcha';
// const captchaFieldName = 'captcha';

// const captcha = require('svg-captcha-express').create({
// 	cookie: captchaSessionId,
// });

// const faucetWalletInfo = {
// 	mnemonic: 'bright pledge fan pet mesh crisp ecology luxury bulb horror vacuum brown',
// 	privateKey: '51a8bbf1192e434f8ff2761f95ddf1ba553447d2c1decd92cca2f43cd8609574',
// 	publicKey: '46da25d657a170c983dc01ce736094ef11f557f8a007e752ac1eb1f705e1b9070',
// 	address: 'eae972db2776e38a75883aa2c0c3b8cd506b004d',
// };

const app = express();
const port = 3007;

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

// app.get(captchaUrl, captcha.image());
// app.get(captchaMathUrl, captcha.math());

// app.get()

// We have an address. We need to check if it exists in our database (could use it as a key)
// if it exists,
//		we need to check the timestamp (the value) and make sure that one hour has passed.
// 		if not, we send an error
//		if so, we can update the value to the new timestamp and do our payout.

// if it doesn't exist,
// 		we can do the payout and add a new entry to our file (saving the timestamp)

(async () => {
	const {
		default: { decryptAndSign, submitTransaction, verifySignature },
	} = await import('../libs/walletUtils/dist/index.js');
	const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

	db.init();

	/* testing target wallet
	Your mnemonic is : prosper during cross void flower oyster unveil mercy multiply effort person illegal
Generated Private Key fe203b722fbf8eac6d7281453e09d130573c774991189f35eb4b102f8af941f2
Extracted Public Key 145fc6f57e917473c55c17c625c92f3cd811c6b9393501e30c01bde00a9ec6ef0
Extracted Blockchain Address a78fb34736836feb9cd2114e1215f9e3f0c1987d
	
	*/

	const signAndSend = async (success, newDatabase = undefined, address = '', nodeUrl = '') => {
		// error saving, do not send transaction
		if (!success) {
			console.error('Error: Try waiting an hour before requesting more funds!');
			return {
				data: null,
				error: 'Error: Try waiting an hour before requesting more funds!',
			};
		}
		try {
			console.log({ newDatabase });
			// payout! sign and send transaction
			const keys = {
				privateKey: faucetWalletInfo.privateKey,
				publicKey: faucetWalletInfo.publicKey,
				address: faucetWalletInfo.address,
			};

			const fetchConfirmedBalance = async (nodeUrl, address) => {
				// fetch balance from node!
				const balances = await fetch(`${nodeUrl}/address/${address}/balance`);
				const data = await balances.json();
				console.log('fetched data:', { data });

				return data.confirmedBalance;
			};

			// const fetchConfirmedBalance = (nodeUrl, address) => {
			// 	return fetch(`${nodeUrl}/address/${address}/balance`)
			// 		.then((res) => res.json())
			// 		.then((data) => {
			// 			console.log({ data });
			// 			return data.confirmedBalance;
			// 		}).catch(error => {
			// 			console.log('Error: getConfirmedBalance:', {error})
			// 			throw new Error('Error: getConfirmedBalance:', {error})
			// 		});
			// };

			// const nodeUrlShouldComeFromHtml = 'http://localhost:5555';
			const confirmedBalance = await fetchConfirmedBalance(nodeUrl, faucetWalletInfo.address);
			const enoughFundsRemaining =
				confirmedBalance >=
				faucetWalletInfo.valuePerTransaction + CONFIG.transactions.minFee;
			const amount = enoughFundsRemaining
				? faucetWalletInfo.valuePerTransaction
				: confirmedBalance - CONFIG.transactions.minFee;

			console.log({ confirmedBalance, amount });

			const signedTransaction = await decryptAndSign(
				keys, // faucet keys
				address, // recipient
				amount // amount
			);

			// TESTING VERIFY SIGNATURE

			const result_verifySig = verifySignature(
				signedTransaction.data.transactionDataHash,
				keys.publicKey,
				signedTransaction.data.senderSignature
			);
			console.log('Signature from transaction just created is valid?', {
				result_verifySig,
			});
			// TESTING VERIFY SIGNATURE END

			if (signedTransaction.error) {
				console.log('signing error:', signedTransaction.error);
				return { data: null, error: signedTransaction.error };
			}

			console.log('attempting submit');
			console.log({ keys, address });
			const submitResponse = await submitTransaction(nodeUrl, signedTransaction.data);

			if (submitResponse.error) {
				console.log('submit error:', submitResponse.error);
				return { data: null, error: submitResponse.error };
			}

			//transaction was signed and sent! draw success view:
			return {
				data: {
					transactionDataHash: signedTransaction.data.transactionDataHash,
					amount,
				},
				error: null,
			};
		} catch (err) {
			return {
				data: null,
				error: err,
			};
		}
	};

	app.get('/', async (req, res) => {
		const active = 'index';
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

	app.post('/', async (req, res) => {
		console.log('post works');
		const active = 'index';
		const address = req.body.address;
		const nodeUrl = req.body.nodeUrl;
		const captcha = req.body.captcha;

		if (address === '' || (address === undefined && nodeUrl === '') || nodeUrl === undefined) {
			drawView(res, active, {
				transactionData: undefined,
				error: 'Please be sure boxes are filled correctly!',
			});
			return;
		}

		if (!captcha) {
			drawView(res, active, {
				transactionData: undefined,
				error: 'Invalid captcha!',
			});
			return;
		}

		// else we try sending a transaction to the recipient
		const response = await db.findAndSave(address, nodeUrl, signAndSend);
		if (response.error) {
			console.log('Error signing and sending transaction:', response.error);
			drawView(res, active, {
				transactionData: undefined,
				error: response.error,
			});
			return;
		}
		console.log(
			'db save and send response: should have data with transaction data, and null error',
			{ response }
		);

		const transactionData = {
			transactionDataHash: response.data.transactionDataHash,
			amount: convert.toCoins(response.data.amount).amount,
			address,
		}; // transactionDataHash, amount

		// on success:
		// const transactionData = {amount: 'some amount', address: 'some address', transactionDataHash: 'some transaction data hash'};
		req.session.transactionData = transactionData;
		req.session.save((err) => {
			if (err) {
				drawView(res, active, {
					transactionData: undefined,
					error: 'Error saving to session!',
				});
				return;
			}

			drawView(res, active, {
				transactionData,
				error: undefined,
			});
		});
	});

	app.get('/donate', async (req, res) => {
		const active = 'donate';
		drawView(res, active, { address: faucetWalletInfo.address });
	});

	// Preset helper functions ===

	const drawView = (res, view, data = {}) =>
		res.render(__dirname + '/views/' + view + '.html', data);

	app.listen(port, () => {
		console.log(`Faucet running on http://localhost:${port}`);
	});
})();
