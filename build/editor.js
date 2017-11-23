'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _crdt = require('./crdt');

var _crdt2 = _interopRequireDefault(_crdt);

var _remoteCursor = require('./remoteCursor');

var _remoteCursor2 = _interopRequireDefault(_remoteCursor);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _cssColors = require('./cssColors');

var _cssColors2 = _interopRequireDefault(_cssColors);

var _cursorNames = require('./cursorNames');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Editor = function (_EventEmitter) {
  _inherits(Editor, _EventEmitter);

  function Editor(mde, siteId) {
    _classCallCheck(this, Editor);

    var _this = _possibleConstructorReturn(this, (Editor.__proto__ || Object.getPrototypeOf(Editor)).call(this));

    _this.mde = mde;
    _this.remoteCursors = {};

    _this.customTabBehavior();
    _this.bindChangeEvent();
    return _this;
  }

  _createClass(Editor, [{
    key: 'customTabBehavior',
    value: function customTabBehavior() {
      this.mde.codemirror.setOption("extraKeys", {
        Tab: function Tab(codemirror) {
          codemirror.replaceSelection("\t");
        }
      });
    }
  }, {
    key: 'bindButtons',
    value: function bindButtons(peerId) {
      if (peerId == 0) {
        this.bindUploadButton();
      } else {
        this.hideUploadButton();
      }

      this.bindDownloadButton();
    }
  }, {
    key: 'bindDownloadButton',
    value: function bindDownloadButton() {
      var _this2 = this;

      var dlButton = document.querySelector('#download');

      dlButton.onclick = function () {
        var textToSave = _this2.mde.value();
        var textAsBlob = new Blob([textToSave], { type: "text/plain" });
        var textAsURL = window.URL.createObjectURL(textAsBlob);
        var fileName = "Conclave-" + Date.now();
        var downloadLink = document.createElement("a");

        downloadLink.download = fileName;
        downloadLink.innerHTML = "Download File";
        downloadLink.href = textAsURL;
        downloadLink.onclick = _this2.afterDownload;
        downloadLink.style.display = "none";

        document.body.appendChild(downloadLink);
        downloadLink.click();
      };
    }
  }, {
    key: 'afterDownload',
    value: function afterDownload(e) {
      var doc = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : document;

      doc.body.removeChild(e.target);
    }
  }, {
    key: 'hideUploadButton',
    value: function hideUploadButton() {
      var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;

      var ulButton = doc.querySelector('#upload');
      var fileInput = doc.querySelector('#file');
      ulButton.style.display = 'none';
      fileInput.style.display = 'none';
    }
  }, {
    key: 'bindUploadButton',
    value: function bindUploadButton() {
      var _this3 = this;

      var doc = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : document;

      var fileSelect = doc.querySelector('#file');
      fileSelect.onchange = function () {
        var file = doc.querySelector("#file").files[0];
        var fileReader = new FileReader();

        fileReader.onload = function (e) {
          var fileText = e.target.result;
          _this3.emit('userUpload', fileText, { line: 0, ch: 0 });
          _this3.hideUploadButton();
        };
        fileReader.readAsText(file, "UTF-8");
      };
    }
  }, {
    key: 'bindChangeEvent',
    value: function bindChangeEvent() {
      var _this4 = this;

      this.mde.codemirror.on("change", function (_, changeObj) {
        if (changeObj.origin === "setValue") return;
        if (changeObj.origin === "insertText") return;
        if (changeObj.origin === "deleteText") return;

        switch (changeObj.origin) {
          case 'redo':
          case 'undo':
            _this4.processUndoRedo(changeObj);
            break;
          case '+input':
          case 'paste':
            _this4.processInsert(changeObj);
            break;
          case '+delete':
          case 'cut':
            _this4.processDelete(changeObj);
            break;
          default:
            throw new Error("Unknown operation attempted in editor.");
        }
      });
    }
  }, {
    key: 'processInsert',
    value: function processInsert(changeObj) {
      var chars = this.extractChars(changeObj.text);
      var startPos = changeObj.from;

      this.updateRemoteCursorsInsert(chars, changeObj.to);
      this.emit('userInsert', chars, startPos);
    }
  }, {
    key: 'processDelete',
    value: function processDelete(changeObj) {
      var startPos = changeObj.from;
      var endPos = changeObj.to;
      var chars = this.extractChars(changeObj.removed);

      this.updateRemoteCursorsDelete(chars, changeObj.to, changeObj.from);
      this.emit('userDelete', startPos, endPos);
    }
  }, {
    key: 'processUndoRedo',
    value: function processUndoRedo(changeObj) {
      if (changeObj.removed[0].length > 0) {
        this.processDelete(changeObj);
      } else {
        this.processInsert(changeObj);
      }
    }
  }, {
    key: 'extractChars',
    value: function extractChars(text) {
      if (text[0] === '' && text[1] === '' && text.length === 2) {
        return '\n';
      } else {
        return text.join("\n");
      }
    }
  }, {
    key: 'replaceText',
    value: function replaceText(text) {
      var cursor = this.mde.codemirror.getCursor();
      this.mde.value(text);
      this.mde.codemirror.setCursor(cursor);
    }
  }, {
    key: 'insertText',
    value: function insertText(value, positions, siteId) {
      var localCursor = this.mde.codemirror.getCursor();
      var delta = this.generateDeltaFromChars(value);

      this.mde.codemirror.replaceRange(value, positions.from, positions.to, 'insertText');
      this.updateRemoteCursorsInsert(positions.to, siteId);
      this.updateRemoteCursor(positions.to, siteId, 'insert', value);

      if (localCursor.line > positions.to.line) {
        localCursor.line += delta.line;
      } else if (localCursor.line === positions.to.line && localCursor.ch > positions.to.ch) {
        if (delta.line > 0) {
          localCursor.line += delta.line;
          localCursor.ch -= positions.to.ch;
        }

        localCursor.ch += delta.ch;
      }

      this.mde.codemirror.setCursor(localCursor);
    }
  }, {
    key: 'removeCursor',
    value: function removeCursor(siteId) {
      var remoteCursor = this.remoteCursors[siteId];

      if (remoteCursor) {
        remoteCursor.detach();

        delete this.remoteCursors[siteId];
      }
    }
  }, {
    key: 'updateRemoteCursorsInsert',
    value: function updateRemoteCursorsInsert(chars, position, siteId) {
      var positionDelta = this.generateDeltaFromChars(chars);

      for (var cursorSiteId in this.remoteCursors) {
        if (cursorSiteId === siteId) continue;
        var remoteCursor = this.remoteCursors[cursorSiteId];
        var newPosition = Object.assign({}, remoteCursor.lastPosition);

        if (newPosition.line > position.line) {
          newPosition.line += positionDelta.line;
        } else if (newPosition.line === position.line && newPosition.ch > position.ch) {
          if (positionDelta.line > 0) {
            newPosition.line += positionDelta.line;
            newPosition.ch -= position.ch;
          }

          newPosition.ch += positionDelta.ch;
        }

        remoteCursor.set(newPosition);
      }
    }
  }, {
    key: 'updateRemoteCursorsDelete',
    value: function updateRemoteCursorsDelete(chars, to, from, siteId) {
      var positionDelta = this.generateDeltaFromChars(chars);

      for (var cursorSiteId in this.remoteCursors) {
        if (cursorSiteId === siteId) continue;
        var remoteCursor = this.remoteCursors[cursorSiteId];
        var newPosition = Object.assign({}, remoteCursor.lastPosition);

        if (newPosition.line > to.line) {
          newPosition.line -= positionDelta.line;
        } else if (newPosition.line === to.line && newPosition.ch > to.ch) {
          if (positionDelta.line > 0) {
            newPosition.line -= positionDelta.line;
            newPosition.ch += from.ch;
          }

          newPosition.ch -= positionDelta.ch;
        }

        remoteCursor.set(newPosition);
      }
    }
  }, {
    key: 'updateRemoteCursor',
    value: function updateRemoteCursor(position, siteId, opType, value) {
      var remoteCursor = this.remoteCursors[siteId];
      var clonedPosition = Object.assign({}, position);

      if (opType === 'insert') {
        if (value === '\n') {
          clonedPosition.line++;
          clonedPosition.ch = 0;
        } else {
          clonedPosition.ch++;
        }
      } else {
        clonedPosition.ch--;
      }

      if (remoteCursor) {
        remoteCursor.set(clonedPosition);
      } else {
        this.remoteCursors[siteId] = new _remoteCursor2.default(this.mde, siteId, clonedPosition);
      }
    }
  }, {
    key: 'deleteText',
    value: function deleteText(value, positions, siteId) {
      var localCursor = this.mde.codemirror.getCursor();
      var delta = this.generateDeltaFromChars(value);

      this.mde.codemirror.replaceRange("", positions.from, positions.to, 'deleteText');
      this.updateRemoteCursorsDelete(positions.to, siteId);
      this.updateRemoteCursor(positions.to, siteId, 'delete');

      if (localCursor.line > positions.to.line) {
        localCursor.line -= delta.line;
      } else if (localCursor.line === positions.to.line && localCursor.ch > positions.to.ch) {
        if (delta.line > 0) {
          localCursor.line -= delta.line;
          localCursor.ch += positions.from.ch;
        }

        localCursor.ch -= delta.ch;
      }

      this.mde.codemirror.setCursor(localCursor);
    }
  }, {
    key: 'generateDeltaFromChars',
    value: function generateDeltaFromChars(chars) {
      var delta = { line: 0, ch: 0 };
      var counter = 0;

      while (counter < chars.length) {
        if (chars[counter] === '\n') {
          delta.line++;
          delta.ch = 0;
        } else {
          delta.ch++;
        }

        counter++;
      }

      return delta;
    }
  }]);

  return Editor;
}(_eventemitter2.default);

exports.default = Editor;