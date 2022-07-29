import BIP32Factory from 'bip32';
// const BIP32Factory = require('bip32');
import * as bip39 from 'bip39';
// const bip39 = require('bip39');
import * as ecc from 'tiny-secp256k1';
// const ecc = require('tiny-secp256k1');

// const bip32 = BIP32Factory(ecc);
const bip32 = BIP32Factory.default(ecc)

// let BIP32Factory = require('bip32').default
// tiny-secp256k1 v2 is ES module and must be imported, not required
// (This requires v14 of node or greater)
// But as long as you implement the interface, any library is fine
// import('tiny-secp256k1').then(ecc => BIP32Factory(ecc)).then(bip32 => {
//   let node = bip32.fromBase58('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi')

//   let child = node.derivePath('m/0/0')
//   // ...


// 	const createWallet = () => {
// 		const mnemonic = bip39.generateMnemonic()
// 		const seed = bip39.mnemonicToSeedSync(mnemonic);
// 		const node = bip32.fromSeed(seed);
// 		const stringNode = node.neutered().toBase58();
// 		console.log(`Generated Mnemonic:\n${mnemonic}\nSeed from mnemonic:\n${seed}\nnode from seed:\n${node}\nStringNode from node:\n${stringNode}`);
// 	}
	
	
	
// 	createWallet();
// })







