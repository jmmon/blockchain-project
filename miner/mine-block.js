/* 
This should run the mining function, validate the hash, and return false or the hash ( i think ).
So should take the current nonce, the data, and then should be able to perform the hash and return the value


I guess the main function should just loop indefinitely, starting service workers. Once a service worker finds the correct validated hash, it should end the main thread loop  and end all service workers.
*/


module.exports = function (points, callback) {
  let inside = 0
    , i = points

  while (i--)
    if (Math.pow(Math.random(), 2) + Math.pow(Math.random(), 2) <= 1)
      inside++

  callback(null, (inside / points) * 4)
}