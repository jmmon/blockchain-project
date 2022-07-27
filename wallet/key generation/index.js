// const EC = require('elliptic').ec;
// const sha3 = require('js-sha3');
// const ec = new EC('secp256k1');
// const bip39 = require('bip39');

// const bip39 = import('bip39');
import bip39 from 'bip39';


import BIP32Factory from "bip32";
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory.default(ecc);
// const bip32 = BIP32Factory(ecc);


const options = {
	entropy: "some entropy like a password",
	entropyEnc: 'utf8'
};

const mnemonic = bip39.generateMnemonic();
console.log(`mnemonic: ${mnemonic}`);

const seed = bip39.mnemonicToSeedSync(mnemonic);
console.log('seed from mnemonic:', {seed});
console.log('seed from mnemonic toString:', seed.toString('hex'));
// wallet seed
// 2f966ed0b3d3bdfa6baf8a878e46ce48c760970625ca69160cb2813e6eed6697025042549fdf28120e6982a75cf4a37ebb2dc75a0e94cd8baa3b459e343fbe0b (128 chars)


const node = bip32.fromSeed(seed);
console.log(`node from seed: `, {node});

console.log('node toWIF', node.toWIF());
// KwQitemmcP3HxinqHqugWXKVa7GQuDfJsyvPd1UFmu6UedsRoVhP (52 chars)
console.log('node.privateKey', node.privateKey.toString('hex'))
// 2ee15327056ad5c91ba9e96ee251131bc7be3502fa44514b398bf6e7432a8acf (64 chars)

console.log('node.publicKey', node.publicKey.toString('hex'))
// 0368d17f28fee0d9dc59f5accaa3a67c0159530c383d212b101d501974bdb74199 (66 chars)

const path = "m/0'/0/0";
const child1 = node.derivePath(path);
console.log(`derive path from node and path:`, {child1})

const child1b = node.deriveHardened(0).derive(0).derive(0);
console.log(`derive path manually:`, {child1b})

console.log('child1 == child1b:', child1==child1b);



const nodeString = node.neutered().toBase58();
console.log(`nodeString (neutered) (xpub): ${nodeString}`);
// [xpub]661MyMwAqRbcFzqxfDF5zkx1txqQvaoXNSYwHaCywKpzkjCJT2ELBwDAtW1pU5Us7i4iUwowMkRQgFsyYfCoPTnAM9aENMjNGUDQAFWr6Vy (107 chars [- xpub])
const nodeStringNotNeutered = node.toBase58();
console.log(`nodeString (xpriv): ${nodeStringNotNeutered}`);
// [xpriv]9s21ZrQH143K3WmVZBi5dd1HLvzvX85g1DdLVBoNNzJ1svs9uUv5e8th3Eup2tN5Mx2xRFoR1kvrGkgfb6Xo4WVHVLCACqH26WR9kiXfTj6

const restored = bip32.fromBase58(nodeString);
console.log(`restored from nodeSring: `, {restored});






// const keyPair = ec.genKeyPair(options);
// const privKey = keyPair.getPrivate('hex');
// const pubKey = keyPair.getPublic();

// console.log(
// `Private Key: ${privKey}\n
// Public Key: ${pubKey.encode("hex").substring(2)}\n
// Public Key (Compressed): ${pubKey.encodeCompressed('hex')}`
// );	




/* example keys:
privKey						5c505c4181a6d205602fd53b38efc5f1d1b95145f644f387b3c514f4309cc0c6 (64 chars)
pubKey 						9f6bf1563986df67a2312df4129eaba98ac303c6313c63dee1d80b3c61aab9959bbd0bc0531b8c5a2cdc6ea993230e84663600ed5ad77651505305998cde925d (128 chars)
pubKey no substr  04f423a4a444c64ada5ca87956328611d4c4309e9287d86c96dde30323a187c062dc5df6fdc39a967fc6589936d4e5fe494d69f01dc14e752a600395d9f0186789 130 chars
pubKey Compressed	039f6bf1563986df67a2312df4129eaba98ac303c6313c63dee1d80b3c61aab995 (66 chars)


*/


/*from slides
private key (64 chars)
97ddae0f3a25b92268175400149d65d6887b9cefaf28ea2c078e05cdc15a3c0a

public key: (128 chars)
7b83ad6afb1209f3c82ebeb08c0c5fa9bf6724548506f2fb4f991e2287a77090
177316ca82b0bdf70cd9dee145c3002c0da1d92626449875972a27807b73b42e

compressed: (ethereum uses prefix 02 or 03) (66 chars)
027b83ad6afb1209f3c82ebeb08c0c5fa9bf6724548506f2fb4f991e2287a77090

(ethereum) address:
last20bytes(keccak256(publicKeyFull))
*/
