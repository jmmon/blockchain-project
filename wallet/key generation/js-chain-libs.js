const bip39 = require('bip39');

import BIP32Factory from "bip32";
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory.default(ecc);

const chainLibs = require('js-chain-libs');

const config = {
	accountPollingInterval: 20000,
	stakePoolsPollingInterval: 40000,
	nodeSettingsPollingInterval: 90000,
	transactionPollingInterval: 25000,
	networkDiscrimination: "testnet",
	addressPrefix: "addr",
	nodeUrl: "http://localhost:5555",
	explorer: {url: 'http://localhost:5222', transactionPath: "tx"},
	APIBase: "/api/v0",
}

const nodeSettings = {
	fees: {
		constant: 10,
	},
	block0Hash: '1',
}

const getAccountFromPrivateKey = async (secret) => {
	const {PrivateKey} = await chainLibs;
	const privateKey = PrivateKey.from_bech32(secret);
	return getAccountDataFromPrivateKey(privateKey);
}


const getAccountFromSeed = async (seed) => {
	const {PrivateKey} = await chainLibs;
	const privateKey = PrivateKey.from_normal_bytes(seed.slice(0, 32));

	return getAccountDataFromPrivateKey(privateKey);
}

const getAccountDataFromPrivateKey = async (privateKey) => {
	const {
    Account,
    AddressDiscrimination
  } = await chainLibs;

	const publicKey = privateKey.to_public();
	const secret = privateKey.to_bech32();
	const account = Account.single_from_public_key(publicKey);
	const identifier = account.to_identifier();
	const networkDiscrimination = config.get('networkDiscrimination') === 'testnet' ? AddressDiscrimination.Test : AddressDiscrimination.Production;
	const address = account.to_address(networkDiscrimination || 0).toString(config.get('addressPrefix'));

	return {
		address,
		privateKey: secret,
		identifier: identifier.to_hex()
	}
}



const buildSendFundsTransaction = async (
	destination,
	amount,
	secret,
	accountCounter,
	nodeSettings
) => {
	return buildTransaction(secret, nodeSettings, accountCounter, undefined, {
		amount, 
		address: destination
	});
}


const buildTransaction = async (
	secret,
	nodeSettings,
	accountCounter,
	output
) => {
	const {
    OutputPolicy,
    Address,
    TransactionBuilder,
    InputOutput,
    InputOutputBuilder,
    Payload,
    Witnesses,
    PayloadAuthData,
    Transaction,
    TransactionBuilderSetWitness,
    TransactionBuilderSetAuthData,
    TransactionBuilderSetIOs,
    StakeDelegationAuthData,
    AccountBindingSignature,
    Input,
    Value,
    Fee,
    Fragment,
    PrivateKey,
    Witness,
    SpendingCounter,
    Hash,
    Account,
    // eslint-disable-next-line camelcase
    uint8array_to_hex
  } = await chainLibs;
	const privateKey = PrivateKey.from_bech32(secret);
	const sourceAccount = Account.single_from_public_key(
		privateKey.to_public()
	);

	const computedFee = nodeSettings.fees.constant;

	const iobuilder = InputOutputBuilder.empty();
	let inputAmount = output.amount + computedFee;
	iobuilder.add_output(
		Address.from_string(output.address),
		Value.from_str(output.amount.toString())
	);
	const input = Input.from_account(
		sourceAccount,
		Value.from_str(inputAmount.toString())
	);

	iobuilder.add_input(input);

	const feeAlgorithm = nodeSettings.fees.constant; //??

	const IOs = iobuilder.seal_with_output_policy(
		Payload.no_payload(),
		feeAlgorithm,
		OutputPolicy.forget()
	)

	const txbuilder = new TransactionBuilder();
	const builderSetIOs = txbuilder.no_payload();

	const builderSetWitmess = builderSetIOs.set_ios(
		IOs.inputs(),
		IOs.outputs()
	);

	const witness = Witness.for_account(
		Hash.from_hex(nodeSettings.block0Hash),
		builderSetWitness.get_auto_data_for_witness(),
		privateKey,
		SpendingCounter.from_u32(accountCounter)
	);

	const witnesses = Witnesses.new();
	witnesses.add(witness);

	const builderSignCertificate = builderSetWitness.set_witnesses(witnesses);

	const signature = PayloadAuthData.for_no_payload();

	const signedTx = builderSignCertificate.set_payload_auth(signature);

	const message = Fragment.from_transaction(signedTx);

	return {
		transaction: message.as_bytes(),
		id: uint8array_to_hex(message.id().as_bytes()),
		fee: computedFee
	}
}

















;(async () => {
	const {
		OutputPolicy,
		TransactionBuilder,
		Address,
		Input,
		Value,
		Fee,
		Fragment,
		PrivateKey,
		Witness,
		SpendingCounter,
		Hash,
		Account,
		InputOutputBuilder,
		PayloadAuthData,
		Payload,
		Witnesses,
		// eslint-disable-next-line camelcase
		uint8array_to_hex
	} = await chainLibs;

	// take password? (for entropy); and generate mnemonic, and run openWalletFromMnemonic() if needed
	// can use bip39.entropyToMnemonic if entropy is good.....
	const generateNewWallet = async () => {
		const mnemonic = bip39.generateMnemonic();

		return mnemonic;
	}

	const createSeedFromMnemonic = (mnemonic, password = '') => {
		const seed = bip39.mnemonicToSeedSync(mnemonic, password);
		return seed;
	}

	// take mnemonic and generate seed, pubkey, and address
	const openWalletFromMnemonic = async (mnemonic) => {


	}

	// when logged in (when "wallet" is in localStorage), show the mnemonic to the user
	const showMnemonic = async () => {

	}

	// from the localstorage wallet: uses the first address from the wallet, and takes a blockchain node, and fetches the balances of that address on the blockchain
	const getAccountBalance = async () => {

	}

	// sign transaction data to prepare for sending
	const signTransaction = async () => {

	}

	// broadcast signed transaction to network node
	const sendTransaction = async () => {

	}

	//simply remove "wallet" from local storage?
	const logout = async () => {

	}

})();

