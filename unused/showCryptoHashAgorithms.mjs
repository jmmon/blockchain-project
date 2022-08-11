import crypto from "crypto";

crypto.getHashes().forEach(hash => {
 console.log(hash);
});