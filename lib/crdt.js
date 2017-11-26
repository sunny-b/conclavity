import Identifier from './identifier';
import Char from './char';
import EventEmitter from 'eventemitter3';

class CRDT extends EventEmitter {
  constructor(siteId, vector, base=32, boundary=10, strategy='random') {
    super();
    this.vector = vector;
    this.struct = [[]];
    this.siteId = siteId;
    this.base = base;
    this.boundary = boundary;
    this.strategy = strategy;
    this.strategyCache = [];
  }

  retrieveStruct() {
    return this.struct;
  }

  localInsert(values, startPos) {
    let value, char;

    for (let i = 0; i < values.length; i++) {
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

  remoteInsert(char) {
    const pos = this.findPosition(char);
    this.insertChar(char, pos);
    this.emit('remoteInsert', char.value, pos, char.siteId)
  }

  insertChar(char, pos) {
    if (pos.line === this.struct.length) {
      this.struct.push([]);
    }

    // if inserting a newline, split line into two lines
    if (char.value === "\n") {
      const lineAfter = this.struct[pos.line].splice(pos.ch);

      if (lineAfter.length === 0) {
        this.struct[pos.line].splice(pos.ch, 0, char);
      } else {
        const lineBefore = this.struct[pos.line].concat(char);
        this.struct.splice(pos.line, 1, lineBefore, lineAfter);
      }
    } else {
      this.struct[pos.line].splice(pos.ch, 0, char);
    }
  }

  localDelete(startPos, endPos) {
    let chars, line, ch, i, charNum;
    let newlineRemoved = false;

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

      if (chars.find(char => char.value === '\n')) newlineRemoved = true;
    }

    chars.forEach(char => {
      this.vector.increment();
      this.emit('localDelete', char, this.vector.getLocalVersion());
    });

    this.removeEmptyLines();

    if (newlineRemoved && this.struct[startPos.line + 1]) {
      this.mergeLines(startPos.line);
    }
  }

  // when deleting newline, concat line with next line
  mergeLines(line) {
    const mergedLine = this.struct[line].concat(this.struct[line + 1]);
    this.struct.splice(line, 2, mergedLine);
  }

  removeEmptyLines() {
    for (let line = 0; line < this.struct.length; line++) {
      if (this.struct[line].length === 0) {
        this.struct.splice(line, 1);
        line--;
      }
    }

    if (this.struct.length === 0) {
      this.struct.push([]);
    }
  }

  remoteDelete(char, siteId) {
    const pos = this.findPosition(char);
    this.struct[pos.line].splice(pos.ch, 1);

    if (char.value === "\n" && this.struct[pos.line + 1]) {
      this.mergeLines(pos.line);
    }

    this.removeEmptyLines();
    this.emit('remoteDelete', char.value, pos, siteId);
  }

  isEmpty() {
    return this.struct.length === 1 && this.struct[0].length === 0;
  }

  // could be refactored to look prettier
  findPosition(char) {
    let minLine = 0;
    let totalLines = this.struct.length;
    let maxLine = totalLines - 1;
    let lastLine = this.struct[maxLine];
    let currentLine, midLine, charIdx, minCurrentLine, lastChar,
          maxCurrentLine, minLastChar, maxLastChar;

    // check if struct is empty or char is less than first char
    if (this.isEmpty() || char.compareTo(this.struct[0][0]) <= 0) {
      return { line: 0, ch: 0 }
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
        return {line: midLine, ch: currentLine.length - 1}
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

  findEndPosition(lastChar, lastLine, totalLines) {
    if (lastChar.value === "\n") {
      return { line: totalLines, ch: 0 };
    } else {
      return { line: totalLines - 1, ch: lastLine.length}
    }
  }

  // binary search to find char in a line
  findIndexInLine(char, line) {
    let left = 0;
    let right = line.length - 1;
    let mid, compareNum;

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

  findPosBefore(pos) {
    let ch = pos.ch;
    let line = pos.line;

    if (ch === 0 && line === 0) {
      return [];
    } else if (ch === 0 && line !== 0) {
      line = line - 1;
      ch = this.struct[line].length;
    }

    return this.struct[line][ch - 1].position;
  }

  findPosAfter(pos) {
    let ch = pos.ch;
    let line = pos.line;

    let numLines = this.struct.length;
    let numChars = (this.struct[line] && this.struct[line].length) || 0;

    if ((line === numLines - 1) && (ch === numChars)) {
      return [];
    } else if ((line < numLines - 1) && (ch === numChars)) {
      line = line + 1;
      ch = 0;
    } else if ((line > numLines - 1) && ch === 0) {
      return [];
    }

    return this.struct[line][ch].position;
  }

  generateChar(val, pos) {
    const posBefore = this.findPosBefore(pos);
    const posAfter = this.findPosAfter(pos);
    const newPos = this.generatePosBetween(posBefore, posAfter);

    return new Char(val, this.vector.localVersion.counter, this.siteId, newPos);
  }

  retrieveStrategy(level) {
    if (this.strategyCache[level]) return this.strategyCache[level];
    let strategy;

    switch (this.strategy) {
      case 'plus':
        strategy = '+';
        break;
      case 'minus':
        strategy = '-';
        break;
      case 'random':
        strategy = Math.round(Math.random()) === 0 ? '+' : '-';
        break;
      default:
        strategy = (level % 2) === 0 ? '+' : '-';
    }

    this.strategyCache[level] = strategy;
    return strategy;
  }

  generatePosBetween(pos1, pos2, newPos=[], level=0) {
    // change 2 to any other number to change base multiplication
    let base = Math.pow(2, level) * this.base;
    let boundaryStrategy = this.retrieveStrategy(level);

    let id1 = pos1[0] || new Identifier(0, this.siteId);
    let id2 = pos2[0] || new Identifier(base, this.siteId);

    if (id2.digit - id1.digit > 1) {

      let newDigit = this.generateIdBetween(id1.digit, id2.digit, boundaryStrategy);
      newPos.push(new Identifier(newDigit, this.siteId));
      return newPos;

    } else if (id2.digit - id1.digit === 1) {

      newPos.push(id1);
      return this.generatePosBetween(pos1.slice(1), [], newPos, level+1);

    } else if (id1.digit === id2.digit) {
      if (id1.siteId < id2.siteId) {
        newPos.push(id1);
        return this.generatePosBetween(pos1.slice(1), [], newPos, level+1);
      } else if (id1.siteId === id2.siteId) {
        newPos.push(id1);
        return this.generatePosBetween(pos1.slice(1), pos2.slice(1), newPos, level+1);
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
  generateIdBetween(min, max, boundaryStrategy) {
    if ((max - min) < this.boundary) {
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

  totalChars() {
    return this.struct.map(line => line.length).reduce((acc, val) => acc + val);
  }

  toText() {
    return this.struct.map(line => line.map(char => char.value).join('')).join('');
  }
}

export default CRDT;
