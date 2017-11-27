import EventEmitter from 'eventemitter3';

class Broadcast extends EventEmitter {
  constructor(targetPeerId, peer, siteId) {
    super();
    this.peer = peer;
    this.outConns = [];
    this.inConns = [];
    this.outgoingBuffer = [];
    this.MAX_BUFFER_SIZE = 40;
    this.currentStream = null;

    this.onOpen(targetPeerId, siteId);
  }

  send(operation) {
    const operationJSON = JSON.stringify(operation);
    if (operation.type === 'insert' || operation.type === 'delete') {
      this.addToOutgoingBuffer(operationJSON);
    }
    this.outConns.forEach(conn => conn.send(operationJSON));
  }

  sendSyncEnd(peerId, operation) {
    let connection = this.outConns.find(conn => conn.peer === peerId);

    if (connection) {
      connection.send(operation);
    } else {
      connection = this.peer.connect(peerId);
      this.addToOutConns(connection);
      connection.on('open', () => {
        connection.send(operation);
      });
    }
  }

  addToOutgoingBuffer(operation) {
    if (this.outgoingBuffer.length >= this.MAX_BUFFER_SIZE) {
      this.outgoingBuffer.shift();
    }

    this.outgoingBuffer.push(operation);
  }

  processOutgoingBuffer(peerId) {
    const connection = this.outConns.find(conn => conn.peer === peerId);
    this.outgoingBuffer.forEach(op => {
      connection.send(op);
    });
  }

  onOpen(targetPeerId, siteId) {
    this.peer.on('open', id => {
      this.emit('serverOpen', id);
      this.onPeerConnection();
      this.onError();
      this.onDisconnect();
      if (targetPeerId == 0) {
        this.emit('addToNetwork', id, siteId)
      } else {
        this.requestConnection(targetPeerId, id, siteId)
      }
    });
  }

  onDisconnect() {
    this.peer.on('disconnected', () => {
      this.emit('serverError');
    });
  }

  onError() {
    this.peer.on("error", err => {
      switch(err.type) {
        case 'peer-unavailable':
          const pid = String(err).replace("Error: Could not connect to peer ", "");
          this.emit('peerError');
          this.removeFromConnections(pid);
          break;
        case 'disconnected':
        case 'network':
        case 'server-error':
          this.emit('serverError');
          break;
        case 'browser-incompatible':
          this.emit('wrongBrowser');
          break;
      }
    });
  }

  requestConnection(target, peerId, siteId) {
    const conn = this.peer.connect(target);
    this.addToOutConns(conn);
    conn.on('open', () => {
      conn.send(JSON.stringify({
        type: 'connRequest',
        peerId: peerId,
        siteId: siteId,
      }));
    });
  }

  redistribute(peerId, siteId, halfTheNetwork) {
    const tooManyInConns = this.inConns.length > Math.max(halfTheNetwork, 5);
    const tooManyOutConns = this.outConns.length > Math.max(halfTheNetwork, 5);

    if (tooManyInConns || tooManyOutConns) {
      this.forwardMessage(peerId, siteId);
    } else {
      this.emit('sendSync', peerId, siteId);
    }
  }

  forwardMessage(peerId, siteId) {
    const connected = this.outConns.filter(conn => conn.peer !== peerId);
    const randomIdx = Math.floor(Math.random() * connected.length);

    connected[randomIdx].send(JSON.stringify({
      type: 'connRequest',
      peerId: peerId,
      siteId: siteId,
    }));
  }

  addToOutConns(connection) {
    if (!!connection && !this.isAlreadyConnectedOut(connection)) {
      this.outConns.push(connection);
    }
  }

  addToInConns(connection) {
    if (!!connection && !this.isAlreadyConnectedIn(connection)) {
      this.inConns.push(connection);
    }
  }

  addToNetwork(peerId, siteId) {
    this.send({
      type: "add to network",
      newPeer: peerId,
      newSite: siteId
    });
  }

