'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _peerjs_fork_firefox = require('peerjs_fork_firefox40');

var _peerjs_fork_firefox2 = _interopRequireDefault(_peerjs_fork_firefox);

var _simplemde = require('simplemde');

var _simplemde2 = _interopRequireDefault(_simplemde);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

var _controller = require('./build/controller');

var _controller2 = _interopRequireDefault(_controller);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Conclave = function () {
  function Conclave(options) {
    _classCallCheck(this, Conclave);

    var defaults = {
      peerId: null,
      peer: null,
      shareLink: true,
      icons: true,
      video: true,
      changeUrl: true,
      errorMessage: true,
      showPeers: true,
      peersLeft: true,
      placeholder: 'Share the link to invite collaborators to your room'
    };
    options = Object.assign(defaults, options);

    this.generateConclaveEditor(options);
    this.initializeController(options);
  }

  _createClass(Conclave, [{
    key: 'generateConclaveEditor',
    value: function generateConclaveEditor(options) {
      var editorHTMLStr = '<div class="text-wrapper">\n                          <div id="peerId">\n                            <p class=\'no-margin-bottom\'>Peers:</p>\n                          </div>\n                          <div class="editor">\n                            <div class="header">\n                              <div class="peer-toggle show"></div>\n                              <p class=\'share-link hide\'>\n                                <a id=\'myLink\' target="_blank">Public Share Link</a>\n                                <span id="myLinkInput" class="disappear aside"></span>\n                                <span class="copy-container" data-tooltip="Copy to Clipboard"></span>\n                                <span class="copy-status">Copied!</span>\n                              </p>\n                              <div class="buttons">\n                                <button id="download" type="button">Save</button>\n                                <label id="upload" for="file">Upload</label>\n                                <input id="file" type="file" accept=".txt, .js, .rb, .md, .pug, .py"/>\n                              </div>\n                            </div>\n                            <div class="textarea">\n                              <textarea row="10" col="20"></textarea>\n                            </div>\n                          </div>\n                        </div>\n                        <div class="video-modal hide">\n                          <div class="video-bar"></div>\n                          <div class="video-container">\n                            <video></video>\n                          </div>\n                        </div>';

      var $editor = (0, _jquery2.default)(editorHTMLStr);
      (0, _jquery2.default)('#conclave').append($editor).addClass('hide');
      if (options.shareLink) (0, _jquery2.default)('.share-link').removeClass('hide');
      if (!options.peersLeft) (0, _jquery2.default)('.text-wrapper').addClass('reverse');
      if (!options.showPeers) (0, _jquery2.default)('#peerId').addClass('disappear');
    }
  }, {
    key: 'initializeController',
    value: function initializeController(options) {
      var peerOptions = [{
        host: 'conclavepeerjs.herokuapp.com',
        port: 443,
        secure: true,
        config: { 'iceServers': [{ url: 'stun:stun1.l.google.com:19302' }, { url: 'turn:numb.viagenie.ca',
            credential: 'conclave-rulez',
            username: 'sunnysurvies@gmail.com'
          }]
        },
        debug: 1
      }];

      if (options.peerId) peerOptions.unshift(options.peerId);

      var peer = options.peer || new (Function.prototype.bind.apply(_peerjs_fork_firefox2.default, [null].concat(peerOptions)))();

      var locale = !!location.origin.match(/file:\/\//) ? location.href.split('?')[0] : location.origin;

      this.controller = new _controller2.default(location.search.slice(1) || '0', locale, peer, new _simplemde2.default({
        placeholder: options.placeholder,
        spellChecker: false,
        toolbar: false,
        autofocus: false,
        indentWithTabs: true,
        status: false,
        tabSize: 4,
        indentUnit: 4,
        lineWrapping: false,
        shortCuts: []
      }), options);

      this.controller.init();
    }
  }]);

  return Conclave;
}();

exports.default = Conclave;
