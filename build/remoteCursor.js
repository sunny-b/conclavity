'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _cssColors = require('./cssColors');

var _cssColors2 = _interopRequireDefault(_cssColors);

var _hashAlgo = require('./hashAlgo');

var _cursorNames = require('./cursorNames');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var RemoteCursor = function () {
  function RemoteCursor(mde, siteId, position) {
    _classCallCheck(this, RemoteCursor);

    this.mde = mde;
    var name = void 0;
    if (siteId.match(/bot/)) {
      name = (0, _hashAlgo.generateItemFromHash)(siteId, _cursorNames.BOTS);
    } else {
      name = (0, _hashAlgo.generateItemFromHash)(siteId, _cursorNames.ANIMALS);
    }
    var color = (0, _hashAlgo.generateItemFromHash)(siteId, _cssColors2.default);

    this.createCursor(color);
    this.createFlag(color, name);

    this.cursor.appendChild(this.flag);
    this.set(position);
  }

  _createClass(RemoteCursor, [{
    key: 'createCursor',
    value: function createCursor(color) {
      var textHeight = this.mde.codemirror.defaultTextHeight();

      this.cursor = document.createElement('div');
      this.cursor.classList.add('remote-cursor');
      this.cursor.style.backgroundColor = color;
      this.cursor.style.height = textHeight + 'px';
    }
  }, {
    key: 'createFlag',
    value: function createFlag(color, name) {
      var cursorName = document.createTextNode(name);

      this.flag = document.createElement('span');
      this.flag.classList.add('flag');
      this.flag.style.backgroundColor = color;
      this.flag.appendChild(cursorName);
    }
  }, {
    key: 'set',
    value: function set(position) {
      this.detach();

      var coords = this.mde.codemirror.cursorCoords(position, 'local');
      this.cursor.style.left = (coords.left >= 0 ? coords.left : 0) + 'px';
      this.mde.codemirror.getDoc().setBookmark(position, { widget: this.cursor });
      this.lastPosition = position;
    }
  }, {
    key: 'detach',
    value: function detach() {
      if (this.cursor.parentElement) {
        this.cursor.parentElement.remove();
      }
    }
  }]);

  return RemoteCursor;
}();

exports.default = RemoteCursor;