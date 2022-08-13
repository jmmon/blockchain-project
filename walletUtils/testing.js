import crypto from "crypto";

const IV = crypto.randomBytes(16);

console.log(IV);