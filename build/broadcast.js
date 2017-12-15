'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Broadcast = function (_EventEmitter) {
  _inherits(Broadcast, _EventEmitter);

  function Broadcast(targetPeerId, peer, siteId) {
    _classCallCheck(this, Broadcast);

    var _this = _possibleConstructorReturn(this, (Broadcast.__proto__ || Object.getPrototypeOf(Broadcast)).call(this));

    _this.peer = peer;
    _this.siteId = siteId;
    _this.outConns = [];
    _this.inConns = [];
    _this.outgoingBuffer = [];
    _this.MAX_BUFFER_SIZE = 40;
    _this.MAX_CONNECTIONS = 5;
    _this.currentStream = null;

    _this.init(targetPeerId, siteId);
    return _this;
  }

  _createClass(Broadcast, [{
    key: 'init',
    value: function init(targetPeerId, siteId) {
      this.onOpen(targetPeerId, siteId);
    }
  }, {
    key: 'startPeerHeartBeat',
    value: function startPeerHeartBeat() {
      var _this2 = this;

      var timeoutId = 0;
      var heartbeat = function heartbeat() {
        timeoutId = setTimeout(heartbeat, 20000);
        if (_this2.peer.socket._wsOpen()) {
          _this2.peer.socket.send({ type: 'HEARTBEAT' });
        }
      };

      heartbeat();

      this.heartbeat = {
        start: function start() {
          if (timeoutId === 0) {
            heartbeat();
          }
        },
        stop: function stop() {
          clearTimeout(timeoutId);
          timeoutId = 0;
        }
      };
    }
  }, {
    key: 'send',
    value: function send(operation) {
      var operationJSON = JSON.stringify(operation);
      if (operation.type === 'insert' || operation.type === 'delete') {
        this.addToOutgoingBuffer(operationJSON);
      }
      this.outConns.forEach(function (conn) {
        return conn.send(operationJSON);
      });
    }
  }, {
    key: 'sendSyncEnd',
    value: function sendSyncEnd(peerId, operation) {
      var connection = this.outConns.find(function (conn) {
        return conn.peer === peerId;
      });

      if (connection) {
        connection.send(operation);
      } else {
        connection = this.peer.connect(peerId);
        this.addToOutConns(connection);
        connection.on('open', function () {
          connection.send(operation);
        });
      }
    }
  }, {
    key: 'addToOutgoingBuffer',
    value: function addToOutgoingBuffer(operation) {
      if (this.outgoingBuffer.length >= this.MAX_BUFFER_SIZE) {
        this.outgoingBuffer.shift();
      }

      this.outgoingBuffer.push(operation);
    }
  }, {
    key: 'processOutgoingBuffer',
    value: function processOutgoingBuffer(peerId) {
      var connection = this.outConns.find(function (conn) {
        return conn.peer === peerId;
      });
      this.outgoingBuffer.forEach(function (op) {
        connection.send(op);
      });
    }
  }, {
    key: 'onOpen',
    value: function onOpen(targetPeerId, siteId) {
      var _this3 = this;

      this.peer.on('open', function (id) {
        _this3.emit('serverOpen', id);
        _this3.onPeerConnection();
        _this3.onError();
        _this3.onDisconnect();
        if (targetPeerId == 0) {
          _this3.emit('addToNetwork', id, siteId);
        } else {
          _this3.requestConnection(targetPeerId, id, siteId);
        }
      });
    }
  }, {
    key: 'onDisconnect',
    value: function onDisconnect() {
      var _this4 = this;

      this.peer.on('disconnected', function () {
        _this4.emit('serverError');
      });
    }
  }, {
    key: 'onError',
    value: function onError() {
      var _this5 = this;

      this.peer.on("error", function (err) {
        switch (err.type) {
          case 'peer-unavailable':
            var pid = String(err).replace("Error: Could not connect to peer ", "");
            _this5.emit('peerError');
            _this5.removeFromConnections(pid);
            break;
          case 'disconnected':
          case 'network':
          case 'server-error':
            _this5.emit('serverError');
            break;
          case 'browser-incompatible':
            _this5.emit('wrongBrowser');
            break;
        }
      });
    }
  }, {
    key: 'requestConnection',
    value: function requestConnection(target, peerId, siteId) {
      var conn = this.peer.connect(target);
      this.addToOutConns(conn);
      conn.on('open', function () {
        conn.send(JSON.stringify({
          type: 'connRequest',
          peerId: peerId,
          siteId: siteId
        }));
      });
    }
  }, {
    key: 'redistribute',
    value: function redistribute(peerId, siteId, halfTheNetwork) {
      var tooManyInConns = this.inConns.length > Math.max(halfTheNetwork, 5);
      var tooManyOutConns = this.outConns.length > Math.max(halfTheNetwork, 5);

      if (tooManyInConns || tooManyOutConns) {
        this.forwardMessage(peerId, siteId);
      } else {
        this.emit('sendSync', peerId, siteId);
      }
    }
  }, {
    key: 'forwardMessage',
    value: function forwardMessage(peerId, siteId) {
      var connected = this.outConns.filter(function (conn) {
        return conn.peer !== peerId;
      });
      var randomIdx = Math.floor(Math.random() * connected.length);

      connected[randomIdx].send(JSON.stringify({
        type: 'connRequest',
        peerId: peerId,
        siteId: siteId
      }));
    }
  }, {
    key: 'addToOutConns',
    value: function addToOutConns(connection) {
      if (!!connection && !this.isAlreadyConnectedOut(connection)) {
        this.outConns.push(connection);
      }
    }
  }, {
    key: 'addToInConns',
    value: function addToInConns(connection) {
      if (!!connection && !this.isAlreadyConnectedIn(connection)) {
        this.inConns.push(connection);
      }
    }
  }, {
    key: 'addToNetwork',
    value: function addToNetwork(peerId, siteId) {
      this.send({
        type: "addToNetwork",
        newPeer: peerId,
        newSite: siteId
      });
    }
  }, {
    key: 'removeFromNetwork',
    value: function removeFromNetwork(peerId) {
      this.send({
        type: "removeFromNetwork",
        oldPeer: peerId
      });

      this.emit('removeFromNetwork', peerId);
    }
  }, {
    key: 'removeFromConnections',
    value: function removeFromConnections(peer) {
      this.inConns = this.inConns.filter(function (conn) {
        return conn.peer !== peer;
      });
      this.outConns = this.outConns.filter(function (conn) {
        return conn.peer !== peer;
      });
      this.removeFromNetwork(peer);
    }
  }, {
    key: 'isAlreadyConnectedOut',
    value: function isAlreadyConnectedOut(connection) {
      if (connection.peer) {
        return !!this.outConns.find(function (conn) {
          return conn.peer === connection.peer;
        });
      } else {
        return !!this.outConns.find(function (conn) {
          return conn.peer.id === connection;
        });
      }
    }
  }, {
    key: 'isAlreadyConnectedIn',
    value: function isAlreadyConnectedIn(connection) {
      if (connection.peer) {
        return !!this.inConns.find(function (conn) {
          return conn.peer === connection.peer;
        });
      } else {
        return !!this.inConns.find(function (conn) {
          return conn.peer.id === connection;
        });
      }
    }
  }, {
    key: 'evaluateRequest',
    value: function evaluateRequest(peerId, siteId) {
      if (this.hasReachedMax()) {
        this.forwardRequest(peerId, siteId);
      } else {
        this.emit('acceptConn', peerId, siteId);
      }
    }
  }, {
    key: 'evaluateSecondary',
    value: function evaluateSecondary(peerId, siteId) {
      if (this.hasReachedMax()) {
        this.forwardSecondary(peerId, siteId);
      } else {
        this.acceptSecondary(peerId, siteId);
      }
    }
  }, {
    key: 'acceptSecondary',
    value: function acceptSecondary(peerId, siteId) {
      var connBack = this.peer.connect(peerId);
      this.addToOutConns(connBack);
      this.emit('addToNetwork', peerId, siteId);
    }
  }, {
    key: 'forwardSecondaryRequest',
    value: function forwardSecondaryRequest(peerId, siteId) {
      var connected = this.outConns.filter(function (conn) {
        return conn.peer !== peerId;
      });
      var randomIdx = Math.floor(Math.random() * connected.length);
      connected[randomIdx].send(JSON.stringify({
        type: 'secondaryRequest',
        peerId: peerId,
        siteId: siteId
      }));
    }
  }, {
    key: 'findSecondary',
    value: function findSecondary(network) {
      var _this6 = this;

      if (network.length === 2) return;

      var filteredNetwork = network.filter(function (conn) {
        return conn.peerId !== _this6.peer.id;
      });
      var secondaryConn = filteredNetwork[filteredNetwork.length - 1];
      this.requestSecondaryConnection(secondaryConn.peerId, this.peer.id, this.siteId);
    }
  }, {
    key: 'requestSecondaryConnection',
    value: function requestSecondaryConnection(target, peerId, siteId) {
      var conn = this.peer.connect(target);
      this.addToOutConns(conn);
      conn.on('open', function () {
        conn.send(JSON.stringify({
          type: 'secondaryRequest',
          peerId: peerId,
          siteId: siteId
        }));
      });
    }
  }, {
    key: 'hasReachedMax',
    value: function hasReachedMax() {
      return this.outConns.length >= this.MAX_CONNECTIONS;
    }
  }, {
    key: 'forwardRequest',
    value: function forwardRequest(peerId, siteId) {
      var connected = this.outConns.filter(function (conn) {
        return conn.peer !== peerId;
      });
      var randomIdx = Math.floor(Math.random() * connected.length);
      connected[randomIdx].send(JSON.stringify({
        type: 'connRequest',
        peerId: peerId,
        siteId: siteId
      }));
    }
  }, {
    key: 'onPeerConnection',
    value: function onPeerConnection() {
      var _this7 = this;

      this.peer.on('connection', function (connection) {
        _this7.onConnection(connection);
        _this7.onVideoCall(connection);
        _this7.onData(connection);
        _this7.onConnClose(connection);
      });
    }
  }, {
    key: 'addConnectionCallback',
    value: function addConnectionCallback(callback) {
      this.peer.on('connection', callback);
    }
  }, {
    key: 'syncTo',
    value: function syncTo(peerId, initialData) {
      var connBack = this.peer.connect(peerId);
      this.addToOutConns(connBack);

      if (connBack.open) {
        connBack.send(initialData);
      } else {
        connBack.on('open', function () {
          connBack.send(initialData);
        });
      }
    }
  }, {
    key: 'videoCall',
    value: function videoCall(id, ms) {
      if (!this.currentStream) {
        var callObj = this.peer.call(id, ms);
        this.onStream(callObj);
      }
    }
  }, {
    key: 'onConnection',
    value: function onConnection(connection) {
      this.addToInConns(connection);
    }
  }, {
    key: 'onVideoCall',
    value: function onVideoCall() {
      var _this8 = this;

      this.peer.on('call', function (callObj) {
        _this8.emit('videoCall', callObj);
      });
    }
  }, {
    key: 'answerCall',
    value: function answerCall(callObj, ms) {
      if (!this.currentStream) {
        callObj.answer(ms);
        this.onStream(callObj);
      }
    }
  }, {
    key: 'onStream',
    value: function onStream(callObj) {
      var _this9 = this;

      callObj.on('stream', function (stream) {
        if (_this9.currentStream) {
          _this9.currentStream.close();
        }
        _this9.currentStream = callObj;

        _this9.emit('videoStream', stream, callObj);

        callObj.on('close', function () {
          return _this9.onStreamClose(callObj.peer);
        });
      });
    }
  }, {
    key: 'onStreamClose',
    value: function onStreamClose(peerId) {
      this.currentStream.localStream.getTracks().forEach(function (track) {
        return track.stop();
      });
      this.currentStream = null;

      this.emit('streamClose', peerId);
    }
  }, {
    key: 'onData',
    value: function onData(connection) {
      var _this10 = this;

      connection.on('data', function (data) {
        var dataObj = JSON.parse(data);

        switch (dataObj.type) {
          case 'connRequest':
            _this10.evaluateRequest(dataObj.peerId, dataObj.siteId);
            break;
          case 'secondaryRequest':
            _this10.evaluateSecondary(dataObj.peerId, dataObj.siteId);
            break;
          case 'sync':
            _this10.processOutgoingBuffer(dataObj.peerId);
            _this10.findSecondary(dataObj.network);
            _this10.emit('sync', dataObj);
            break;
          case 'syncEnd':
            _this10.processOutgoingBuffer(dataObj.peerId);
            break;
          case 'addToNetwork':
            _this10.emit('addToNetwork', dataObj.newPeer, dataObj.newSite);
            break;
          case 'removeFromNetwork':
            _this10.emit('removeFromNetwork', dataObj.oldPeer);
            break;
          default:
            _this10.emit('remoteOperation', dataObj);
        }
      });
    }
  }, {
    key: 'randomId',
    value: function randomId() {
      var _this11 = this;

      var possConns = this.inConns.filter(function (conn) {
        return _this11.peer.id !== conn.peer;
      });
      var randomIdx = Math.floor(Math.random() * possConns.length);
      if (possConns[randomIdx]) {
        return possConns[randomIdx].peer;
      } else {
        return false;
      }
    }
  }, {
    key: 'retrieveConnections',
    value: function retrieveConnections() {
      return this.outConns.map(function (conn) {
        return conn.peer;
      });
    }
  }, {
    key: 'onConnClose',
    value: function onConnClose(connection) {
      var _this12 = this;

      connection.on('close', function () {
        _this12.removeFromConnections(connection.peer);
        _this12.emit('peerClose', connection.peer, _this12.randomId());

        if (_this12.inConns.length < 5 || _this12.outConns.length < 5) {
          _this12.emit('findNewTarget');
        }
      });
    }
  }]);

  return Broadcast;
}(_eventemitter2.default);

exports.default = Broadcast;