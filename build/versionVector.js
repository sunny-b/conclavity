'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _version = require('./version');

var _version2 = _interopRequireDefault(_version);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// vector/list of versions of sites in the distributed system
// keeps track of the latest operation received from each site (i.e. version)
// prevents duplicate operations from being applied to our CRDT
var VersionVector = function () {
  // initialize empty vector to be sorted by siteId
  // initialize Version/Clock for local site and insert into SortedArray vector object
  function VersionVector(siteId) {
    _classCallCheck(this, VersionVector);

    // this.versions = new SortedArray(this.siteIdComparator);
    this.versions = [];
    this.localVersion = new _version2.default(siteId);
    this.versions.push(this.localVersion);
  }

  _createClass(VersionVector, [{
    key: 'increment',
    value: function increment() {
      this.localVersion.counter++;
    }

    // updates vector with new version received from another site
    // if vector doesn't contain version, it's created and added to vector
    // create exceptions if need be.

  }, {
    key: 'update',
    value: function update(incomingVersion) {
      var existingVersion = this.versions.find(function (version) {
        return incomingVersion.siteId === version.siteId;
      });

      if (!existingVersion) {
        var newVersion = new _version2.default(incomingVersion.siteId);

        newVersion.update(incomingVersion);
        this.versions.push(newVersion);
      } else {
        existingVersion.update(incomingVersion);
      }
    }

    // check if incoming remote operation has already been applied to our crdt

  }, {
    key: 'hasBeenApplied',
    value: function hasBeenApplied(incomingVersion) {
      var localIncomingVersion = this.getVersionFromVector(incomingVersion);
      var isIncomingInVersionVector = !!localIncomingVersion;

      if (!isIncomingInVersionVector) return false;

      var isIncomingLower = incomingVersion.counter <= localIncomingVersion.counter;
      var isInExceptions = localIncomingVersion.exceptions.includes(incomingVersion.counter);

      return isIncomingLower && !isInExceptions;
    }
  }, {
    key: 'getVersionFromVector',
    value: function getVersionFromVector(incomingVersion) {
      return this.versions.find(function (version) {
        return version.siteId === incomingVersion.siteId;
      });
    }
  }, {
    key: 'getAllVersions',
    value: function getAllVersions() {
      return this.versions;
    }
  }, {
    key: 'getLocalVersion',
    value: function getLocalVersion() {
      return {
        siteId: this.localVersion.siteId,
        counter: this.localVersion.counter
      };
    }
  }]);

  return VersionVector;
}();

exports.default = VersionVector;