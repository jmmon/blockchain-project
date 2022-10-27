console.log('client js is connected!');
const jCaptcha = require('js-captcha');

const formEl = document.querySelector('form');

const maxCaptchaAttempts = 5;
const myCaptcha = new jCaptcha({
	el: '.jCaptcha',
	canvasClass: 'jCaptchaCanvas',
	canvasStyle: {
		width: 100,
		height: 15,
		textBaseline: 'top',
		font: '15px Arial',
		textAlign: 'left',
		fillStyle: '#ddd',
	},
	// set callback function
	callback: (response, $captchaInputElement, numberOfTries) => {
		if (maxCaptchaAttempts === numberOfTries) {
			// max attempts reached, do something
			// e.g. disable form
			document.getElementById('submitBtn').disabled = true;
			$captchaInputElement.classList.add('disabled');
			$captchaInputElement.placeholder = 'Maximum attempts reached!';
			$captchaInputElement.disabled = true;

			return;
		}

		if (response == 'success') {
			$captchaInputElement.classList.remove('error');
			$captchaInputElement.classList.add('success');
			$captchaInputElement.placeholder = 'Submit Successful!';

			console.log('success, attempting fetch');
			// continue with submit
			formEl.submit();
		}

		if (response == 'error') {
			$captchaInputElement.classList.remove('success');
			$captchaInputElement.classList.add('error');
			$captchaInputElement.placeholder = 'Please try again!';
		}
	},
});

function formSubmit(e) {
	e.preventDefault();
	myCaptcha.validate();
}

formEl.addEventListener('submit', formSubmit);