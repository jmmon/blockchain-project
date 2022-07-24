/**
 * The EthersJS library that comes with this exercise is using EthersJS Version 5.1.
 * Check documentation here: https://docs.ethers.io/v5/
 */

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

	$("#linkImportWalletFromMnemonic").click(function () {
		$("#textareaOpenWallet").val("");
		$("#passwordOpenWallet").val("");
		$("#textareaOpenWalletResult").val("");
		$("#textareaOpenWallet").val(
			"toddler online monitor oblige solid enrich cycle animal mad prevent hockey motor"
		);
		showView("viewOpenWalletFromMnemonic");
	});

	$("#linkImportWalletFromFile").click(function () {
		$("#walletForUpload").val("");
		$("#passwordUploadWallet").val("");
		showView("viewOpenWalletFromFile");
	});

	$("#linkShowMnemonic").click(function () {
		$("#passwordShowMnemonic").val("");
		showView("viewShowMnemonic");
	});

	$("#linkShowAddressesAndBalances").click(function () {
		$("#passwordShowAddresses").val("");
		$("#divAddressesAndBalances").empty();
		showView("viewShowAddressesAndBalances");
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

	$("#linkExport").click(function () {
		showView("viewExportWallet");
		$("#currentWalletToExport").val(window.localStorage.JSON);
	});

	$("#linkContract").click(function () {
		showView("viewContract");
		$("#contractAddress").val(SAMPLE_CONTRACT_ADDRESS);
		$("#textareaContractABI").val(JSON.stringify(SAMPLE_ABI, null, " "));
	});

	$("#buttonGenerateNewWallet").click(generateNewWallet);
	$("#buttonOpenExistingWallet").click(openWalletFromMnemonic);
	$("#buttonUploadWallet").click(openWalletFromFile);
	$("#buttonShowMnemonic").click(showMnemonic);
	$("#buttonShowAddresses").click(showAddressesAndBalances);
	$("#buttonSendAddresses").click(unlockWalletAndDeriveAddresses);
	$("#buttonSignTransaction").click(signTransaction);
	$("#buttonSendSignedTransaction").click(sendTransaction);
	$("#exportWalletForReal").click(exportWalletToJSONFile);
	$("#contractAddressInitialize").click(initializeContract);
	$("#contractExecute").click(executeContract);

	$("#linkDelete").click(deleteWallet);

	function showView(viewName) {
		// Hide all views and show the selected view only
		$("main > section").hide();
		$("#" + viewName).show();

		if (localStorage.JSON) {
			$("#linkCreateNewWallet").hide();
			$("#linkImportWalletFromMnemonic").hide();
			$("#linkImportWalletFromFile").hide();

			$("#linkShowMnemonic").show();
			$("#linkShowAddressesAndBalances").show();
			$("#linkSendTransaction").show();
			$("#linkDelete").show();
			$("#linkContract").show();
			$("#linkExport").show();
		} else {
			$("#linkShowMnemonic").hide();
			$("#linkShowAddressesAndBalances").hide();
			$("#linkSendTransaction").hide();
			$("#linkDelete").hide();
			$("#linkContract").hide();
			$("#linkExport").hide();

			$("#linkCreateNewWallet").show();
			$("#linkImportWalletFromMnemonic").show();
			$("#linkImportWalletFromFile").show();
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
		$("#linkCreateNewWallet").hide();
		$("#linkImportWalletFromMnemonic").hide();
		$("#linkImportWalletFromFile").hide();

		$("#linkShowMnemonic").show();
		$("#linkShowAddressesAndBalances").show();
		$("#linkSendTransaction").show();
		$("#linkDelete").show();
		$("#linkContract").show();
		$("#linkExport").show();
	}

	async function encryptAndSaveJSON(wallet, password) {
		// TODO:
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
		// Generate Now button
		// TODO;
		// Take input box and save it in a variable.
		// Use ethers.js to create a new random wallet
		// ethers.Wallet.createRandom([options])
		// encryptAndSaveJSON method to encrypt wallet and save in local storage

		const password = $("#passwordCreateWallet").val();
		// console.log(password);
		const randomNumber = Math.random();
		const wallet = new ethers.Wallet.createRandom([password, randomNumber]);
		await encryptAndSaveJSON(wallet, password);
		showInfo("Please save your mnemonic: " + wallet.mnemonic.phrase);
		$("#textareaCreateWalletResult").val(window.localStorage.JSON);
	}

	async function openWalletFromMnemonic() {
		// TODO:
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

	async function openWalletFromFile() {
		// TODO:
		if ($("#walletForUpload")[0].files.length <= 0) {
			showError("Please select a file to upload");
			return;
		}

		let password = $("#passwordUploadWallet").val();
		let fileReader = new FileReader();

		fileReader.onload = async function () {
			let json = fileReader.result;

			let wallet;

			try {
				wallet = await decryptWallet(json, password);
			} catch (e) {
				showError(e);
				return;
			} finally {
				hideLoadingBar();
			}

			if (!wallet.mnemonic.phrase) {
				showError("Invalid JSON file");
				return;
			}

			window.localStorage["JSON"] = json;
			showInfo("Wallet successfully loaded!");
			showLoggedInButtons();
		};

		fileReader.readAsText($("#walletForUpload")[0].files[0]);
	}

	async function showMnemonic() {
		// TODO:
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
		// TODO:
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
		// TODO:
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
		// TODO:
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
		// TODO:
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
		// TODO:
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
		// TODO:
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

	function deleteWallet() {
		// TODO:
		localStorage.clear();
		showView("viewHome");
	}

	function initializeContract() {
		// OPTIONAL TODO:
		const contractAddress = $("#contractAddress").val();
		const abi = $("#textareaContractABI").val();

		console.log("contract address:", contractAddress);
		console.log("abi:", abi);

		let contract;
		try {
			contract = new ethers.Contract(contractAddress, abi, provider);
			console.log("after new contract");
			const methods = Object.keys(contract.functions).filter(
				(item) => item.includes("(") && item.includes(")")
			);
			console.log(methods);

			methods.forEach((m) => {
				let option = $(`<option id="${m}"></option>`).text(m);
				$("#contractMethods").append(option);
			});
		} catch (e) {
			showError(e);
			return;
		} finally {
			$("#contractInput").show();
		}
	}

	async function executeContract() {
		// not working
		// OPTIONAL TODO:

		// take password
		// decrypt localstorage wallet
		// take a value
		// send transaction
		const password = $("#contractPassword").val();
		const json = window.localStorage.JSON;

		const method = $("#contractMethods").children("option:selected").val();
		console.log("selected method", method);

		const contractAddress = $("#contractAddress").val();
		const abi = $("#textareaContractABI").val();
		let contract;

		let wallet;

		// need to deploy contract here - so it's deployed on ropsten (instead of private remix blockchain)

		try {
			wallet = await decryptWallet(json, password);
			hideLoadingBar();
			const value = $("#contractInput").val();
			contract = new ethers.Contract(contractAddress, abi, provider);
			let contractWithSigner = contract.connect(wallet);
			let tx;

			if (method.includes("()")) {
				// no value needed

				let get = await contract[method]();
				console.log("retrieved value from method:", get);
			} else {
				// example: "(uint256)"
				if (!value) {
					showError("A value is needed!");
					return;
				}
				tx = await contractWithSigner[method](value);
				console.log("tx hash:", tx.hash);
				await tx.wait();
				console.log("tx.wait finished, should be updated?");
			}
		} catch (e) {
			showError(e);
			return;
		}
	}

	function exportWalletToJSONFile() {
		// OPTIONAL TODO:
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