const createWallet = () => {
	const mnemonic = bip39.generateMnemonic()
	const masterSeed = bip39.mnemonicToSeedSync(mnemonic);
	const node = bip32.fromSeed(masterSeed);
	//node.sign(hash), node.verify(hash, signature)
	/*
	examples: 
	valid["master"] = {
		seed: a seed
		wif: a wif (wallet import format)
		pubkey
		privkey
		chaincoad
		base58 (xpub)
		base58Priv (xpriv)
		identifier ??
		fingerprint ??
	},
	valid["children"]: [
		{
			"path": "m/0'",
			"m": 0, // index of "subfolder" m/0'
			"hardened": true, // has apostrophy on this path item
			"wif": "L5BmPijJjrKbiUfG4zbiFKNqkvuJ8usooJmzuD7Z8dkRoTThYnAT",
			"pubKey": "035a784662a4a20a65bf6aab9ae98a6c068a81c52e4b032c0fb5400c706cfccc56",
			"privKey": "edb2e14f9ee77d26dd93b4ecede8d16ed408ce149b6cd80b0715a2d911a0afea",
			"chainCode": "47fdacbd0f1097043b78c63c20c34ef4ed9a111d980047ad16282c7ae6236141",
			"base58": "xpub68Gmy5EdvgibQVfPdqkBBCHxA5htiqg55crXYuXoQRKfDBFA1WEjWgP6LHhwBZeNK1VTsfTFUHCdrfp1bgwQ9xv5ski8PX9rL2dZXvgGDnw",
			"base58Priv": "xprv9uHRZZhk6KAJC1avXpDAp4MDc3sQKNxDiPvvkX8Br5ngLNv1TxvUxt4cV1rGL5hj6KCesnDYUhd7oWgT11eZG7XnxHrnYeSvkzY7d2bhkJ7",
			"identifier": "5c1bd648ed23aa5fd50ba52b2457c11e9e80a6a7",
			"fingerprint": "5c1bd648",
			"index": 2147483648,
			"depth": 1 // first "subfolder" past m
		},
		{
			"path": "m/0'/1",
			"m": 1, // index of "subfolder" m/0'/1
			"wif": "KyFAjQ5rgrKvhXvNMtFB5PCSKUYD1yyPEe3xr3T34TZSUHycXtMM",
			"pubKey": "03501e454bf00751f24b1b489aa925215d66af2234e3891c3b21a52bedb3cd711c",
			"privKey": "3c6cb8d0f6a264c91ea8b5030fadaa8e538b020f0a387421a12de9319dc93368",
			"chainCode": "2a7857631386ba23dacac34180dd1983734e444fdbf774041578e9b6adb37c19",
			"base58": "xpub6ASuArnXKPbfEwhqN6e3mwBcDTgzisQN1wXN9BJcM47sSikHjJf3UFHKkNAWbWMiGj7Wf5uMash7SyYq527Hqck2AxYysAA7xmALppuCkwQ",
			"base58Priv": "xprv9wTYmMFdV23N2TdNG573QoEsfRrWKQgWeibmLntzniatZvR9BmLnvSxqu53Kw1UmYPxLgboyZQaXwTCg8MSY3H2EU4pWcQDnRnrVA1xe8fs",
			"identifier": "bef5a2f9a56a94aab12459f72ad9cf8cf19c7bbe",
			"fingerprint": "bef5a2f9",
			"index": 1,
			"depth": 2 // second "subfolder" past m
		},    
		{
			"path": "m/0'/1/2'",
			"m": 2,
			"hardened": true,
			"wif": "L43t3od1Gh7Lj55Bzjj1xDAgJDcL7YFo2nEcNaMGiyRZS1CidBVU",
			"pubKey": "0357bfe1e341d01c69fe5654309956cbea516822fba8a601743a012a7896ee8dc2",
			"privKey": "cbce0d719ecf7431d88e6a89fa1483e02e35092af60c042b1df2ff59fa424dca",
			"chainCode": "04466b9cc8e161e966409ca52986c584f07e9dc81f735db683c3ff6ec7b1503f",
			"base58": "xpub6D4BDPcP2GT577Vvch3R8wDkScZWzQzMMUm3PWbmWvVJrZwQY4VUNgqFJPMM3No2dFDFGTsxxpG5uJh7n7epu4trkrX7x7DogT5Uv6fcLW5",
			"base58Priv": "xprv9z4pot5VBttmtdRTWfWQmoH1taj2axGVzFqSb8C9xaxKymcFzXBDptWmT7FwuEzG3ryjH4ktypQSAewRiNMjANTtpgP4mLTj34bhnZX7UiM",
			"identifier": "ee7ab90cde56a8c0e2bb086ac49748b8db9dce72",
			"fingerprint": "ee7ab90c",
			"index": 2147483650,
			"depth": 3 // third "subfolder" past m
		},
		{
			"path": "m/0'/1/2'/2",
			"m": 2,
			"wif": "KwjQsVuMjbCP2Zmr3VaFaStav7NvevwjvvkqrWd5Qmh1XVnCteBR",
			"pubKey": "02e8445082a72f29b75ca48748a914df60622a609cacfce8ed0e35804560741d29",
			"privKey": "0f479245fb19a38a1954c5c7c0ebab2f9bdfd96a17563ef28a6a4b1a2a764ef4",
			"chainCode": "cfb71883f01676f587d023cc53a35bc7f88f724b1f8c2892ac1275ac822a3edd",
			"base58": "xpub6FHa3pjLCk84BayeJxFW2SP4XRrFd1JYnxeLeU8EqN3vDfZmbqBqaGJAyiLjTAwm6ZLRQUMv1ZACTj37sR62cfN7fe5JnJ7dh8zL4fiyLHV",
			"base58Priv": "xprvA2JDeKCSNNZky6uBCviVfJSKyQ1mDYahRjijr5idH2WwLsEd4Hsb2Tyh8RfQMuPh7f7RtyzTtdrbdqqsunu5Mm3wDvUAKRHSC34sJ7in334",
			"identifier": "d880d7d893848509a62d8fb74e32148dac68412f",
			"fingerprint": "d880d7d8",
			"index": 2,
			"depth": 4 // fourth "subfolder" past m
		},
		{
			"path": "m/0'/1/2'/2/1000000000",
			"m": 1000000000,
			"wif": "Kybw8izYevo5xMh1TK7aUr7jHFCxXS1zv8p3oqFz3o2zFbhRXHYs",
			"pubKey": "022a471424da5e657499d1ff51cb43c47481a03b1e77f951fe64cec9f5a48f7011",
			"privKey": "471b76e389e528d6de6d816857e012c5455051cad6660850e58372a6c3e6e7c8",
			"chainCode": "c783e67b921d2beb8f6b389cc646d7263b4145701dadd2161548a8b078e65e9e",
			"base58": "xpub6H1LXWLaKsWFhvm6RVpEL9P4KfRZSW7abD2ttkWP3SSQvnyA8FSVqNTEcYFgJS2UaFcxupHiYkro49S8yGasTvXEYBVPamhGW6cFJodrTHy",
			"base58Priv": "xprvA41z7zogVVwxVSgdKUHDy1SKmdb533PjDz7J6N6mV6uS3ze1ai8FHa8kmHScGpWmj4WggLyQjgPie1rFSruoUihUZREPSL39UNdE3BBDu76",
			"identifier": "d69aa102255fed74378278c7812701ea641fdf32",
			"fingerprint": "d69aa102",
			"index": 1000000000,
			"depth": 5 // fifth "subfolder" past m
		}
	]
 	*/
	const xpubkey = node.neutered().toBase58();
	const xprivkey = node.toBase58();
	console.log(`Generated Mnemonic:\n${mnemonic}\nSeed from mnemonic:\n${masterSeed.toString('hex')}\nnode from seed:\n` + {node} + `\nStringNode from node:\n${xpubkey}`);
	console.log('other string node:\n', xprivkey);

	const child = node.derivePath('m/0/0')
	console.log('child:\n', child)

	const hdKey = bip32.fromBase58(xprivkey);
	console.log('hdKey:\n', hdKey);

	const privateKeyFromHdKey = hdKey.privateKey.toString('hex');
	console.log('privateKeyFromHdKey:\n', privateKeyFromHdKey);

	let child2 = hdKey.derivePath('m/44\'/0\'/0\'/0/0\'');
	console.log('child2 privateKey:\n', child2.privateKey.toString('hex'));

	// ideas from: https://github.com/bitcoinjs/bip32/blob/master/test/index.js
}



createWallet();