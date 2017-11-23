'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _crdt = require('./crdt');

var _crdt2 = _interopRequireDefault(_crdt);

var _versionVector = require('./versionVector');

var _versionVector2 = _interopRequireDefault(_versionVector);

var _version = require('./version');

var _version2 = _interopRequireDefault(_version);

var _peerjs = require('peerjs');

var _peerjs2 = _interopRequireDefault(_peerjs);

var _broadcast = require('./broadcast');

var _broadcast2 = _interopRequireDefault(_broadcast);

var _identifier = require('./identifier');

var _identifier2 = _interopRequireDefault(_identifier);

var _char = require('./char');

var _char2 = _interopRequireDefault(_char);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

var _v = require('uuid/v1');

var _v2 = _interopRequireDefault(_v);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var UserBot = function (_EventEmitter) {
  _inherits(UserBot, _EventEmitter);

  function UserBot(peerId, targetPeerId, siteId, script, mde) {
    _classCallCheck(this, UserBot);

    var _this = _possibleConstructorReturn(this, (UserBot.__proto__ || Object.getPrototypeOf(UserBot)).call(this));

    _this.siteId = siteId;
    _this.peer = new _peerjs2.default(peerId, {
      host: location.hostname,
      port: location.port || (location.protocol === 'https:' ? 443 : 80),
      path: '/peerjs',
      debug: 3
    });
    _this.vector = new _versionVector2.default(_this.siteId);
    _this.crdt = new _crdt2.default(_this.siteId, _this.vector);
    _this.buffer = [];
    _this.mde = mde;
    _this.script = script;

    _this.crdt.on('localInsert', function (char, version) {
      return _this.broadcastInsertion(char, version);
    });
    _this.crdt.on('localDelete', function (char, version) {
      return _this.broadcastDeletion(char, version);
    });

    if (_this.peer.open) {
      _this.connectToUser(targetPeerId);
      _this.onConnection();
    } else {
      _this.peer.on('open', function () {
        _this.connectToUser(targetPeerId);
        _this.onConnection();
      });
    }

    return _this;
  }

  _createClass(UserBot, [{
    key: 'connectToUser',
    value: function connectToUser(targetPeerId) {
      var _this2 = this;

      this.connection = this.peer.connect(targetPeerId);

      this.connection.on('open', function () {
        var addToMessage = JSON.stringify({
          type: "connRequest",
          peerId: _this2.peer.id,
          siteId: _this2.siteId
        });

        _this2.connection.send(addToMessage);
      });
    }
  }, {
    key: 'runScript',
    value: function runScript(interval) {
      var _this3 = this;

      this.counter = 0;
      this.line = this.line || 0;
      this.ch = this.ch || 0;

      this.intervalId = setInterval(function () {
        var index = _this3.counter;
        var val = _this3.script[_this3.counter++];
        var pos = { line: _this3.line, ch: _this3.ch };
        _this3.ch++;

        if (!val) {
          clearInterval(_this3.intervalId);
          return;
        } else if (val === '\n') {
          _this3.line++;
          _this3.ch = 0;
        }

        _this3.crdt.localInsert(val, pos);
      }, interval);
    }
  }, {
    key: 'stop',
    value: function stop() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
      }

      this.counter = 0;
      this.line = 0;
      this.ch = 0;
      this.peer.destroy();
    }
  }, {
    key: 'onConnection',
    value: function onConnection() {
      var _this4 = this;

      this.peer.on('connection', function (connection) {
        connection.on('data', function (data) {
          var dataObj = JSON.parse(data);

          switch (dataObj.type) {
            case 'sync':
              _this4.sync(dataObj);
              break;
            default:
              _this4.handleRemoteOperation(dataObj);
          }
        });
      });
    }
  }, {
    key: 'sync',
    value: function sync(syncObj) {
      this.populateCRDT(syncObj.initialStruct);
      this.populateVersionVector(syncObj.initialVersions);
      this.syncEnd();
    }
  }, {
    key: 'syncEnd',
    value: function syncEnd() {
      var lastLine = this.crdt.struct.length - 1;

      this.emit('syncEnd', lastLine);
    }
  }, {
    key: 'populateCRDT',
    value: function populateCRDT(initialStruct) {
      var struct = initialStruct.map(function (line) {
        return line.map(function (ch) {
          return new _char2.default(ch.value, ch.counter, ch.siteId, ch.position.map(function (id) {
            return new _identifier2.default(id.digit, id.siteId);
          }));
        });
      });

      this.crdt.struct = struct;
    }
  }, {
    key: 'populateVersionVector',
    value: function populateVersionVector(initialVersions) {
      var _this5 = this;

      var versions = initialVersions.map(function (ver) {
        var version = new _version2.default(ver.siteId);
        version.counter = ver.counter;
        ver.exceptions.forEach(function (ex) {
          return version.exceptions.push(ex);
        });
        return version;
      });

      versions.forEach(function (version) {
        return _this5.vector.versions.push(version);
      });
    }
  }, {
    key: 'processDeletionBuffer',
    value: function processDeletionBuffer() {
      var i = 0;
      var deleteOperation = void 0;

      while (i < this.buffer.length) {
        deleteOperation = this.buffer[i];

        if (this.hasInsertionBeenApplied(deleteOperation)) {
          this.applyOperation(deleteOperation);
          this.buffer.splice(i, 1);
        } else {
          i++;
        }
      }
    }
  }, {
    key: 'hasInsertionBeenApplied',
    value: function hasInsertionBeenApplied(operation) {
      var charVersion = { siteId: operation.char.siteId, counter: operation.char.counter };
      return this.vector.hasBeenApplied(charVersion);
    }
  }, {
    key: 'handleRemoteOperation',
    value: function handleRemoteOperation(operation) {
      if (this.vector.hasBeenApplied(operation.version)) return;

      if (operation.type === 'insert') {
        this.applyOperation(operation);
      } else if (operation.type === 'delete') {
        this.buffer.push(operation);
      }

      this.processDeletionBuffer();
    }
  }, {
    key: 'applyOperation',
    value: function applyOperation(operation) {
      var char = operation.char;
      var identifiers = char.position.map(function (pos) {
        return new _identifier2.default(pos.digit, pos.siteId);
      });
      var newChar = new _char2.default(char.value, char.counter, char.siteId, identifiers);
      var charPos = this.crdt.findPosition(newChar);

      if (operation.type === 'insert') {
        this.crdt.remoteInsert(newChar);
      } else if (operation.type === 'delete') {
        this.crdt.remoteDelete(newChar, operation.version.siteId);
      }

      this.adjustCurrentPosition(newChar, charPos, operation.type);
      this.vector.update(operation.version);
    }
  }, {
    key: 'adjustCurrentPosition',
    value: function adjustCurrentPosition(newChar, charPos, type) {
      if (newChar.value === '\n') {
        if (charPos.line < this.line) {
          if (type === 'insert') {
            this.line++;
          } else {
            if (charPos.line === this.line - 1) {
              this.line--;
              this.ch += charPos.ch;
            } else {
              this.line--;
            }
          }
        } else if (charPos.line === this.line && charPos.ch < this.ch) {
          this.line++;
          this.ch -= charPos.ch;
        }
      } else {
        if (charPos.line === this.line && charPos.ch < this.ch) {
          if (type === 'insert') {
            this.ch++;
          } else {
            this.ch--;
          }
        }
      }
    }
  }, {
    key: 'broadcastInsertion',
    value: function broadcastInsertion(char, version) {
      var _this6 = this;

      var operation = JSON.stringify({
        type: 'insert',
        char: char,
        version: version
      });

      if (this.connection.open) {
        this.connection.send(operation);
      } else {
        this.connection.on('open', function () {
          _this6.connection.send(operation);
        });
      }
    }
  }, {
    key: 'broadcastDeletion',
    value: function broadcastDeletion(char, version) {
      var _this7 = this;

      var operation = JSON.stringify({
        type: 'delete',
        char: char,
        version: version
      });

      if (this.connection.open) {
        this.connection.send(operation);
      } else {
        this.connection.on('open', function () {
          _this7.connection.send(operation);
        });
      }
    }
  }, {
    key: 'insertIntoEditor',
    value: function insertIntoEditor() {}
  }, {
    key: 'deleteFromEditor',
    value: function deleteFromEditor() {}
  }]);

  return UserBot;
}(_eventemitter2.default);

exports.default = UserBot;