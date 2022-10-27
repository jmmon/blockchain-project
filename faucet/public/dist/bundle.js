(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
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
},{"js-captcha":2}],2:[function(require,module,exports){
(function (root, factory) {
  if (root === undefined && window !== undefined) root = window;
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module unless amdModuleId is set
    define([], function () {
      return (root['jCaptcha'] = factory());
    });
  } else if (typeof module === 'object' && module.exports) {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    root['jCaptcha'] = factory();
  }
}(this, function () {

"use strict";

{
  var generateRandomNum = function generateRandomNum() {
    num1 = Math.round(Math.random() * 8) + 1;
    num2 = Math.round(Math.random() * 8) + 1;
    sumNum = num1 + num2;
  };
  /**
   * @param {Object}
   * @param {Object}
   * @param {Boolean}
  */


  var setCaptcha = function setCaptcha($el, options, shouldReset) {
    if (!shouldReset) {
      $el.insertAdjacentHTML('beforebegin', "<canvas class=\"".concat(options.canvasClass, "\"\n                    width=\"").concat(options.canvasStyle.width, "\" height=\"").concat(options.canvasStyle.height, "\">\n                </canvas>\n            "));
      this.$captchaEl = document.querySelector(".".concat(options.canvasClass));
      this.$captchaTextContext = this.$captchaEl.getContext('2d');
      this.$captchaTextContext = Object.assign(this.$captchaTextContext, options.canvasStyle);
    }

    this.$captchaTextContext.clearRect(0, 0, options.canvasStyle.width, options.canvasStyle.height);
    this.$captchaTextContext.fillText("".concat(num1, " + ").concat(num2, " ").concat(options.requiredValue), 0, 0);
  };
  /**
   * @param {Object}
  */


  var jCaptcha = function jCaptcha() {
    var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    this.options = Object.assign({}, {
      el: '.jCaptcha',
      canvasClass: 'jCaptchaCanvas',
      requiredValue: '*',
      resetOnError: true,
      focusOnError: true,
      clearOnSubmit: true,
      callback: null,
      canvasStyle: {}
    }, options);

    this._init();
  };

  var sumNum, num1, num2;
  var numberOfTries = 0;
  ;
  jCaptcha.prototype = {
    _init: function _init() {
      this.$el = document.querySelector(this.options.el);
      generateRandomNum();
      setCaptcha.call(this, this.$el, this.options);
    },
    validate: function validate() {
      numberOfTries++;
      this.callbackReceived = this.callbackReceived || typeof this.options.callback == 'function';

      if (this.$el.value != sumNum) {
        this.callbackReceived && this.options.callback('error', this.$el, numberOfTries);
        this.options.resetOnError === true && this.reset();
        this.options.focusOnError === true && this.$el.focus();
        this.options.clearOnSubmit === true && (this.$el.value = '');
      } else {
        this.callbackReceived && this.options.callback('success', this.$el, numberOfTries);
        this.options.clearOnSubmit === true && (this.$el.value = '');
      }
    },
    reset: function reset() {
      generateRandomNum();
      setCaptcha.call(this, this.$el, this.options, true);
    }
  };
}

return jCaptcha;

}));

},{}]},{},[1]);
