'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _featherIcons = require('feather-icons');

var _featherIcons2 = _interopRequireDefault(_featherIcons);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _detectrtc = require('detectrtc');

var _detectrtc2 = _interopRequireDefault(_detectrtc);

var _jquery = require('jquery');

var _jquery2 = _interopRequireDefault(_jquery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var View = function (_EventEmitter) {
  _inherits(View, _EventEmitter);

  function View(options) {
    _classCallCheck(this, View);

    var _this = _possibleConstructorReturn(this, (View.__proto__ || Object.getPrototypeOf(View)).call(this));

    _this.options = options;
    _this.icons = _featherIcons2.default.icons;
    _this.calling = [];
    return _this;
  }

  _createClass(View, [{
    key: 'enableEditor',
    value: function enableEditor() {
      document.getElementById('conclave').classList.remove('hide');
    }
  }, {
    key: 'copyToClipboard',
    value: function copyToClipboard(element) {
      var $temp = (0, _jquery2.default)("<input>");
      (0, _jquery2.default)("body").append($temp);
      $temp.val((0, _jquery2.default)(element).text()).select();
      document.execCommand("copy");
      $temp.remove();

      this.showCopiedStatus();
    }
  }, {
    key: 'showCopiedStatus',
    value: function showCopiedStatus() {
      (0, _jquery2.default)('.copy-status').addClass('copied');

      setTimeout(function () {
        return (0, _jquery2.default)('.copy-status').removeClass('copied');
      }, 1000);
    }
  }, {
    key: 'displayWrongBrowser',
    value: function displayWrongBrowser() {
      alert('This browser is incompatible with WebRTC.\n      Please user a newest version of Chrome/Firefox.');
    }
  }, {
    key: 'displayServerError',
    value: function displayServerError() {
      document.querySelector('.server-error').classList.remove('disappear');
    }
  }, {
    key: 'updateShareLink',
    value: function updateShareLink(id, host) {
      var shareLink = host + '?' + id;
      var aTag = document.querySelector('#myLink');
      var pTag = document.querySelector('#myLinkInput');

      aTag.setAttribute('href', shareLink);
      pTag.textContent = shareLink;
    }
  }, {
    key: 'updateUrl',
    value: function updateUrl(id, host) {
      var newURL = host + '?' + id;
      window.history.pushState({}, '', newURL);
    }
  }, {
    key: 'getPeerElemById',
    value: function getPeerElemById(peerId) {
      return document.getElementById(peerId);
    }
  }, {
    key: 'getPeerFlagById',
    value: function getPeerFlagById(peerId) {
      return document.getElementById(peerId).children[0];
    }
  }, {
    key: 'addBeingCalledClass',
    value: function addBeingCalledClass(peerId) {
      var peerLi = document.getElementById(peerId);

      peerLi.classList.add('beingCalled');
    }
  }, {
    key: 'addCallingClass',
    value: function addCallingClass(peerId) {
      var peerLi = document.getElementById(peerId);

      peerLi.classList.add('calling');
    }
  }, {
    key: 'makeOwnName',
    value: function makeOwnName(name, color) {
      var $listItem = (0, _jquery2.default)('<li></li>');
      var $node = (0, _jquery2.default)('<span></span>');

      $node.text(name);
      $node.css('background-color', color);
      $node.addClass('peer');

      $listItem.append($node, '(You)');
      (0, _jquery2.default)('#peerId').append($listItem);
    }
  }, {
    key: 'addToListOfPeers',
    value: function addToListOfPeers(peerId, color, name) {
      var $listItem = (0, _jquery2.default)('<li></li>');
      var $node = (0, _jquery2.default)('<span></span>');

      $node.text(name);
      $node.css('background-color', color);
      $node.addClass('peer');

      if (this.options.video) this.attachVideoEvent(peerId, $listItem.get(0));

      $listItem.attr('id', peerId);
      $listItem.append($node);
      (0, _jquery2.default)('#peerId').append($listItem);

      if (this.options.icons) {
        var phone = this.icons.phone.toSvg({ class: 'phone' });
        var phoneIn = this.icons['phone-incoming'].toSvg({ class: 'phone-in' });
        var phoneOut = this.icons['phone-outgoing'].toSvg({ class: 'phone-out' });
        var phoneCall = this.icons['phone-call'].toSvg({ class: 'phone-call' });

        $listItem.append(phone, phoneIn, phoneOut, phoneCall);
      }
    }
  }, {
    key: 'removeFromListOfPeers',
    value: function removeFromListOfPeers(peerId) {
      document.getElementById(peerId).remove();
    }
  }, {
    key: 'bindViewEvents',
    value: function bindViewEvents() {
      this.addIcons();
      this.bindCopyEvent();
      this.attachModalEvents();
      this.checkBrowser();

      if (this.options.errorMessage) {
        this.attachErrorMessage();
      }
    }
  }, {
    key: 'checkBrowser',
    value: function checkBrowser() {
      if (!_detectrtc2.default.isWebRTCSupported) {
        this.displayWrongBrowser();
      }
    }
  }, {
    key: 'attachErrorMessage',
    value: function attachErrorMessage() {
      var $errMsg = (0, _jquery2.default)('<div class="server-error disappear">\n        <p>Lost connection. Don\'t panic, you can still talk to peers. Please refresh to reconnect.</p>\n        <span class="x">\n          ' + this.icons.x.toSvg({ class: 'server-msg-x', 'stroke-width': 2, color: 'black' }) + '\n        </span>\n      </div>');

      (0, _jquery2.default)('.textarea').append($errMsg);
      (0, _jquery2.default)('.server-msg-x').click(function () {
        return (0, _jquery2.default)('.server-error').addClass('disappear');
      });
    }
  }, {
    key: 'bindCopyEvent',
    value: function bindCopyEvent() {
      var _this2 = this;

      (0, _jquery2.default)('.copy-container').click(function () {
        return _this2.copyToClipboard('#myLinkInput');
      });
    }
  }, {
    key: 'addIcons',
    value: function addIcons() {
      var whiteMinimize = this.icons.minus.toSvg({ 'stroke-width': 2, color: 'white', class: 'minimize' });
      var exit = this.icons.x.toSvg({ 'stroke-width': 2, color: 'white', class: 'exit' });
      var copy = this.icons.copy.toSvg({ color: 'rgb(17, 117, 232)', class: 'copy-link' });

      (0, _jquery2.default)('.video-bar').append(whiteMinimize, exit);
      (0, _jquery2.default)('.copy-container').append(copy);

      if (this.options.showPeers) {
        var blueMinimize = this.icons['minus-circle'].toSvg({ 'stroke-width': 2, color: 'rgb(17, 117, 232)', class: 'toggle-minus' });
        var bluePlus = this.icons['plus-circle'].toSvg({ 'stroke-width': 2, color: 'rgb(17, 117, 232)', class: 'toggle-plus' });
        (0, _jquery2.default)('.peer-toggle').append(blueMinimize, bluePlus);
        this.attachPeerListEvents();
      }
    }
  }, {
    key: 'answerCall',
    value: function answerCall(peerId) {
      var peerLi = document.getElementById(peerId);

      if (peerLi) {
        peerLi.classList.remove('calling');
        peerLi.classList.remove('beingCalled');
        peerLi.classList.add('answered');
      }
    }
  }, {
    key: 'videoCall',
    value: function videoCall(callObj) {
      var _this3 = this;

      var peerFlag = this.getPeerElemById(callObj.peer);
      this.addBeingCalledClass(callObj.peer);

      navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (ms) {
        peerFlag.onclick = function () {
          _this3.answerCall(callObj.peer);
          _this3.emit('answerCall', callObj, ms);
        };
      });
    }
  }, {
    key: 'streamVideo',
    value: function streamVideo(stream, callObj) {
      var peerFlag = this.getPeerFlagById(callObj.peer);
      var peerClone = peerFlag.cloneNode(true);
      var color = peerFlag.style.backgroundColor;
      var modal = document.querySelector('.video-modal');
      var vidContainer = document.querySelector('.video-container');
      var bar = document.querySelector('.video-bar');
      var vid = document.querySelector('.video-modal video');

      this.answerCall(callObj.peer);
      peerClone.style.backgroundColor = peerClone.style.backgroundColor.replace('0.5', '1');

      modal.classList.remove('hide');
      bar.style.backgroundColor = color.replace("0.5", "1");
      vidContainer.appendChild(peerClone);
      vid.srcObject = stream;
      vid.play();

      this.bindVideoEvents(callObj);
    }
  }, {
    key: 'attachVideoEvent',
    value: function attachVideoEvent(peerId, node) {
      var _this4 = this;

      node.onclick = function () {
        if (!_this4.calling.includes(peerId)) {
          navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(function (ms) {
            _this4.addCallingClass(peerId);
            _this4.calling.push(peerId);
            _this4.emit('videoCall', peerId, ms);
          });
        }
      };
    }
  }, {
    key: 'closeVideo',
    value: function closeVideo(peerId) {
      var modal = document.querySelector('.video-modal');
      var peerLi = this.getPeerElemById(peerId);

      modal.classList.add('hide');
      peerLi.classList.remove('answered', 'calling', 'beingCalled');
      this.calling = this.calling.filter(function (id) {
        return id !== peerId;
      });
      document.querySelector('.video-container span').remove();

      this.attachVideoEvent(peerId, peerLi);
    }
  }, {
    key: 'bindVideoEvents',
    value: function bindVideoEvents(callObj) {
      var exit = document.querySelector('.exit');
      var minimize = document.querySelector('.minimize');
      var modal = document.querySelector('.video-modal');
      var bar = document.querySelector('.video-bar');
      var vid = document.querySelector('.video-modal .video-container');

      minimize.onclick = function () {
        bar.classList.toggle('mini');
        vid.classList.toggle('hide');
      };
      exit.onclick = function () {
        modal.classList.add('hide');
        callObj.close();
      };
    }
  }, {
    key: 'attachPeerListEvents',
    value: function attachPeerListEvents() {
      (0, _jquery2.default)('.peer-toggle').click(function (e) {
        (0, _jquery2.default)('.peer-toggle').toggleClass('show');
        (0, _jquery2.default)('#peerId').toggleClass('disappear');
      });
    }
  }, {
    key: 'attachModalEvents',
    value: function attachModalEvents() {
      var xPos = 0;
      var yPos = 0;
      var modal = document.querySelector('.video-modal');
      var dragModal = function dragModal(e) {
        xPos = e.clientX - modal.offsetLeft;
        yPos = e.clientY - modal.offsetTop;
        window.addEventListener('mousemove', modalMove, true);
      };
      var setModal = function setModal() {
        window.removeEventListener('mousemove', modalMove, true);
      };
      var modalMove = function modalMove(e) {
        modal.style.position = 'absolute';
        modal.style.top = e.clientY - yPos + 'px';
        modal.style.left = e.clientX - xPos + 'px';
      };

      document.querySelector('.video-modal').addEventListener('mousedown', dragModal, false);
      window.addEventListener('mouseup', setModal, false);
    }
  }]);

  return View;
}(_eventemitter2.default);

exports.default = View;