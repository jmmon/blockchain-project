'use strict'

const CHILDREN         = 1000
    , POINTS_PER_CHILD = 1000000
    , FARM_OPTIONS     = {
          maxConcurrentWorkers        : require('os').cpus().length - 1
        , maxCallsPerWorker           : Infinity
        // , maxConcurrentCallsPerWorker : 1
        , maxConcurrentCallsPerWorker : Infinity
      }


const blockDataHash = "blockDataHash";
const difficulty = 2;
let success = false;
let blockCandidate = {
  blockDataHash,
  dateCreated: '',
  nonce: 0,
  blockHash: '',
};

let workerFarm = require('worker-farm')
  , calcDirect = require('./calc')
  , calcWorker = workerFarm(FARM_OPTIONS, require.resolve('./calc'))

  // , ret
  , start


  // , tally = function (finish, err, avg) {
  //     ret.push(avg)
  //     if (ret.length == CHILDREN) {
  //       let pi  = ret.reduce(function (a, b) { return a + b }) / ret.length
  //         , end = +new Date()
  //       console.log('π ≈', pi, '\t(' + Math.abs(pi - Math.PI), 'away from actual!)')
  //       console.log('took', end - start, 'milliseconds')
  //       if (finish)
  //         finish()
  //     }
  //   }

  , endCallback = function (finish, err, response) {
      console.log({response});
      if (!response) return;

      const {blockDataHash, timestamp, nonce, difficulty, blockHash} = response;

      blockCandidate = {
        blockDataHash,
        dateCreated: timestamp,
        nonce,
        blockHash
      }

      success = {...blockCandidate};

      console.log(' *********** success recorded *********** ');
      console.log(success);
      console.log('while loop has ended');
      // workerFarm.end(workers);
      // process.exit();
      console.log('took', +new Date() - start, 'milliseconds')
      if (finish) finish();
  }

  , calc = function (method, callback) {
      start = +new Date()
      // this is our hashing loop start
      console.log('starting while loop');

      for (let nonce = 0; !success; nonce++) {
        // console.log(success);
        // if (success) break;
        const input = {
          nonce,
          blockDataHash,
          difficulty
        };

        method(input, endCallback.bind(null, callback))
      }
      console.log(success);




      // ret   = []
      // start = +new Date()
      // for (let i = 0; i < CHILDREN; i++)
      //   method(POINTS_PER_CHILD, tally.bind(null, callback))
    }

console.log('Doing it the slow (single-process) way...')
calc(calcDirect, function () {
  //reset variables
  success = false;
  blockCandidate = {
    blockDataHash,
    dateCreated: '',
    nonce: 0,
    blockHash: '',
  };
  
  console.log(`Doing it the fast (multi-process) way... (${FARM_OPTIONS.maxConcurrentWorkers} workers)`)
  calc(calcWorker, function () {
    console.log('finished multi-threaded way');
  })
})