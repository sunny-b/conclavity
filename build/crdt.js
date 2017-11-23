'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _identifier = require('./identifier');

var _identifier2 = _interopRequireDefault(_identifier);

var _char = require('./char');

var _char2 = _interopRequireDefault(_char);

var _eventemitter = require('eventemitter3');

var _eventemitter2 = _interopRequireDefault(_eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var CRDT = function (_EventEmitter) {
  _inherits(CRDT, _EventEmitter);

  function CRDT(siteId, vector) {
    var base = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 32;
    var boundary = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 10;
    var strategy = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 'random';

    _classCallCheck(this, CRDT);

    var _this = _possibleConstructorReturn(this, (CRDT.__proto__ || Object.getPrototypeOf(CRDT)).call(this));

    _this.vector = vector;
    _this.struct = [[]];
    _this.siteId = siteId;
    _this.base = base;
    _this.boundary = boundary;
    _this.strategy = strategy;
    _this.strategyCache = [];
    return _this;
  }

  _createClass(CRDT, [{
    key: 'retrieveStruct',
    value: function retrieveStruct() {
      return this.struct;
    }
  }, {
    key: 'localInsert',
    value: function localInsert(values, startPos) {
      var value = void 0,
          char = void 0;

      for (var i = 0; i < values.length; i++) {
        value = values[i];

        if (values[i - 1] === '\n') {
          startPos.line++;
          startPos.ch = 0;
        }

        this.vector.increment();
        char = this.generateChar(value, startPos);
        this.insertChar(char, startPos);

        this.emit('localInsert', char, this.vector.getLocalVersion());
        startPos.ch++;
      }
    }
  }, {
    key: 'remoteInsert',
    value: function remoteInsert(char) {
      var pos = this.findPosition(char);
      this.insertChar(char, pos);
      this.emit('remoteInsert', char.value, pos, char.siteId);
    }
  }, {
    key: 'insertChar',
    value: function insertChar(char, pos) {
      if (pos.line === this.struct.length) {
        this.struct.push([]);
      }

      // if inserting a newline, split line into two lines
      if (char.value === "\n") {
        var lineAfter = this.struct[pos.line].splice(pos.ch);

        if (lineAfter.length === 0) {
          this.struct[pos.line].splice(pos.ch, 0, char);
        } else {
          var lineBefore = this.struct[pos.line].concat(char);
          this.struct.splice(pos.line, 1, lineBefore, lineAfter);
        }
      } else {
        this.struct[pos.line].splice(pos.ch, 0, char);
      }
    }
  }, {
    key: 'localDelete',
    value: function localDelete(startPos, endPos) {
      var _this2 = this;

      var chars = void 0,
          line = void 0,
          ch = void 0,
          i = void 0,
          charNum = void 0;
      var newlineRemoved = false;

      // for multi-line deletes
      if (startPos.line !== endPos.line) {
        // delete chars on first line from startPos.ch to end of line
        newlineRemoved = true;
        chars = this.struct[startPos.line].splice(startPos.ch);

        for (line = startPos.line + 1; line < endPos.line; line++) {
          chars = chars.concat(this.struct[line].splice(0));
        }

        // splice chars off of the last line, only if last line exists in CRDt
        if (this.struct[endPos.line]) {
          chars = chars.concat(this.struct[endPos.line].splice(0, endPos.ch));
        }

        // single-line deletes
      } else {
        charNum = endPos.ch - startPos.ch;
        chars = this.struct[startPos.line].splice(startPos.ch, charNum);

        if (chars.find(function (char) {
          return char.value === '\n';
        })) newlineRemoved = true;
      }

      chars.forEach(function (char) {
        _this2.vector.increment();
        _this2.emit('localDelete', char, _this2.vector.getLocalVersion());
      });

      this.removeEmptyLines();

      if (newlineRemoved && this.struct[startPos.line + 1]) {
        this.mergeLines(startPos.line);
      }
    }

    // when deleting newline, concat line with next line

  }, {
    key: 'mergeLines',
    value: function mergeLines(line) {
      var mergedLine = this.struct[line].concat(this.struct[line + 1]);
      this.struct.splice(line, 2, mergedLine);
    }
  }, {
    key: 'removeEmptyLines',
    value: function removeEmptyLines() {
      for (var line = 0; line < this.struct.length; line++) {
        if (this.struct[line].length === 0) {
          this.struct.splice(line, 1);
          line--;
        }
      }

      if (this.struct.length === 0) {
        this.struct.push([]);
      }
    }
  }, {
    key: 'remoteDelete',
    value: function remoteDelete(char, siteId) {
      var pos = this.findPosition(char);
      this.struct[pos.line].splice(pos.ch, 1);

      if (char.value === "\n" && this.struct[pos.line + 1]) {
        this.mergeLines(pos.line);
      }

      this.removeEmptyLines();
      this.emit('remoteDelete', char.value, pos, siteId);
    }
  }, {
    key: 'isEmpty',
    value: function isEmpty() {
      return this.struct.length === 1 && this.struct[0].length === 0;
    }

    // could be refactored to look prettier

  }, {
    key: 'findPosition',
    value: function findPosition(char) {
      var minLine = 0;
      var totalLines = this.struct.length;
      var maxLine = totalLines - 1;
      var lastLine = this.struct[maxLine];
      var currentLine = void 0,
          midLine = void 0,
          charIdx = void 0,
          minCurrentLine = void 0,
          lastChar = void 0,
          maxCurrentLine = void 0,
          minLastChar = void 0,
          maxLastChar = void 0;

      // check if struct is empty or char is less than first char
      if (this.isEmpty() || char.compareTo(this.struct[0][0]) <= 0) {
        return { line: 0, ch: 0 };
      }

      lastChar = lastLine[lastLine.length - 1];

      // char is greater than all existing chars (insert at end)
      if (char.compareTo(lastChar) > 0) {
        return this.findEndPosition(lastChar, lastLine, totalLines);
      }

      // binary search
      while (minLine + 1 < maxLine) {
        midLine = Math.floor(minLine + (maxLine - minLine) / 2);
        currentLine = this.struct[midLine];
        lastChar = currentLine[currentLine.length - 1];

        if (char.compareTo(lastChar) === 0) {
          return { line: midLine, ch: currentLine.length - 1 };
        } else if (char.compareTo(lastChar) < 0) {
          maxLine = midLine;
        } else {
          minLine = midLine;
        }
      }

      // Check between min and max line.
      minCurrentLine = this.struct[minLine];
      minLastChar = minCurrentLine[minCurrentLine.length - 1];
      maxCurrentLine = this.struct[maxLine];
      maxLastChar = maxCurrentLine[maxCurrentLine.length - 1];

      if (char.compareTo(minLastChar) <= 0) {
        charIdx = this.findIndexInLine(char, minCurrentLine);
        return { line: minLine, ch: charIdx };
      } else {
        charIdx = this.findIndexInLine(char, maxCurrentLine);
        return { line: maxLine, ch: charIdx };
      }
    }
  }, {
    key: 'findEndPosition',
    value: function findEndPosition(lastChar, lastLine, totalLines) {
      if (lastChar.value === "\n") {
        return { line: totalLines, ch: 0 };
      } else {
        return { line: totalLines - 1, ch: lastLine.length };
      }
    }

    // binary search to find char in a line

  }, {
    key: 'findIndexInLine',
    value: function findIndexInLine(char, line) {
      var left = 0;
      var right = line.length - 1;
      var mid = void 0,
          compareNum = void 0;

      if (line.length === 0 || char.compareTo(line[left]) < 0) {
        return left;
      } else if (char.compareTo(line[right]) > 0) {
        return this.struct.length;
      }

      while (left + 1 < right) {
        mid = Math.floor(left + (right - left) / 2);
        compareNum = char.compareTo(line[mid]);

        if (compareNum === 0) {
          return mid;
        } else if (compareNum > 0) {
          left = mid;
        } else {
          right = mid;
        }
      }

      if (char.compareTo(line[left]) === 0) {
        return left;
      } else {
        return right;
      }
    }
  }, {
    key: 'findPosBefore',
    value: function findPosBefore(pos) {
      var ch = pos.ch;
      var line = pos.line;

      if (ch === 0 && line === 0) {
        return [];
      } else if (ch === 0 && line !== 0) {
        line = line - 1;
        ch = this.struct[line].length;
      }

      return this.struct[line][ch - 1].position;
    }
  }, {
    key: 'findPosAfter',
    value: function findPosAfter(pos) {
      var ch = pos.ch;
      var line = pos.line;

      var numLines = this.struct.length;
      var numChars = this.struct[line] && this.struct[line].length || 0;

      if (line === numLines - 1 && ch === numChars) {
        return [];
      } else if (line < numLines - 1 && ch === numChars) {
        line = line + 1;
        ch = 0;
      } else if (line > numLines - 1 && ch === 0) {
        return [];
      }

      return this.struct[line][ch].position;
    }
  }, {
    key: 'generateChar',
    value: function generateChar(val, pos) {
      var posBefore = this.findPosBefore(pos);
      var posAfter = this.findPosAfter(pos);
      var newPos = this.generatePosBetween(posBefore, posAfter);

      return new _char2.default(val, this.vector.localVersion.counter, this.siteId, newPos);
    }
  }, {
    key: 'retrieveStrategy',
    value: function retrieveStrategy(level) {
      if (this.strategyCache[level]) return this.strategyCache[level];
      var strategy = void 0;

      switch (this.strategy) {
        case 'plus':
          strategy = '+';
        case 'minus':
          strategy = '-';
        case 'random':
          strategy = Math.round(Math.random()) === 0 ? '+' : '-';
        default:
          strategy = level % 2 === 0 ? '+' : '-';
      }

      this.strategyCache[level] = strategy;
      return strategy;
    }
  }, {
    key: 'generatePosBetween',
    value: function generatePosBetween(pos1, pos2) {
      var newPos = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
      var level = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;

      // change 2 to any other number to change base multiplication
      var base = Math.pow(2, level) * this.base;
      var boundaryStrategy = this.retrieveStrategy(level);

      var id1 = pos1[0] || new _identifier2.default(0, this.siteId);
      var id2 = pos2[0] || new _identifier2.default(base, this.siteId);

      if (id2.digit - id1.digit > 1) {

        var newDigit = this.generateIdBetween(id1.digit, id2.digit, boundaryStrategy);
        newPos.push(new _identifier2.default(newDigit, this.siteId));
        return newPos;
      } else if (id2.digit - id1.digit === 1) {

        newPos.push(id1);
        return this.generatePosBetween(pos1.slice(1), [], newPos, level + 1);
      } else if (id1.digit === id2.digit) {
        if (id1.siteId < id2.siteId) {
          newPos.push(id1);
          return this.generatePosBetween(pos1.slice(1), [], newPos, level + 1);
        } else if (id1.siteId === id2.siteId) {
          newPos.push(id1);
          return this.generatePosBetween(pos1.slice(1), pos2.slice(1), newPos, level + 1);
        } else {
          throw new Error("Fix Position Sorting");
        }
      }
    }
    /*
    Math.random gives you a range that is inclusive of the min and exclusive of the max
    so have to add and subtract ones to get them all into that format
    
    if max - min <= boundary, the boundary doesn't matter
        newDigit > min, newDigit < max
        ie (min+1...max)
        so, min = min + 1
    if max - min > boundary and the boundary is negative
        min = max - boundary
        newDigit >= min, newDigit < max
        ie (min...max)
    if max - min > boundary and the boundary is positive
        max = min + boundary
        newDigit > min, newDigit <= max
        ie (min+1...max+1)
        so, min = min + 1 and max = max + 1
    
    now all are (min...max)
    */

  }, {
    key: 'generateIdBetween',
    value: function generateIdBetween(min, max, boundaryStrategy) {
      if (max - min < this.boundary) {
        min = min + 1;
      } else {
        if (boundaryStrategy === '-') {
          min = max - this.boundary;
        } else {
          min = min + 1;
          max = min + this.boundary;
        }
      }
      return Math.floor(Math.random() * (max - min)) + min;
    }
  }, {
    key: 'totalChars',
    value: function totalChars() {
      return this.struct.map(function (line) {
        return line.length;
      }).reduce(function (acc, val) {
        return acc + val;
      });
    }
  }, {
    key: 'toText',
    value: function toText() {
      return this.struct.map(function (line) {
        return line.map(function (char) {
          return char.value;
        }).join('');
      }).join('');
    }
  }]);

  return CRDT;
}(_eventemitter2.default);

exports.default = CRDT;