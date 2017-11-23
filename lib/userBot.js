import CRDT from './crdt';
import VersionVector from './versionVector';
import Version from './version';
import Peer from 'peerjs';
import Broadcast from './broadcast';
import Identifier from './identifier';
import Char from './char';
import EventEmitter from 'eventemitter3'
import UUID from 'uuid/v1';

class UserBot extends EventEmitter {
  constructor(peerId, targetPeerId, siteId, script, mde) {
    super();
    this.siteId = siteId;
    this.peer = new Peer(peerId, {
  			host: location.hostname,
  			port: location.port || (location.protocol === 'https:' ? 443 : 80),
  			path: '/peerjs',
  			debug: 3
  		});
    this.vector = new VersionVector(this.siteId);
    this.crdt = new CRDT(this.siteId, this.vector);
    this.buffer = [];
    this.mde = mde;
    this.script = script;

    this.crdt.on('localInsert', (char, version) => this.broadcastInsertion(char, version));
    this.crdt.on('localDelete', (char, version) => this.broadcastDeletion(char, version));

    if (this.peer.open) {
      this.connectToUser(targetPeerId);
      this.onConnection();
    } else {
      this.peer.on('open', () => {
        this.connectToUser(targetPeerId);
        this.onConnection();
      });
    }

  }

  connectToUser(targetPeerId) {
    this.connection = this.peer.connect(targetPeerId);

    this.connection.on('open', () => {
      const addToMessage = JSON.stringify({
        type: "connRequest",
        peerId: this.peer.id,
        siteId: this.siteId
      });

      this.connection.send(addToMessage);
    });
  }

  runScript(interval) {
    this.counter = 0;
    this.line = this.line || 0;
    this.ch = this.ch || 0;

    this.intervalId = setInterval(() => {
      let index = this.counter;
      let val = this.script[this.counter++];
      let pos = { line: this.line, ch: this.ch };
      this.ch++

      if (!val) {
        clearInterval(this.intervalId);
        return;
      } else if (val === '\n') {
        this.line++;
        this.ch = 0;
      }

      this.crdt.localInsert(val, pos);
    }, interval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.counter = 0;
    this.line = 0;
    this.ch = 0
    this.peer.destroy();
  }

  onConnection() {
    this.peer.on('connection', connection => {
      connection.on('data', data => {
        const dataObj = JSON.parse(data);

        switch(dataObj.type) {
          case 'sync':
            this.sync(dataObj);
            break;
          default:
            this.handleRemoteOperation(dataObj);
        }
      });
    });
  }

  sync(syncObj) {
    this.populateCRDT(syncObj.initialStruct);
    this.populateVersionVector(syncObj.initialVersions);
    this.syncEnd();
  }

  syncEnd() {
    const lastLine = this.crdt.struct.length - 1;

    this.emit('syncEnd', lastLine);
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

  handleRemoteOperation(operation) {
    if (this.vector.hasBeenApplied(operation.version)) return;

    if (operation.type === 'insert') {
      this.applyOperation(operation);
    } else if (operation.type === 'delete') {
      this.buffer.push(operation);
    }

    this.processDeletionBuffer();
  }

  applyOperation(operation) {
    const char = operation.char;
    const identifiers = char.position.map(pos => new Identifier(pos.digit, pos.siteId));
    const newChar = new Char(char.value, char.counter, char.siteId, identifiers);
    const charPos = this.crdt.findPosition(newChar);

    if (operation.type === 'insert') {
      this.crdt.remoteInsert(newChar);
    } else if (operation.type === 'delete') {
      this.crdt.remoteDelete(newChar, operation.version.siteId);
    }

    this.adjustCurrentPosition(newChar, charPos, operation.type);
    this.vector.update(operation.version);
  }

  adjustCurrentPosition(newChar, charPos, type) {
    if (newChar.value === '\n') {
      if (charPos.line < this.line) {
        if (type === 'insert') {
          this.line++
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

  broadcastInsertion(char, version) {
    const operation = JSON.stringify({
      type: 'insert',
      char: char,
      version: version
    });

    if (this.connection.open) {
      this.connection.send(operation);
    } else {
      this.connection.on('open', () => {
        this.connection.send(operation);
      });
    }
  }

  broadcastDeletion(char, version) {
    const operation = JSON.stringify({
      type: 'delete',
      char: char,
      version: version
    });

    if (this.connection.open) {
      this.connection.send(operation);
    } else {
      this.connection.on('open', () => {
        this.connection.send(operation);
      });
    }
  }

  insertIntoEditor() {}
  deleteFromEditor() {}
}

export default UserBot;
