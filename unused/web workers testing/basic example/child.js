module.exports = function (input, callback) {
	callback(null, `${input} BAR (${process.pid})`);
}