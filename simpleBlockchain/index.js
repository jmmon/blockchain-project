const {Block, Blockchain} = require("./blockchain");

const myChain = new Blockchain();

myChain.addBlock(new Block(
	Date.now().toISOString(),
	{ from: "Alice", to: "Bob", amount: 100}
));

console.log(myChain.chain);