const COIN_PATH_INFO = {
	purpose: "44", // indicates bip44 compatibility
	coinType: "7789", // picked an unused number for our blockchain
};

const pathFromPathObject = ({ account, change, index }) => `m/${COIN_PATH_INFO.purpose}'/${COIN_PATH_INFO.coinType}'/${account}'/${change}/${index}`;

module.exports = {
	COIN_PATH_INFO,
	pathFromPathObject
};