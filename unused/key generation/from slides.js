const EC = require('elliptic').ec;
const sha3 = require('js-sha3');
const ec = new EC('secp256k1');


const options = {
	entropy: "some entropy like a password",
	entropyEnc: 'utf8'
};

const keyPair = ec.genKeyPair(options);
const privKey = keyPair.getPrivate('hex');
const pubKey = keyPair.getPublic();

console.log(
`Private Key: ${privKey}\n
Public Key: ${pubKey.encode("hex").substring(2)}\n
Public Key (Compressed): ${pubKey.encodeCompressed('hex')}`
);	

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

