import { JSDOM } from 'jsdom';
import UUID from 'uuid/v1';
import Controller from '../lib/controller';
import Char from '../lib/char';
import Identifier from '../lib/identifier';
import { generateItemFromHash } from '../lib/hashAlgo';
import CSS_COLORS from '../lib/cssColors';
import { ANIMALS, BOTS } from '../lib/cursorNames';

describe("Controller", () => {
  const mockPeer = {
    id: 8,
    on: function() {},
    connect: () => {
      return {
        on: () => {},
        peer: {
          id: 'a'
        }
      }
    },
  };

  const mockMDE = {
    codemirror: {
      setOption: function() {},
      on: function() {}
    }
  };

  const mockOptions = {};

  const mockBroadcast = {
    bindServerEvents: function() {},
    connectToTarget: function() {},
    connectToNewTarget: function() {},
    send: function() {},
    addToNetwork: function() {},
    removeFromNetwork: function() {},
    connections: []
  };

  const mockEditor = {
    mde: mockMDE,
    bindChangeEvent: function() {},
    updateView: function(text) {},
    onDownload: function() {},
    replaceText: function() {},
    insertText: function() {},
    deleteText: function() {},
    removeCursor: function() {}
  };

  const mockView = {
    enableEditor: () => {},
    addToListOfPeers: () => {},
    removeFromListOfPeers: () => {}
  }

  const host = "https://localhost:3000";
  const siteId = UUID();
  const targetPeerId = UUID();

  describe("populateCRDT", () => {
    let controller, initialStruct, expectedStruct;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view =
      initialStruct = [
        [
          {
            position: [ {digit: 3, siteId: 4} ],
            counter: 1,
            siteId: 5,
            value: "a",
          }
        ]
      ];

      expectedStruct = [
        [new Char("a", 1, 5, [new Identifier(3, 4)])]
      ];
      spyOn(controller.editor, "replaceText");
    })

    it("sets proper value to crdt.struct", () => {
      controller.populateCRDT(initialStruct);
      expect(controller.crdt.struct).toEqual(expectedStruct);
    });

    it("calls replaceText", () => {
      controller.populateCRDT(initialStruct);
      expect(controller.editor.replaceText).toHaveBeenCalled();
    });
  });

  describe("populateVersionVector", () => {
    let controller, initialVersions;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);

      initialVersions = [{
          siteId: 2,
          counter: 1,
          exceptions: [6, 7],
        }];
    })

    it("sets counter in the version vector", () => {
      controller.populateVersionVector(initialVersions);
      expect(controller.vector.versions[1].counter).toEqual(1);
    });

    it("sets siteID in the version vector", () => {
      controller.populateVersionVector(initialVersions);
      expect(controller.vector.versions[1].siteId).toEqual(2);
    });

    it("adds exceptions to this local version", () => {
      controller.populateVersionVector(initialVersions);
      expect(controller.vector.versions[1].exceptions.length).toEqual(2);
    });
  });

  describe("addToNetwork", () => {
    const controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
    controller.network.push({ peerId: "b", siteId: '10' });
    controller.view = mockView;

    it("doesn't do anything if the id is already in the network list", () => {
      spyOn(controller.broadcast, "addToNetwork");
      controller.addToNetwork("b", '10');
      expect(controller.broadcast.addToNetwork).not.toHaveBeenCalled();
    });

    it("pushes the id into the network list", () => {
      controller.addToNetwork("a", '11');
      expect(controller.network).toContain({peerId: "a", siteId: '11', active: true});
    });

    it("calls addToListOfPeers with the id passed in if it is not its own id", () => {
      spyOn(controller, "addToListOfPeers");
      controller.addToNetwork('10', "c");
      expect(controller.addToListOfPeers).toHaveBeenCalledWith("10", "c");
    });

    it("doesn't call addToListOfPeers if its own id is passed in", () => {
      spyOn(controller, "addToListOfPeers");
      controller.addToNetwork('b', '10');
      expect(controller.addToListOfPeers).not.toHaveBeenCalled();
    });
  });

  describe("removeFromNetwork", () => {
    let controller;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.network.push({peerId: 'b', siteId: '10', active: true});
      controller.addToListOfPeers('10', "b");
    });

    it("doesn't do anything if the id isn't in the network list", () => {
      spyOn(controller.broadcast, "removeFromNetwork");
      spyOn(controller.view, "removeFromListOfPeers");
      controller.removeFromNetwork("a");
      expect(controller.broadcast.removeFromNetwork).not.toHaveBeenCalled();
      expect(controller.view.removeFromListOfPeers).not.toHaveBeenCalled();
    });

    it("turns active status to false", () => {
      controller.removeFromNetwork("b");
      expect(controller.network[0].active).toEqual(false);
    });

    it("calls removeFromListOfPeers with the id passed in", () => {
      spyOn(controller, "removeFromNetwork");
      controller.removeFromNetwork("b");
      expect(controller.removeFromNetwork).toHaveBeenCalledWith("b");
    });

    it("calls broadcast.removeFromNetwork with the id passed in", () => {
      spyOn(controller.broadcast, "removeFromNetwork");
      controller.removeFromNetwork("b");
      expect(controller.broadcast.removeFromNetwork).toHaveBeenCalledWith("b");
    });
  });

  describe("addToListOfPeers", () => {
    let controller, connList;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
    })

    it('calls addToListOfPeers on the view', () => {
      spyOn(controller.view, 'addToListOfPeers');
      const color = generateItemFromHash('10', CSS_COLORS);
      const name = generateItemFromHash('10', ANIMALS);
      controller.addToNetwork('b', '10');
      expect(controller.view.addToListOfPeers).toHaveBeenCalledWith('b', color, name);
    });
  });

  describe("removeFromListOfPeers", () => {
    let controller;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.addToListOfPeers(siteId, targetPeerId);
    });

  });

  describe("findNewTarget", () => {
    const controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
    controller.view = mockView;
    controller.editor = mockEditor;

    it("filters its own id out and throws an error if possible network list is empty", () => {
      controller.network.push(8);
      expect(controller.findNewTarget).toThrowError();
    });

    it("calls broadcast.connectToNewTarget with a random peer on the list", () => {
      controller.network.push({peerId: 'a', siteId: '10'});
      controller.network.push({peerId: 'b', siteId: '11'});
      controller.broadcast.connections = ['a', 'b'];
      spyOn(controller.broadcast, "requestConnection");
      controller.findNewTarget();

      expect(controller.broadcast.requestConnection).toHaveBeenCalled();
    });
  });

  describe("handleSync", () => {
    const controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
    controller.view = mockView;
    controller.editor = mockEditor;
    const syncObj = {
      initialStruct: [[{
        position: [ {digit: 3, siteId: 4} ],
        counter: 1,
        siteId: 5,
        value: "a"
      }, {
        position: [ {digit: 4, siteId: 5} ],
        counter: 1,
        siteId: 6,
        value: "b"
      }]],
      initialVersions: [{
        siteId: 2,
        counter: 1,
        exceptions: [6, 7],
      }],
      peerId: '7',
      siteId: '10',
      network: [
        {peerId: '1', siteId: '3'},
        {peerId: '2', siteId: '4'},
        {peerId: '3', siteId: '5'}
      ]
    };

    it("calls populateCRDT with the initial struct property", () => {
      spyOn(controller, "populateCRDT");
      controller.handleSync(syncObj);
      expect(controller.populateCRDT).toHaveBeenCalledWith([[{
            position: [ {digit: 3, siteId: 4} ],
            counter: 1,
            siteId: 5,
            value: "a"
          }, {
            position: [ {digit: 4, siteId: 5} ],
            counter: 1,
            siteId: 6,
            value: "b"
          }
      ]]);
    });

    it("calls populateVersionVector with the initial versions property", () => {
      spyOn(controller, "populateVersionVector");
      controller.handleSync(syncObj);
      expect(controller.populateVersionVector).toHaveBeenCalledWith([{
        siteId: 2,
        counter: 1,
        exceptions: [6, 7],
      }]);
    });

    it("calls addToNetwork for each id in the network property", () => {
      spyOn(controller, "addToNetwork");
      controller.handleSync(syncObj);
      expect(controller.addToNetwork).toHaveBeenCalledWith('1', '3');
      expect(controller.addToNetwork).toHaveBeenCalledWith('2', '4');
      expect(controller.addToNetwork).toHaveBeenCalledWith('3', '5');
    });
  });

  describe("handleRemoteOperation", () => {
    let controller, mockOperation;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.editor = mockEditor;
      mockOperation = {version: {siteId: '4', counter: 2}};

      spyOn(controller.vector, "hasBeenApplied");
      spyOn(controller, "applyOperation");
      spyOn(controller, "processBuffer");
      spyOn(controller.broadcast, "send");
    })

    it("calls vector.hasBeenApplied", () => {
      controller.handleRemoteOperation(mockOperation);
      expect(controller.vector.hasBeenApplied).toHaveBeenCalled();
    });

    it("pushes operation to buffer if insert", () => {
      const insertOperation = {
        type: 'insert',
        char: { siteId: '0', counter: 0, position: []},
        version: { siteId: '0', counter: 0 },
      };

      expect(controller.buffer.length).toBe(0);
      controller.handleRemoteOperation(insertOperation);
      expect(controller.buffer.length).toBe(1);
    });

    it("pushes operation to buffer for a delete", () => {
      const deleteOperation = {
        type: 'delete',
        char: { siteId: 0, counter: 0, position: []},
        version: { siteId: '0', counter: 0 },
      };

      expect(controller.buffer.length).toBe(0);
      controller.handleRemoteOperation(deleteOperation);
      expect(controller.buffer.length).toBe(1);
    });

    it("calls processDeletionBuffer", () => {
      controller.handleRemoteOperation(mockOperation);
      expect(controller.processBuffer).toHaveBeenCalled();
    });

    it("calls broadcast.send", () => {
      controller.handleRemoteOperation(mockOperation);
      expect(controller.broadcast.send).toHaveBeenCalled();
    });
  });

  describe("processBuffer", () => {
    let controller, op1, op2, version1, version2;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.editor = mockEditor;
      op1 = {type: 'delete', char: { siteId: 1, counter: 1 }};
      op2 = {type: 'delete', char: { siteId: 3, counter: 5 }};
      controller.buffer = [op1, op2];

      // version1 = { siteId: 1, counter: 3 };
      // version2 = { siteId: 3, counter: 3 };
      // controller.vector.versions = [version1, version2];

      spyOn(controller, "hasInsertionBeenApplied");
      spyOn(controller, "applyOperation");
    })

    it("calls vector.hasBeenApplied for each operation in buffer", () => {
      controller.processBuffer();
      expect(controller.hasInsertionBeenApplied).toHaveBeenCalledWith(op1);
      expect(controller.hasInsertionBeenApplied).toHaveBeenCalledWith(op2);
    });

    it("calls applyOperation if hasInsertionBeenApplied is true", () => {
      controller.hasInsertionBeenApplied = function() {
        return true;
      }

      controller.processBuffer();
      expect(controller.applyOperation).toHaveBeenCalledWith(op1);
    });

    it("doesn't call applyOperation if hasInsertionBeenApplied is false", () => {
      controller.hasInsertionBeenApplied = function() {
        return false;
      }

      controller.processBuffer();
      expect(controller.applyOperation).not.toHaveBeenCalledWith(op1);
    });

    it("clears buffer if hasInsertionBeenApplied is true", () => {
      controller.hasInsertionBeenApplied = function() {
        return true;
      }
      expect(controller.buffer.length).toBe(2);
      controller.processBuffer();
      expect(controller.buffer.length).toBe(0);
    });
  });

  describe("hasInsertionBeenApplied", () => {
    let controller, operation;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.editor = mockEditor;
      operation = {type: "delete", chars: [{siteId: 1, counter: 1}]};

      spyOn(controller.vector, "hasBeenApplied");
    })

    it("calls vector.hasBeenApplied for operation", () => {
      controller.hasInsertionBeenApplied(operation);
      expect(controller.vector.hasBeenApplied).toHaveBeenCalled();
    });

    it("calls the vector method with the correct character version", () => {
      controller.hasInsertionBeenApplied(operation);
      expect(controller.vector.hasBeenApplied).toHaveBeenCalledWith({siteId: 1, counter: 1});
    })
  });

  describe("applyOperation", () => {
    let controller, operation;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.editor = mockEditor;
      spyOn(controller.crdt, "remoteInsert");
      spyOn(controller.crdt, "remoteDelete");
      spyOn(controller.vector, "update");
    })

    it("calls crdt.handleRemoteInsert if it's an insert", () => {
      const operation = {
        type: "insert",
        chars: [{ siteId: 0, counter: 0, position: []}],
        version: {siteId: 8, counter: 9}
      };
      controller.applyOperation(operation);
      expect(controller.crdt.remoteInsert).toHaveBeenCalled();
    });

    it("calls crdt.handleRemoteDelete if it's a delete", () => {
      const operation = {
        type: "delete",
        chars: [{ siteId: 0, counter: 0, position: []}],
        version: {siteId: 8, counter: 9}
      };
      controller.applyOperation(operation);
      expect(controller.crdt.remoteDelete).toHaveBeenCalled();
    });

    it("calls creates the proper char and identifier objects to pass to handleRemoteInsert/handleRemoteDelete", () => {
      const operation = {
        type: "insert",
        chars: [{ siteId: 4, counter: 5, value: "a", position: [{digit: 6, siteId: 7}] }],
        version: {siteId: 8, counter: 9}
      };
      const newChar = [new Char("a", 5, 4, [new Identifier(6, 7)])];

      controller.applyOperation(operation);
      expect(controller.crdt.remoteInsert).toHaveBeenCalledWith(newChar);
    });

    it("calls vector.update with the operation's version", () => {
      const dataObj = {
        op: "insert",
        chars: [{ siteId: 0, counter: 0, position: []}],
        version: {siteId: 8, counter: 9}
      };

      controller.applyOperation(dataObj);
      expect(controller.vector.update).toHaveBeenCalledWith({siteId: 8, counter: 9});
    });
  });

  describe("localDelete", () => {
    let controller;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.editor = mockEditor;
      spyOn(controller.crdt, "localDelete");
    })

    it("calls crdt.handleLocalDelete as many times as the difference between startIdx and endIdx", () => {
      const startIdx = 3;
      const endIdx = 5;
      controller.handleLocalDelete(startIdx, endIdx);
      expect(controller.crdt.localDelete).toHaveBeenCalledWith(startIdx, endIdx);
      expect(controller.crdt.localDelete).toHaveBeenCalledWith(startIdx, endIdx);
    });
  });

  describe("localInsert", () => {
    const controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
    controller.view = mockView;
    controller.editor = mockEditor;

    it("calls crdt.handleLocalInsert with the character object and index passed in", () => {
      const identifier1 = new Identifier(4, 5);
      const identifier2 = new Identifier(6, 7);
      const chars = [new Char("a", 1, 0, [identifier1, identifier2])];

      spyOn(controller.crdt, "localInsert");
      controller.handleLocalInsert(chars, 5);
      expect(controller.crdt.localInsert).toHaveBeenCalledWith(chars, 5);
    });
  });

  describe("broadcastInsertion", () => {
    let controller, newChar;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.editor = mockEditor;
      const identifier1 = new Identifier(4, 5);
      const identifier2 = new Identifier(6, 7);
      newChar = [new Char("a", 1, 0, [identifier1, identifier2])];

      spyOn(controller.vector, "getLocalVersion");
      spyOn(controller.broadcast, "send");
    })

    it("calls send", () => {
      controller.broadcastInsertion(newChar);
      expect(controller.broadcast.send).toHaveBeenCalled();
    });
  });

  describe("broadcastDeletion", () => {
    let controller, newChar;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.editor = mockEditor;
      const identifier1 = new Identifier(4, 5);
      const identifier2 = new Identifier(6, 7);
      newChar = new Char("a", 1, 0, [identifier1, identifier2]);

      spyOn(controller.vector, "getLocalVersion");
      spyOn(controller.broadcast, "send");
    })

    it("calls broadcast.send with the correct operation", () => {
      const version = controller.vector.getLocalVersion();
      controller.broadcastDeletion([newChar]);
      const operation = {
        type: 'delete',
        chars: [newChar],
        version: version
      }
      expect(controller.broadcast.send).toHaveBeenCalledWith(operation);
    });
  });


// Didn't flush out these 2 tests since they'll be changing a lot with array of arrays
  describe("insertIntoEditor", () => {
    let controller;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.editor = mockEditor;
      spyOn(controller.editor, "insertText");
    })

    it("calls editor.insertText", () => {
      controller.insertIntoEditor([{value: "a"}], {line: 0, ch: 0}, {line: 0, ch: 0}, '4');
      expect(controller.editor.insertText).toHaveBeenCalled();
    });
  });

  describe("deleteFromEditor", () => {
    let controller;

    beforeEach(() => {
      controller = new Controller(targetPeerId, host, mockPeer, mockMDE, mockOptions);
      controller.view = mockView;
      controller.editor = mockEditor;
      spyOn(controller.editor, "deleteText");
    })

    it("calls editor.deleteText", () => {
      controller.deleteFromEditor([{value: "a"}], {line: 0, ch: 0}, {line: 0, ch: 1}, '4');
      expect(controller.editor.deleteText).toHaveBeenCalled();
    });
  });
});
