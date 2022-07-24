const workerFarm = require('worker-farm');
const	workers = workerFarm(require.resolve('./child'));
let ret = 0;

// const defaultOptions = {
// 	workerOptions               : {}
// , maxCallsPerWorker           : Infinity
// , maxConcurrentWorkers        : require('os').cpus().length
// , maxConcurrentCallsPerWorker : 10
// , maxConcurrentCalls          : Infinity
// , maxCallTime                 : Infinity
// , maxRetries                  : Infinity
// , autoStart                   : false
// , onChild                     : function() {}
// };
const end = 1000;

for (let i = 0; i < end; i++) {
	const callback = (err, output) => {
		console.log(output);
		if (++ret == end) {
			workerFarm.end(workers);
		}
	}
	workers(`#${i} FOO`, callback);
}

// PIDs: (end == 100)
/* 
4372
16924
14468
10548
14608
10548
19000
19720
8884

9 different ones
*/


/* end==1000
14412
1384
15580
14412
16160
15748
15036
8704
9492

9 different ones again
*/