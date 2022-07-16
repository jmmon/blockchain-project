const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
	const blockchain = req.app.get('blockchain');
	
});


module.exports = router;