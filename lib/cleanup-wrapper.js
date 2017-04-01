'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = cleanupWrapper;
exports.tmpDir = tmpDir;
exports.overrideMethod = overrideMethod;

var _statAgain = require('stat-again');

var _del = require('del');

var _del2 = _interopRequireDefault(_del);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function cleanupWrapper(func, _options) {
  var options = Object.assign({
    before: function before() {},
    after: function after() {}
  }, _options);

  return function () {
    var _this = this;

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var bef = options.before();

    var exec = function exec() {
      try {
        var ret = func.apply(_this, args);
        if (ret instanceof Promise) {
          return ret.then(function (res) {
            var aft = options.after();
            return aft instanceof Promise ? aft.then(function () {
              return res;
            }) : res;
          }, function (err) {
            options.after();
            throw err;
          });
        } else {
          var aft = options.after();
          return aft instanceof Promise ? aft.then(function () {
            return ret;
          }) : ret;
        }
      } catch (e) {
        options.after();
        throw e;
      }
    };

    if (bef instanceof Promise) {
      return bef.then(exec);
    } else {
      return exec();
    }
  };
};

function tmpDir(dir, func) {
  var dirs = Array.isArray(dir) ? dir : [dir];
  return cleanupWrapper(func, {
    dirs: dirs,
    before: function before() {
      return Promise.all(this.dirs.map(function (dir) {
        return (0, _statAgain.expectEventuallyDeleted)(dir).catch(function (err) {
          if (err.message.match(/File '.*' could not be deleted within the imparted time frame/)) {
            throw new Error('Dir \'' + dir + '\' already exists');
          } else {
            throw err;
          }
        });
      }));
    },
    after: function after() {
      return (0, _del2.default)(this.dirs);
    }
  });
};

function overrideMethod(object, methodName, newMethod, func) {
  return cleanupWrapper(func, {
    object: object, methodName: methodName, newMethod: newMethod,
    method: object[methodName],
    before: function before() {
      this.object[this.methodName] = this.newMethod;
    },
    after: function after() {
      this.object[this.methodName] = this.method;
    }
  });
};