  removeFromNetwork(peerId) {
    this.send({
      type: "remove from network",
      oldPeer: peerId
    });

    this.emit('removeFromNetwork', peerId);
  }

  removeFromConnections(peer) {
    this.inConns = this.inConns.filter(conn => conn.peer !== peer);
    this.outConns = this.outConns.filter(conn => conn.peer !== peer);
    this.removeFromNetwork(peer);
  }

  isAlreadyConnectedOut(connection) {
    if (connection.peer) {
      return !!this.outConns.find(conn => conn.peer === connection.peer);
    } else {
      return !!this.outConns.find(conn => conn.peer.id === connection);
    }
  }

  isAlreadyConnectedIn(connection) {
    if (connection.peer) {
      return !!this.inConns.find(conn => conn.peer === connection.peer);
    } else {
      return !!this.inConns.find(conn => conn.peer.id === connection);
    }
  }

  onPeerConnection() {
    this.peer.on('connection', (connection) => {
      this.onConnection(connection);
      this.onVideoCall(connection);
      this.onData(connection);
      this.onConnClose(connection);
    });
  }

  addConnectionCallback(callback) {
    this.peer.on('connection', callback);
  }

  syncTo(peerId, initialData) {
    const connBack = this.peer.connect(peerId);
    this.addToOutConns(connBack);

    if (connBack.open) {
      connBack.send(initialData);
    } else {
      connBack.on('open', () => {
        connBack.send(initialData);
      });
    }
  }

  videoCall(id, ms) {
    if (!this.currentStream) {
      const callObj = this.peer.call(id, ms);
      this.onStream(callObj);
    }
  }

  onConnection(connection) {
    this.addToInConns(connection);
  }

  onVideoCall() {
    this.peer.on('call', callObj => {
      this.emit('videoCall', callObj);
    });
  }

  answerCall(callObj, ms) {
    if (!this.currentStream) {
      callObj.answer(ms);
      this.onStream(callObj);
    }
  }

  onStream(callObj) {
    callObj.on('stream', stream => {
      if (this.currentStream) { this.currentStream.close(); }
      this.currentStream = callObj;

      this.emit('videoStream', stream, callObj);

      callObj.on('close', () => this.onStreamClose(callObj.peer))
    });
  }

  onStreamClose(peerId) {
    this.currentStream.localStream.getTracks().forEach(track => track.stop());
    this.currentStream = null;

    this.emit('streamClose', peerId);
  }

  onData(connection) {
    connection.on('data', data => {
      const dataObj = JSON.parse(data);

      switch(dataObj.type) {
        case 'connRequest':
          this.emit('redistribute', dataObj.peerId, dataObj.siteId);
          break;
        case 'sync':
          this.processOutgoingBuffer(dataObj.peerId);
          this.emit('sync', dataObj);
          break;
        case 'syncEnd':
          this.processOutgoingBuffer(dataObj.peerId);
          break;
        case 'add to network':
          this.emit('addToNetwork', dataObj.newPeer, dataObj.newSite);
          break;
        case 'remove from network':
          this.emit('removeFromNetwork', dataObj.oldPeer);
          break;
        default:
          this.emit('remoteOperation', dataObj);
      }
    });
  }

  randomId() {
    const possConns = this.inConns.filter(conn => {
      return this.peer.id !== conn.peer;
    });
    const randomIdx = Math.floor(Math.random() * possConns.length);
    if (possConns[randomIdx]) {
      return possConns[randomIdx].peer;
    } else {
      return false;
    }
  }

  retrieveConnections() {
    return this.outConns.map(conn => conn.peer);
  }

  onConnClose(connection) {
    connection.on('close', () => {
      this.removeFromConnections(connection.peer);
      this.emit('peerClose', connection.peer, this.randomId());

      if (this.inConns.length < 5 || this.outConns.length < 5) {
        this.emit('findNewTarget');
      }
    });
  }
}

export default Broadcast;
