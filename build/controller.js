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
      this.broadcast.startPeerHeartBeat();
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

      this.crdt.on('localInsert', function (chars) {
        return _this.broadcastInsertion(chars);
      });
      this.crdt.on('localDelete', function (chars) {
        return _this.broadcastDeletion(chars);
      });
      this.crdt.on('remoteInsert', function (chars, startPos, endPos, siteId) {
        return _this.insertIntoEditor(chars, startPos, endPos, siteId);
      });
      this.crdt.on('remoteDelete', function (chars, startPos, endPos, siteId) {
        return _this.deleteFromEditor(chars, startPos, endPos, siteId);
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
      this.broadcast.on('acceptConn', function (peerId, siteId) {
        return _this.syncTo(peerId, siteId);
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
    key: 'syncTo',
    value: function syncTo(peerId, siteId) {
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
      var status = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
      var broadcast = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

      if (!this.network.find(function (obj) {
        return obj.siteId === siteId;
      })) {
        var peer = {
          peerId: peerId,
          siteId: siteId,
          active: status
        };

        this.network.push(peer);

        if (status && siteId !== this.siteId) {
          this.addToListOfPeers(peerId, siteId);
        }

        if (broadcast) this.broadcast.addToNetwork(peerId, siteId);
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
      var peer = this.network[idx];

      if (idx >= 0 && peer.active) {
        peer.active = false;

        this.view.removeFromListOfPeers(peerId);
        this.editor.removeCursor(peer.siteId);
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
        return obj.peerId !== _this3.peerId && obj.active === true;
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
        _this4.addToNetwork(obj.peerId, obj.siteId, obj.active, false);
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

      this.buffer.push(operation);
      this.processBuffer();
      this.addToNetwork(operation.peerId, operation.version.siteId);
      this.broadcast.send(operation);
    }
  }, {
    key: 'processBuffer',
    value: function processBuffer() {
      var i = 0;
      var operation = void 0,
          found = void 0;

      while (i < this.buffer.length) {
        operation = this.buffer[i];

        if (operation.type === 'insert' || this.hasInsertionBeenApplied(operation)) {
          this.applyOperation(operation);
          found = true;
          this.buffer.splice(i, 1);
        } else {
          i++;
        }
      }

      if (found) this.processBuffer();
    }
  }, {
    key: 'hasInsertionBeenApplied',
    value: function hasInsertionBeenApplied(operation) {
      var isReady = true;

      for (var i = 0; i < operation.chars.length; i++) {
        var char = operation.chars[i];
        var charVersion = { siteId: char.siteId, counter: char.counter };

        if (!this.vector.hasBeenApplied(charVersion)) {
          isReady = false;
          break;
        }
      }

      return isReady;
    }
  }, {
    key: 'applyOperation',
    value: function applyOperation(operation) {
      var chars = operation.chars.map(function (char) {
        var identifiers = char.position.map(function (pos) {
          return new _identifier2.default(pos.digit, pos.siteId);
        });
        return new _char2.default(char.value, char.counter, char.siteId, identifiers);
      });

      if (operation.type === 'insert') {
        this.crdt.remoteInsert(chars);
      } else if (operation.type === 'delete') {
        this.crdt.remoteDelete(chars, operation.version.siteId);
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
    value: function broadcastInsertion(chars) {
      while (chars.length > 0) {
        var someChars = chars.splice(0, 100);

        var operation = {
          type: 'insert',
          chars: someChars,
          version: {
            siteId: someChars[0].siteId,
            counter: someChars[0].counter
          }
        };

        this.broadcast.send(operation);
      }
    }
  }, {
    key: 'broadcastDeletion',
    value: function broadcastDeletion(chars) {
      while (chars.length > 0) {
        var someChars = chars.splice(0, 100);
        this.vector.increment();

        var operation = {
          type: 'delete',
          chars: someChars,
          version: this.vector.getLocalVersion()
        };

        this.broadcast.send(operation);
      }
    }
  }, {
    key: 'insertIntoEditor',
    value: function insertIntoEditor(chars, startPos, endPos, siteId) {
      var positions = {
        from: startPos,
        to: endPos
      };

      this.editor.insertText(chars.map(function (char) {
        return char.value;
      }).join(''), positions, siteId);
    }
  }, {
    key: 'deleteFromEditor',
    value: function deleteFromEditor(chars, startPos, endPos, siteId) {
      var positions = {
        from: startPos,
        to: endPos
      };

      if (chars[chars.length - 1].value === "\n") {
        positions.to.line++;
      } else {
        positions.to.ch++;
      }

      this.editor.deleteText(chars.map(function (char) {
        return char.value;
      }).join(''), positions, siteId);
    }
  }]);

  return Controller;
}();

exports.default = Controller;