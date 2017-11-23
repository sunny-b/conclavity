"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// Class that wraps the information about each version.
// exceptions are a set of counters for operations that our local CRDT has not
// seen or integrated yet. Waiting for these operations.
var Version = function () {
  function Version(siteId) {
    _classCallCheck(this, Version);

    this.siteId = siteId;
    this.counter = 0;
    this.exceptions = [];
  }

  // Update a site's version based on the incoming operation that was processed
  // If the incomingCounter is less than we had previously processed, we can remove it from the exceptions
  // Else if the incomingCounter is the operation immediately after the last one we procesed, we just increment our counter to reflect that
  // Else, add an exception for each counter value that we haven't seen yet, and update our counter to match


  _createClass(Version, [{
    key: "update",
    value: function update(version) {
      var incomingCounter = version.counter;

      if (incomingCounter <= this.counter) {
        var index = this.exceptions.indexOf(incomingCounter);
        this.exceptions.splice(index, 1);
      } else if (incomingCounter === this.counter + 1) {
        this.counter = this.counter + 1;
      } else {
        for (var i = this.counter + 1; i < incomingCounter; i++) {
          this.exceptions.push(i);
        }
        this.counter = incomingCounter;
      }
    }
  }]);

  return Version;
}();

exports.default = Version;