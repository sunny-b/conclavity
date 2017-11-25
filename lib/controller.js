import Editor from './editor';
import CRDT from './crdt';
import Char from './char';
import Identifier from './identifier';
import VersionVector from './versionVector';
import Version from './version';
import View from './view';
import Broadcast from './broadcast';
import UUID from 'uuid/v1';
import { generateItemFromHash } from './hashAlgo';
import CSS_COLORS from './cssColors';
import { ANIMALS, BOTS } from './cursorNames';

class Controller {
  constructor(targetPeerId, host, peer, mde, options={}) {
    this.siteId = UUID();
    this.options = options;
    this.host = host;
    this.buffer = [];
    this.network = [];
    this.urlId = targetPeerId;
    this.refreshId = null;

    this.editor = new Editor(mde, this.siteId);
    this.view = new View(options);
    this.broadcast = new Broadcast(targetPeerId, peer, this.siteId);
    this.vector = new VersionVector(this.siteId);
    this.crdt = new CRDT(this.siteId, this.vector);
  }

  init() {
    this.view.bindViewEvents();
    this.editor.bindButtons(this.urlId);
    this.generateOwnName();
    if (this.urlId == 0) this.view.enableEditor();
    this.bindEmitterEvents();
  }

  bindEmitterEvents() {
    this.editor.on('userInsert', (chars, startPos) => this.handleLocalInsert(chars, startPos));
    this.editor.on('userDelete', (startPos, endPos) => this.handleLocalDelete(startPos, endPos));
    this.editor.on('userUpload', (text, startPos) => this.handleUpload(text, startPos));

    this.crdt.on('localInsert', (char, version) => this.broadcastInsertion(char, version));
    this.crdt.on('localDelete', (char, version) => this.broadcastDeletion(char, version));
    this.crdt.on('remoteInsert', (val, pos, siteId) => this.insertIntoEditor(val, pos, siteId));
    this.crdt.on('remoteDelete', (val, pos, siteId) => this.deleteFromEditor(val, pos, siteId));

    this.view.on('answerCall', (callObj, ms) => this.broadcast.answerCall(callObj, ms));
    this.view.on('videoCall', (peerId, ms) => this.broadcast.videoCall(peerId, ms));

    this.broadcast.on('sync', dataObj => this.handleSync(dataObj));
    this.broadcast.on('sendSync', (peerId, siteId) => this.handleSendSync(peerId, siteId));
    this.broadcast.on('addToNetwork', (peerId, siteId) => this.addToNetwork(peerId, siteId));
    this.broadcast.on('removeFromNetwork', peerId => this.removeFromNetwork(peerId));
    this.broadcast.on('serverOpen', id => this.handleServerOpen(id));
    this.broadcast.on('serverError', () => this.view.displayServerError());
    this.broadcast.on('wrongBrowser', () => this.view.displayWrongBrowser());
    this.broadcast.on('remoteOperation', dataObj => this.handleRemoteOperation(dataObj));
    this.broadcast.on('peerClose', peerId => this.handlePeerClose(peerId));
    this.broadcast.on('videoCall', callObj => this.view.videoCall(callObj));
    this.broadcast.on('videoStream', (stream, callObj) => this.view.streamVideo(stream, callObj));
    this.broadcast.on('streamClose', peerId => this.view.closeVideo(peerId));
    this.broadcast.on('findNewTarget', () => this.findNewTarget());
    this.broadcast.on('redistribute', (peerId, siteId) => this.handleRedistribute(peerId, siteId));
  }

  generateOwnName() {
    const color = generateItemFromHash(this.siteId, CSS_COLORS);
    const name = generateItemFromHash(this.siteId, ANIMALS);

    this.view.makeOwnName(name, color);
  }

  handleServerOpen(id) {
    this.peerId = id;
    this.view.updateShareLink(id, this.host)
  }

  handleUpload(text, startPos) {
    this.handleLocalInsert(text, startPos);
    this.editor.replaceText(this.crdt.toText());
  }

  handleError() {
    if (!this.broadcast.peer.disconnected) {
      this.findNewTarget();
    }

    this.view.enableEditor();
  }

  handleRedistribute(peerId, siteId) {
    const halfTheNetwork = Math.ceil(this.network.length / 2);

    this.broadcast.redistribute(peerId, siteId, halfTheNetwork);
  }

  handlePeerClose(peerId) {
    if (peerId == this.refreshId) {
      const randId = this.broadcast.randomId();
      if (randId && this.options.changeUrl) { this.createNewUrl(randId); }
    }

    this.removeFromNetwork(peerId);
  }

