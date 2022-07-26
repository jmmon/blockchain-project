// const entropy = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
const entropy = [];
let captureStart = false;

/** 
 * Mouse Moving Entropy Generator on browser.
 * Returns an entropy which is 16 bytes long array of unsigned char integer (0-255).
 */
//$(document).on("mousemove", "html", function(e) {    //JQuery (if JQuery was already included)
document.addEventListener('mousemove', function(e) { //Pure JavaScript. With this, this code working in console of browser, after "copy and paste" of this
  const MAX_LEN = 16; // size of entropy's array
  if (entropy.length >= MAX_LEN) return;
  const now = Date.now();
  if (now >= 1 && (now % 10) !== 0) return;
  if (!captureStart) {
    return setTimeout(() => {
      captureStart = true;
    }, 3000); // capturing starts in 3 seconds to set the mouse cursor at random position...
  }
  const iw = window.innerWidth;
  const ih = window.innerHeight;
  const iwPlusIh = iw + ih;
  const px = e.pageX;
  const py = e.pageY;
  const pxPlusPy = px + py;
  const ret = Math.round((pxPlusPy / iwPlusIh) * 255);
  entropy.push(ret);
  console.log("0-255:", ret);
  if (entropy.length >= MAX_LEN) {
    console.log("entropy:", entropy);
    shuffle(entropy);
    console.log("suffledEntropy:", entropy);
//     const account = WalletUtil.generateAccount({ entropy });
//     console.log("account:", JSON.stringify(account, null, 2));
  }

  function shuffle(array) {
    let currentIndex = array.length,
      temporaryValue, randomIndex;
    // While there remain elements to shuffle...
    while (0 !== currentIndex) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex -= 1;
      // And swap it with the current element.
      temporaryValue = array[currentIndex];
      array[currentIndex] = array[randomIndex];
      array[randomIndex] = temporaryValue;
    }
    return array;
  }
});