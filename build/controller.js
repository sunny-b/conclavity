'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _editor = require('./editor');

var _editor2 = _interopRequireDefault(_editor);

var _crdt = require('./crdt');

var _crdt2 = _interopRequireDefault(_crdt);

var _char = require('./char');

var _char2 = _interopRequireDefault(_char);

var _identifier = require('./identifier');

var _identifier2 = _interopRequireDefault(_identifier);

var _versionVector = require('./versionVector');

var _versionVector2 = _interopRequireDefault(_versionVector);

var _version = require('./version');

var _version2 = _interopRequireDefault(_version);

var _view = require('./view');

var _view2 = _interopRequireDefault(_view);

var _broadcast = require('./broadcast');

var _broadcast2 = _interopRequireDefault(_broadcast);

var _v = require('uuid/v1');

var _v2 = _interopRequireDefault(_v);

var _hashAlgo = require('./hashAlgo');

var _cssColors = require('./cssColors');

var _cssColors2 = _interopRequireDefault(_cssColors);

var _cursorNames = require('./cursorNames');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Controller = function () {
  function Controller(targetPeerId, host, peer, mde) {
    var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};

    _classCallCheck(this, Controller);

    this.siteId = (0, _v2.default)();
    this.options = options;
    this.host = host;
    this.buffer = [];
    this.network = [];
    this.urlId = targetPeerId;
    this.refreshId = null;

    this.editor = new _editor2.default(mde, this.siteId);
    this.view = new _view2.default(options);
    this.broadcast = new _broadcast2.default(targetPeerId, peer, this.siteId);
    this.vector = new _versionVector2.default(this.siteId);
    this.crdt = new _crdt2.default(this.siteId, this.vector);
  }

  _createClass(Controller, [{
    key: 'init',
    value: function init() {
      this.view.bindViewEvents();
      this.editor.bindButtons(this.urlId);
      this.generateOwnName();
      if (this.urlId == 0) this.view.enableEditor();
      this.bindEmitterEvents();
    }
  }, {
    key: 'bindEmitterEvents',
    value: function bindEmitterEvents() {
      var _this = this;

      this.editor.on('userInsert', function (chars, startPos) {
        return _this.handleLocalInsert(chars, startPos);
      });
      this.editor.on('userDelete', function (startPos, endPos) {
        return _this.handleLocalDelete(startPos, endPos);
      });
      this.editor.on('userUpload', function (text, startPos) {
        return _this.handleUpload(text, startPos);
      });

      this.crdt.on('localInsert', function (char, version) {
        return _this.broadcastInsertion(char, version);
      });
      this.crdt.on('localDelete', function (char, version) {
        return _this.broadcastDeletion(char, version);
      });
      this.crdt.on('remoteInsert', function (val, pos, siteId) {
        return _this.insertIntoEditor(val, pos, siteId);
      });
      this.crdt.on('remoteDelete', function (val, pos, siteId) {
        return _this.deleteFromEditor(val, pos, siteId);
      });

      this.view.on('answerCall', function (callObj, ms) {
        return _this.broadcast.answerCall(callObj, ms);
      });
      this.view.on('videoCall', function (peerId, ms) {
        return _this.broadcast.videoCall(peerId, ms);
      });

      this.broadcast.on('sync', function (dataObj) {
        return _this.handleSync(dataObj);
      });
      this.broadcast.on('sendSync', function (peerId, siteId) {
        return _this.handleSendSync(peerId, siteId);
      });
      this.broadcast.on('addToNetwork', function (peerId, siteId) {
        return _this.addToNetwork(peerId, siteId);
      });
      this.broadcast.on('removeFromNetwork', function (peerId) {
        return _this.removeFromNetwork(peerId);
      });
      this.broadcast.on('serverOpen', function (id) {
        return _this.handleServerOpen(id);
      });
      this.broadcast.on('serverError', function () {
        return _this.view.displayServerError();
      });
      this.broadcast.on('peerError', function () {
        return _this.handleError();
      });
      this.broadcast.on('wrongBrowser', function () {
        return _this.view.displayWrongBrowser();
      });
      this.broadcast.on('remoteOperation', function (dataObj) {
        return _this.handleRemoteOperation(dataObj);
      });
      this.broadcast.on('peerClose', function (peerId) {
        return _this.handlePeerClose(peerId);
      });
      this.broadcast.on('videoCall', function (callObj) {
        return _this.view.videoCall(callObj);
      });
      this.broadcast.on('videoStream', function (stream, callObj) {
        return _this.view.streamVideo(stream, callObj);
      });
      this.broadcast.on('streamClose', function (peerId) {
        return _this.view.closeVideo(peerId);
      });
      this.broadcast.on('findNewTarget', function () {
        return _this.findNewTarget();
      });
      this.broadcast.on('redistribute', function (peerId, siteId) {
        return _this.handleRedistribute(peerId, siteId);
      });
    }
  }, {
    key: 'generateOwnName',
    value: function generateOwnName() {
      var color = (0, _hashAlgo.generateItemFromHash)(this.siteId, _cssColors2.default);
      var name = (0, _hashAlgo.generateItemFromHash)(this.siteId, _cursorNames.ANIMALS);

      this.view.makeOwnName(name, color);
    }
  }, {
    key: 'handleServerOpen',
    value: function handleServerOpen(id) {
      this.peerId = id;
      this.view.updateShareLink(id, this.host);
    }
  }, {
    key: 'handleUpload',
    value: function handleUpload(text, startPos) {
      this.handleLocalInsert(text, startPos);
      this.editor.replaceText(this.crdt.toText());
    }
  }, {
    key: 'handleError',
    value: function handleError() {
      if (!this.broadcast.peer.disconnected) {
        this.findNewTarget();
      }

      this.view.enableEditor();
    }
  }, {
    key: 'handleRedistribute',
    value: function handleRedistribute(peerId, siteId) {
      var halfTheNetwork = Math.ceil(this.network.length / 2);

      this.broadcast.redistribute(peerId, siteId, halfTheNetwork);
    }
  }, {
    key: 'handlePeerClose',
    value: function handlePeerClose(peerId) {
      if (peerId == this.refreshId) {
        var randId = this.broadcast.randomId();
        if (randId && this.options.changeUrl) {
          this.createNewUrl(randId);
        }
      }

      this.removeFromNetwork(peerId);
    }
  }, {
    key: 'handleSendSync',
    value: function handleSendSync(peerId, siteId) {
      var initialData = JSON.stringify({
        type: 'sync',
        siteId: this.siteId,
        peerId: this.peerId,
        initialStruct: this.crdt.retrieveStruct(),
        initialVersions: this.vector.getAllVersions(),
        network: this.network
      });

      this.addToNetwork(peerId, siteId);
      this.broadcast.syncTo(peerId, initialData);
    }
  }, {
    key: 'lostConnection',
    value: function lostConnection() {
      console.log('disconnected');
    }
  }, {
    key: 'createNewUrl',
    value: function createNewUrl(id) {
      if (id) {
        this.refreshId = id;
      }
      this.view.updateUrl(this.refreshId, this.host);
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
      this.editor.replaceText(this.crdt.toText());
    }
  }, {
    key: 'populateVersionVector',
    value: function populateVersionVector(initialVersions) {
      var _this2 = this;

      var versions = initialVersions.map(function (ver) {
        var version = new _version2.default(ver.siteId);
        version.counter = ver.counter;
        ver.exceptions.forEach(function (ex) {
          return version.exceptions.push(ex);
        });
        return version;
      });

      versions.forEach(function (version) {
        return _this2.vector.versions.push(version);
      });
    }
  }, {
    key: 'addToNetwork',
    value: function addToNetwork(peerId, siteId) {
      if (!this.network.find(function (obj) {
        return obj.siteId === siteId;
      })) {
        this.network.push({ peerId: peerId, siteId: siteId });
        if (siteId !== this.siteId) {
          this.addToListOfPeers(peerId, siteId);
        }

        this.broadcast.addToNetwork(peerId, siteId);
      }
    }
  }, {
    key: 'addRemoteCursor',
    value: function addRemoteCursor(siteId) {
      this.editor.addRemoteCursor(siteId);
    }
  }, {
    key: 'removeFromNetwork',
    value: function removeFromNetwork(peerId) {
      var peerObj = this.network.find(function (obj) {
        return obj.peerId === peerId;
      });
      var idx = this.network.indexOf(peerObj);

      if (idx >= 0) {
        var deletedObj = this.network.splice(idx, 1)[0];
        this.view.removeFromListOfPeers(peerId);
        this.editor.removeCursor(deletedObj.siteId);
        this.broadcast.removeFromNetwork(peerId);
      }
    }
  }, {
    key: 'removeRemoteCursor',
    value: function removeRemoteCursor(siteId) {
      this.editor.removeRemoteCursor(siteId);
    }
  }, {
    key: 'addToListOfPeers',
    value: function addToListOfPeers(peerId, siteId) {
      var color = (0, _hashAlgo.generateItemFromHash)(siteId, _cssColors2.default);
      var name = void 0;

      if (siteId.match(/bot/)) {
        name = (0, _hashAlgo.generateItemFromHash)(siteId, _cursorNames.BOTS);
      } else {
        name = (0, _hashAlgo.generateItemFromHash)(siteId, _cursorNames.ANIMALS);
      }

      this.view.addToListOfPeers(peerId, color, name);
    }
  }, {
    key: 'findNewTarget',
    value: function findNewTarget() {
      var _this3 = this;

      var connected = this.broadcast.retrieveConnections();
      var unconnected = this.network.filter(function (obj) {
        return connected.indexOf(obj.peerId) === -1;
      });

      var possibleTargets = unconnected.filter(function (obj) {
        return obj.peerId !== _this3.peerId;
      });

      if (possibleTargets.length === 0 && this.options.changeUrl) {
        this.broadcast.addConnectionCallback(function (conn) {
          return _this3.createNewUrl(conn.peer);
        });
      } else {
        var randomIdx = Math.floor(Math.random() * possibleTargets.length);
        var newTarget = possibleTargets[randomIdx].peerId;
        this.broadcast.requestConnection(newTarget, this.peerId, this.siteId);
      }
    }
  }, {
    key: 'handleSync',
    value: function handleSync(syncObj) {
      var _this4 = this;

      if (syncObj.peerId != this.urlId && this.options.changeUrl) {
        this.createNewUrl(syncObj.peerId);
      }

      syncObj.network.forEach(function (obj) {
        return _this4.addToNetwork(obj.peerId, obj.siteId);
      });

      if (this.crdt.totalChars() === 0) {
        this.populateCRDT(syncObj.initialStruct);
        this.populateVersionVector(syncObj.initialVersions);
      }
      this.view.enableEditor();

      this.syncEnd(syncObj.peerId);
    }
  }, {
    key: 'syncEnd',
    value: function syncEnd(peerId) {
      var operation = JSON.stringify({
        type: 'syncEnd',
        peerId: this.broadcast.peer.id
      });

      this.broadcast.sendSyncEnd(peerId, operation);
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
      this.broadcast.send(operation);
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
    key: 'applyOperation',
    value: function applyOperation(operation) {
      var char = operation.char;
      var identifiers = char.position.map(function (pos) {
        return new _identifier2.default(pos.digit, pos.siteId);
      });
      var newChar = new _char2.default(char.value, char.counter, char.siteId, identifiers);

      if (operation.type === 'insert') {
        this.crdt.remoteInsert(newChar);
      } else if (operation.type === 'delete') {
        this.crdt.remoteDelete(newChar, operation.version.siteId);
      }

      this.vector.update(operation.version);
    }
  }, {
    key: 'handleLocalDelete',
    value: function handleLocalDelete(startPos, endPos) {
      this.crdt.localDelete(startPos, endPos);
    }
  }, {
    key: 'handleLocalInsert',
    value: function handleLocalInsert(chars, startPos) {
      this.crdt.localInsert(chars, startPos);
    }
  }, {
    key: 'broadcastInsertion',
    value: function broadcastInsertion(char, version) {
      var operation = {
        type: 'insert',
        char: char,
        version: version
      };

      this.broadcast.send(operation);
    }
  }, {
    key: 'broadcastDeletion',
    value: function broadcastDeletion(char, version) {
      var operation = {
        type: 'delete',
        char: char,
        version: version
      };

      this.broadcast.send(operation);
    }
  }, {
    key: 'insertIntoEditor',
    value: function insertIntoEditor(value, pos, siteId) {
      var positions = {
        from: {
          line: pos.line,
          ch: pos.ch
        },
        to: {
          line: pos.line,
          ch: pos.ch
        }
      };

      this.editor.insertText(value, positions, siteId);
    }
  }, {
    key: 'deleteFromEditor',
    value: function deleteFromEditor(value, pos, siteId) {
      var positions = void 0;

      if (value === "\n") {
        positions = {
          from: {
            line: pos.line,
            ch: pos.ch
          },
          to: {
            line: pos.line + 1,
            ch: 0
          }
        };
      } else {
        positions = {
          from: {
            line: pos.line,
            ch: pos.ch
          },
          to: {
            line: pos.line,
            ch: pos.ch + 1
          }
        };
      }

      this.editor.deleteText(value, positions, siteId);
    }
  }]);

  return Controller;
}();

exports.default = Controller;