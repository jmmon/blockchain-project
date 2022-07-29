/**
 * The EthersJS library that comes with this exercise is using EthersJS Version 5.1.
 * Check documentation here: https://docs.ethers.io/v5/
 */

// import BIP32Factory from 'bip32';
const BIP32Factory = require('bip32');
// import * as bip39 from 'bip39';
const bip39 = require('bip39');
// import * as ecc from 'tiny-secp256k1';
const ecc = require('tiny-secp256k1');

const bip32 = BIP32Factory(ecc);

$(document).ready(function () {
	const derivationPath = "m/44'/60'/0'/0/";
	const provider = ethers.getDefaultProvider("ropsten");

	let wallets = {};
	let contract;

	const SAMPLE_CONTRACT_ADDRESS = "";
	const SAMPLE_ABI = [];

	showView("viewHome");
	

	$("#linkHome").click(function () {
		showView("viewHome");
	});

	$("#linkCreateNewWallet").click(function () {
		$("#passwordCreateWallet").val("");
		$("#textareaCreateWalletResult").val("");
		showView("viewCreateNewWallet");
	});

	$("#linkOpenWallet").click(function () {
		$("#textareaOpenWallet").val("");
		$("#passwordOpenWallet").val("");
		$("#textareaOpenWalletResult").val("");
		$("#textareaOpenWallet").val(
			"toddler online monitor oblige solid enrich cycle animal mad prevent hockey motor"
		);
		showView("viewOpenWalletFromMnemonic");
	});

	$("#linkAccountBalance").click(function () {
		showView("viewAccountBalance");
	});


	$("#linkSendTransaction").click(function () {
		$("#divSignAndSendTransaction").hide();

		$("#passwordSendTransaction").val("");
		$("#transferValue").val("");
		$("#senderAddress").empty();

		$("#textareaSignedTransaction").val("");
		$("#textareaSendTransactionResult").val("");

		showView("viewSendTransaction");
	});

	$("#linkShowMnemonic").click(function () {
		$("#passwordShowMnemonic").val("");
		showView("viewShowMnemonic");
	});

	$("#linkLogout").click(logout);


	// Set up our button functions:
	$("#buttonGenerateNewWallet").click(generateNewWallet);
	$("#buttonOpenExistingWallet").click(openWalletFromMnemonic);
	$("#buttonShowMnemonic").click(showMnemonic);
	$("#buttonShowAddresses").click(showAddressesAndBalances);
	$("#buttonSendAddresses").click(unlockWalletAndDeriveAddresses);
	$("#buttonSignTransaction").click(signTransaction);
	$("#buttonSendSignedTransaction").click(sendTransaction);
	$("#exportWalletForReal").click(exportWalletToJSONFile);




	//Testing buttons:
	$("#showLoggedInButtons").click(showLoggedInButtons);
	$("#showLoggedOutButtons").click(showLoggedOutButtons);




	// Show/Hide sections functions:

	function showView(viewName) {
		// Hide all views and show the selected view only
		$("main > section").hide();
		$("#" + viewName).show();

		// if we have a wallet in local storage, we have access to the wallet:
		if (localStorage.JSON) {
			showLoggedInButtons();

		} else {
			showLoggedOutButtons();
		}
	}

	function showInfo(message) {
		$("#infoBox>p").html(message);
		$("#infoBox").show();
		$("#infoBox>header").click(function () {
			$("#infoBox").hide();
		});
	}

	function showError(errorMsg) {
		$("#errorBox>p").html("Error: " + errorMsg);
		$("#errorBox").show();
		$("#errorBox>header").click(function () {
			$("#errorBox").hide();
		});
	}

	function showLoadingProgress(percent) {
		$("#loadingBox").html(
			"Loading... " + parseInt(percent * 100) + "% complete"
		);
		$("#loadingBox").show();
		$("#loadingBox>header").click(function () {
			$("#errorBox").hide();
		});
	}

	function hideLoadingBar() {
		$("#loadingBox").hide();
	}

	function showLoggedInButtons() {
		$(".before-login").each(function () {
			$(this).hide();
			// console.log('attempting hiding ', $(this));
		});
		$(".after-login").each(function () {
			$(this).show();
			// console.log('attempting showing ', $(this));
		});
	}

	function showLoggedOutButtons() {
		$(".before-login").each(function () {
			$(this).show();
			// console.log('attempting showing ', $(this));
		});
		$(".after-login").each(function () {
			$(this).hide();
			// console.log('attempting hiding ', $(this));
		});
	}



	// Wallet functionality:

	async function encryptAndSaveJSON(wallet, password) {
		// encrypt() method returns json; save it in local storage
		// 		and call showLoggedInButtons() if saved wallet exists in storage.
		// catch errors and show them with showError()
		// hide loading bar with hideLoadingBar()

		let encryptedWallet;

		try {
			encryptedWallet = await wallet.encrypt(
				password,
				{},
				showLoadingProgress
			);
		} catch (e) {
			showError(e);
			return;
		} finally {
			hideLoadingBar();
		}

		window.localStorage["JSON"] = encryptedWallet;
		showLoggedInButtons();
	}

	function decryptWallet(json, password) {
		// TODO:
		return ethers.Wallet.fromEncryptedJson(
			json,
			password,
			showLoadingProgress
		);
	}

	async function generateNewWallet() {
		//TODO: use util entropy generator to create randomness for wallet

		// const password = $("#passwordCreateWallet").val();
		// const repeatPassword = $("#passwordRepeatCreateWallet").val();

		// if (password !== repeatPassword) {
		// 	showError("Passwords do not match!");
		// 	return;
		// }

		const mnemonic = bip39.generateMnemonic()
		const masterSeed = bip39.mnemonicToSeedSync(mnemonic);
		const node = bip32.fromSeed(masterSeed);
		const stringNode = node.neutered().toBase58();
		$("#textareaCreateWalletResult").val(`Generated Mnemonic:\n${mnemonic}\nSeed from mnemonic:\n${masterSeed}\nnode from seed:\n${node}\nStringNode from node:\n${stringNode}`);
		
		// const randomNumber = Math.random();
		// const wallet = new ethers.Wallet.createRandom([password, randomNumber]);
		// console.log(wallet);
		
		// // await encryptAndSaveJSON(wallet, password);
		// showInfo("Please save your mnemonic: " + wallet.mnemonic.phrase);
		// $("#textareaCreateWalletResult").val(`Generated Mnemonic:\n${wallet.mnemonic.phrase}\nExtracted Public Key:\n${wallet.publicKey}\nAddress:\n${wallet.address}`);
		
	}

	async function openWalletFromMnemonic() {
		const mnemonic = $("#textareaOpenWallet").val();

		if (!ethers.utils.isValidMnemonic(mnemonic)) {
			showError("Invalid Mnemonic");
		} else {
			const wallet = ethers.Wallet.fromMnemonic(mnemonic);
			const password = $("#passwordOpenWallet").val();

			await encryptAndSaveJSON(wallet, password);
			showInfo("Wallet successfully loaded!");
			$("#textareaOpenWalletResult").val(window.localStorage.JSON);
		}
	}


	async function showMnemonic() {
		const password = $("#passwordShowMnemonic").val();
		const json = window.localStorage.JSON;

		let wallet;

		try {
			wallet = await decryptWallet(json, password);
		} catch (e) {
			showError(e);
			return;
		} finally {
			hideLoadingBar();
		}
		showInfo("Your mnemonic is: " + wallet.mnemonic.phrase);
	}

	async function showAddressesAndBalances() {
		const password = $("#passwordShowAddresses").val();
		const json = window.localStorage.JSON;

		let wallet;

		try {
			wallet = await decryptWallet(json, password);
			await renderAddressAndBalances(wallet);
		} catch (e) {
			$("#divAddressesAndBalances").empty();
			showError(e);
			return;
		} finally {
			hideLoadingBar();
		}
	}

	async function renderAddressAndBalances(wallet) {
		$("#divAddressesAndBalances").empty();
		const masterNode = ethers.utils.HDNode.fromMnemonic(
			wallet.mnemonic.phrase
		);
		const balancePromises = [];

		for (let i = 0; i < 5; i++) {
			const derivedPrivateKey = masterNode.derivePath(
				derivationPath + i
			).privateKey;
			let wallet = new ethers.Wallet(derivedPrivateKey, provider);
			const promise = wallet.getBalance();
			balancePromises.push(promise);
		}

		let balances;

		try {
			balances = await Promise.all(balancePromises);
		} catch (e) {
			showError(e);
			return;
		}

		for (let i = 0; i < 5; i++) {
			let div = $('<div id="qrcode"></div>');
			const derivedPrivateKey = masterNode.derivePath(
				derivationPath + i
			).privateKey;
			let wallet = new ethers.Wallet(derivedPrivateKey, provider);

			div.qrcode(wallet.address);
			div.append(
				$(
					`<p>${wallet.address}: ${ethers.utils.formatEther(
						balances[i]
					)} ETH </p>`
				)
			);
			$("#divAddressesAndBalances").append(div);
		}
	}

	async function unlockWalletAndDeriveAddresses() {
		let password = $("#passwordSendTransaction").val();
		let json = localStorage.JSON;
		let wallet;

		try {
			wallet = await decryptWallet(json, password);
		} catch (e) {
			showError(e);
			return;
		} finally {
			$("#passwordSendTransaction").val();
			hideLoadingBar();
		}

		showInfo("Wallet successfully unlocked!");
		renderAddresses(wallet);
		$("#divSignAndSendTransaction").show();
	}

	async function renderAddresses(wallet) {
		$("#senderAddress").empty();

		let masterNode = ethers.utils.HDNode.fromMnemonic(
			wallet.mnemonic.phrase
		);

		for (let i = 0; i < 5; i++) {
			let wallet = new ethers.Wallet(
				masterNode.derivePath(derivationPath + i).privateKey,
				provider
			);
			let address = wallet.address;

			wallets[address] = wallet;
			let option = $(`<option id="${wallet.address}"></option>`).text(
				address
			);
			$("#senderAddress").append(option);
		}
	}

	async function signTransaction() {
		let senderAddress = $("#senderAddress option:selected").attr("id");
		let wallet = wallets[senderAddress];

		
		// Validations
		if (!wallet) {
			showError("Invalid address!");
			return;
		}

		const recipient = $("#recipientAddress").val();
		if (!recipient) {
			showError("Invalid recipient!");
			return;
		}

		const value = $("#transferValue").val();
		if (!value || value < 0) {
			showError("Invalid transfer value!");
			return;
		}

		// Create Tx Object
		const tx = {
			to: recipient,
			value: ethers.utils.parseEther(value.toString()),
		};

		try {
			const createReceipt = await wallet.signTransaction(tx);
			console.log(`Sign Transaction Successful: ${createReceipt}`);
			$("#textareaSignedTransaction").val(createReceipt);
		} catch (e) {
			$("#textareaSignedTransaction").val("Error: " + e);
			showError(e);
			return;
		}
	}

	async function sendTransaction() {
		const recipient = $("#recipientAddress").val();
		if (!recipient) {
			showError("Invalid recipient!");
			return;
		}

		const value = $("#transferValue").val();
		if (!value || value < 0) {
			showError("Invalid transfer value!");
			return;
		}

		let senderAddress = $("#senderAddress option:selected").attr("id");
		let wallet = wallets[senderAddress];

		if (!wallet) {
			showError("Invalid address!");
			return;
		}

		console.log(
			`Attempting to send ${value} ETH transaction from ${senderAddress} to ${recipient}`
		);

		// Create Tx Object
		const tx = {
			to: recipient,
			value: ethers.utils.parseEther(value.toString()),
		};

		try {
			const createReceipt = await wallet.sendTransaction(tx);
			await createReceipt.wait();
			const hash = createReceipt.hash;
			console.log(`Transaction successful with hash: ${hash}`);
			showInfo(`Transaction successful with hash: ${hash}`);
			let etherscanUrl = "https://ropsten.etherscan.io/tx/" + hash;
			$("#textareaSendTransactionResult").val(etherscanUrl);
		} catch (e) {
			$("#textareaSendTransactionResult").val("Error: " + e);
			showError(e);
			return;
		}
	}

	function logout() {
		localStorage.clear();
		showView("viewHome");
	}

	function exportWalletToJSONFile() {
		const data = new Blob([window.localStorage.JSON], {
			type: "text/plain",
		});

		let $a = $("<a>", {
			href: window.URL.createObjectURL(data),
			download: "exported-wallet.json",
		});

		$("body").append($a);
		$a[0].click();
		$a.remove();
	}
});
