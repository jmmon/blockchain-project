
import BIP32Factory from 'bip32';
import * as ecc from 'tiny-secp256k1';
const bip32 = BIP32Factory.default(ecc);
import * as bip39 from 'bip39';

import bjs from 'bitcoinjs-lib';

const walletUtils = {
	bip32,
	bip39,
	bjs
};

export default walletUtils;





/* 
ESM scripts can only be imported (not required)
CJS scripts cannot import (only require)
ESM scripts can "default import" but not "named import"
ESM scripts can require(CJS) but causes trouble



*/