  handleSendSync(peerId, siteId) {
    const initialData = JSON.stringify({
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

  lostConnection() {
    console.log('disconnected');
  }

  createNewUrl(id) {
    if (id) {
      this.refreshId = id;
    }
    this.view.updateUrl(this.refreshId, this.host);
  }

  populateCRDT(initialStruct) {
    const struct = initialStruct.map(line => {
      return line.map(ch => {
        return new Char(ch.value, ch.counter, ch.siteId, ch.position.map(id => {
          return new Identifier(id.digit, id.siteId);
        }));
      });
    });

    this.crdt.struct = struct;
    this.editor.replaceText(this.crdt.toText());
  }

  populateVersionVector(initialVersions) {
    const versions = initialVersions.map(ver => {
      let version = new Version(ver.siteId);
      version.counter = ver.counter;
      ver.exceptions.forEach(ex => version.exceptions.push(ex));
      return version;
    });

    versions.forEach(version => this.vector.versions.push(version));
  }

  addToNetwork(peerId, siteId) {
    if (!this.network.find(obj => obj.siteId === siteId)) {
      this.network.push({ peerId, siteId });
      if (siteId !== this.siteId) {
        this.addToListOfPeers(siteId, peerId);
      }

      this.broadcast.addToNetwork(peerId, siteId);
    }
  }

  addRemoteCursor(siteId) {
    this.editor.addRemoteCursor(siteId);
  }

  removeFromNetwork(peerId) {
    const peerObj = this.network.find(obj => obj.peerId === peerId);
    const idx = this.network.indexOf(peerObj);

    if (idx >= 0) {
      const deletedObj = this.network.splice(idx, 1)[0];
      this.view.removeFromListOfPeers(peerId);
      this.editor.removeCursor(deletedObj.siteId);
      this.broadcast.removeFromNetwork(peerId);
    }
  }

  removeRemoteCursor(siteId) {
    this.editor.removeRemoteCursor(siteId);
  }

  addToListOfPeers(siteId, peerId) {
    const color = generateItemFromHash(siteId, CSS_COLORS);
    let name;

    if (siteId.match(/bot/)) {
      name = generateItemFromHash(siteId, BOTS);
    } else {
      name = generateItemFromHash(siteId, ANIMALS);
    }

    this.view.addToListOfPeers(peerId, color, name);
  }

  findNewTarget() {
    const connected = this.broadcast.retrieveConnections();
    const unconnected = this.network.filter(obj => {
      return connected.indexOf(obj.peerId) === -1;
    });

    const possibleTargets = unconnected.filter(obj => {
      return obj.peerId !== this.peerId;
    });

    if (possibleTargets.length === 0 && this.options.changeUrl) {
        this.broadcast.addConnectionCallback((conn) => this.createNewUrl(conn.peer));
    } else {
      const randomIdx = Math.floor(Math.random() * possibleTargets.length);
      const newTarget = possibleTargets[randomIdx].peerId;
      this.broadcast.requestConnection(newTarget, this.peerId, this.siteId);
    }
  }

  handleSync(syncObj) {
    if (syncObj.peerId != this.urlId && this.options.changeUrl) {
      this.createNewUrl(syncObj.peerId);
    }

    syncObj.network.forEach(obj => this.addToNetwork(obj.peerId, obj.siteId));

    if (this.crdt.totalChars() === 0) {
      this.populateCRDT(syncObj.initialStruct);
      this.populateVersionVector(syncObj.initialVersions);
    }
    this.view.enableEditor();

    this.syncEnd(syncObj.peerId);
  }

  syncEnd(peerId) {
    const operation = JSON.stringify({
      type: 'syncEnd',
      peerId: this.broadcast.peer.id
    });

    let connection = this.broadcast.outConns.find(conn => conn.peer === peerId);

    if (connection) {
      connection.send(operation);
    } else {
      connection = this.broadcast.peer.connect(peerId);
      this.broadcast.addToOutConns(connection);
      connection.on('open', () => {
        connection.send(operation);
      });
    }
  }

  handleRemoteOperation(operation) {
    if (this.vector.hasBeenApplied(operation.version)) return;

    if (operation.type === 'insert') {
      this.applyOperation(operation);
    } else if (operation.type === 'delete') {
      this.buffer.push(operation);
    }

    this.processDeletionBuffer();
    this.broadcast.send(operation);
  }

  processDeletionBuffer() {
    let i = 0;
    let deleteOperation;

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

  hasInsertionBeenApplied(operation) {
    const charVersion = { siteId: operation.char.siteId, counter: operation.char.counter };
    return this.vector.hasBeenApplied(charVersion);
  }

  applyOperation(operation) {
    const char = operation.char;
    const identifiers = char.position.map(pos => new Identifier(pos.digit, pos.siteId));
    const newChar = new Char(char.value, char.counter, char.siteId, identifiers);

    if (operation.type === 'insert') {
      this.crdt.remoteInsert(newChar);
    } else if (operation.type === 'delete') {
      this.crdt.remoteDelete(newChar, operation.version.siteId);
    }

    this.vector.update(operation.version);
  }

  handleLocalDelete(startPos, endPos) {
    this.crdt.localDelete(startPos, endPos);
  }

  handleLocalInsert(chars, startPos) {
    this.crdt.localInsert(chars, startPos);
  }

  broadcastInsertion(char, version) {
    const operation = {
      type: 'insert',
      char: char,
      version: version
    };

    this.broadcast.send(operation);
  }

  broadcastDeletion(char, version) {
    const operation = {
      type: 'delete',
      char: char,
      version: version
    };

    this.broadcast.send(operation);
  }

  insertIntoEditor(value, pos, siteId) {
    const positions = {
      from: {
        line: pos.line,
        ch: pos.ch,
      },
      to: {
        line: pos.line,
        ch: pos.ch,
      }
    }

    this.editor.insertText(value, positions, siteId);
  }

  deleteFromEditor(value, pos, siteId) {
    let positions;

    if (value === "\n") {
      positions = {
        from: {
          line: pos.line,
          ch: pos.ch,
        },
        to: {
          line: pos.line + 1,
          ch: 0,
        }
      }
    } else {
      positions = {
        from: {
          line: pos.line,
          ch: pos.ch,
        },
        to: {
          line: pos.line,
          ch: pos.ch + 1,
        }
      }
    }

    this.editor.deleteText(value, positions, siteId);
  }
}

export default Controller;
