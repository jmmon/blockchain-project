
// const bip39 = require('bip39');

// const bip39 = import('bip39');
import bip39 from 'bip39';


import BIP32Factory from "bip32";
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory.default(ecc);
// const bip32 = BIP32Factory(ecc);



const mnemonic = bip39.generateMnemonic();
console.log(`mnemonic: ${mnemonic}`);

const seed = bip39.mnemonicToSeedSync(mnemonic);
console.log('seed from mnemonic:', {seed});
console.log('seed from mnemonic toString:', seed.toString('hex'));
// wallet seed
// 2f966ed0b3d3bdfa6baf8a878e46ce48c760970625ca69160cb2813e6eed6697025042549fdf28120e6982a75cf4a37ebb2dc75a0e94cd8baa3b459e343fbe0b (128 chars)


const masterNode = bip32.fromSeed(seed);
console.log(`node from seed: `, {node: masterNode});

console.log('node toWIF', masterNode.toWIF());
// KwQitemmcP3HxinqHqugWXKVa7GQuDfJsyvPd1UFmu6UedsRoVhP (52 chars)
console.log('node.privateKey', masterNode.privateKey.toString('hex'))
// 2ee15327056ad5c91ba9e96ee251131bc7be3502fa44514b398bf6e7432a8acf (64 chars)

console.log('node.publicKey', masterNode.publicKey.toString('hex'))
// 0368d17f28fee0d9dc59f5accaa3a67c0159530c383d212b101d501974bdb74199 (66 chars)

const path = "m/0'/0/0";
const child1 = masterNode.derivePath(path);
console.log(`derive path from node and path:`, {child1})

const child1b = masterNode.deriveHardened(0).derive(0).derive(0);
console.log(`derive path manually:`, {child1b})

console.log('child1 == child1b:', child1==child1b);



const nodeString = masterNode.neutered().toBase58();
console.log(`nodeString (neutered) (xpub): ${nodeString}`);
// [xpub]661MyMwAqRbcFzqxfDF5zkx1txqQvaoXNSYwHaCywKpzkjCJT2ELBwDAtW1pU5Us7i4iUwowMkRQgFsyYfCoPTnAM9aENMjNGUDQAFWr6Vy (107 chars [- xpub])
const nodeStringNotNeutered = masterNode.toBase58();
console.log(`nodeString (xpriv): ${nodeStringNotNeutered}`);
// [xpriv]9s21ZrQH143K3WmVZBi5dd1HLvzvX85g1DdLVBoNNzJ1svs9uUv5e8th3Eup2tN5Mx2xRFoR1kvrGkgfb6Xo4WVHVLCACqH26WR9kiXfTj6

const restored = bip32.fromBase58(nodeString);
console.log(`restored from nodeSring:`, {restored});