(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/*@ngInject;*/
var ActionCableChannel = function ActionCableChannel($q, $rootScope, ActionCableController, ActionCableWebsocket, ActionCableConfig, ActionCableSocketWrangler) {
  return function (channelName, channelParams) {
    this._websocketControllerActions = function () {
      ActionCableController.actions[this.channelName] = ActionCableController.actions[this.channelName] || {};
      ActionCableController.actions[this.channelName][this._channelParamsString] = ActionCableController.actions[this.channelName][this._channelParamsString] || [];
      return ActionCableController.actions[this.channelName][this._channelParamsString];
    };

    this._subscriptionCount = function () {
      return this.callbacks.length;
    };

    this.channelName = channelName;
    this.channelParams = channelParams || {};
    this._channelParamsString = JSON.stringify(this.channelParams);
    this.onMessageCallback = null;
    this.callbacks = this._websocketControllerActions();

    this.subscribe = function (cb) {
      var request;

      if (typeof cb !== 'function') {
        console.error("0x01 Callback function was not defined on subscribe(). ActionCable channel: '" + this.channelName + "', params: '" + this._channelParamsString + "'");
        return $q.reject();
      }

      if (this.onMessageCallback) {
        console.error("0x02 This ActionCableChannel instance is already subscribed. ActionCable channel: '" + this.channelName + "', params: '" + this._channelParamsString + "'");
        return $q.reject();
      }

      if (this._subscriptionCount() === 0) {
        request = ActionCableWebsocket.subscribe(this.channelName, this.channelParams);
      }

      this._addMessageCallback(cb);

      return request || $q.resolve();
    };

    this.unsubscribe = function () {
      var request;
      this._removeMessageCallback();
      if (this._subscriptionCount() === 0) {
        request = ActionCableWebsocket.unsubscribe(this.channelName, this.channelParams);
      }
      return request || $q.resolve();
    };

    this.send = function (message, action) {
      if (!this.onMessageCallback) {
        console.error("0x03 You need to subscribe before you can send a message. ActionCable channel: '" + this.channelName + "', params: '" + this._channelParamsString + "'");
        return $q.reject();
      }
      return ActionCableWebsocket.send(this.channelName, this.channelParams, message, action);
    };

    this.onConfirmSubscription = function (callback) {
      if (ActionCableConfig.debug) {
        console.log('Callback', 'confirm_subscription:' + this.channelName);
      }
      $rootScope.$on('confirm_subscription:' + this.channelName, callback);
    };

    this._addMessageCallback = function (cb) {
      this.onMessageCallback = cb;
      this.callbacks.push(this.onMessageCallback);
    };

    this._removeMessageCallback = function () {
      for (var i = 0; i < this.callbacks.length; i++) {
        if (this.callbacks[i] === this.onMessageCallback) {
          this.callbacks.splice(i, 1);
          this.onMessageCallback = null;
          return true;
        }
      }
      if (ActionCableConfig.debug) {
        console.log("Callbacks:");console.log(this.callbacks);
      }
      if (ActionCableConfig.debug) {
        console.log("onMessageCallback:");console.log(this.onMessageCallback);
      }
      throw "Can't find onMessageCallback in callbacks array to remove";
    };
  };
};
ActionCableChannel.$inject = ["$q", "$rootScope", "ActionCableController", "ActionCableWebsocket", "ActionCableConfig", "ActionCableSocketWrangler"];

exports.default = ActionCableChannel;

},{}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var ActionCableConfig = function ActionCableConfig() {
  var defaultWsUri = 'wss://please.add.an.actioncable.meta.tag.invalid:12345/path/to/cable';
  var _wsUri;
  var config = {
    autoStart: false,
    debug: true
  };

  Object.defineProperty(config, 'wsUri', {
    get: function get() {
      _wsUri = _wsUri || actioncable_meta_tag_content() || defaultWsUri;
      return _wsUri;
    },
    set: function set(newWsUri) {
      devlog('Setting new wsUri! ' + newWsUri);
      _wsUri = newWsUri;
      return _wsUri;
    }
  });
  return config;
  function actioncable_meta_tag_content() {
    return _wsUri;
  }
};

exports.default = ActionCableConfig;

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/*@ngInject;*/
var ActionCableController = function ActionCableController($rootScope, ActionCableConfig) {

  // add a hash of callbacks here that `route_channel` will call on an incoming message.
  // actions format: actions[channelName][dataParams] = [callback1, callback2, ...]
  // e.g. actions["GlobalsData"][JSON.stringify({"responder_id":1})]= [function(message){...}, assignment_2: function(message){...}, ... ]
  var actions = {
    welcome: function welcome(message) {
      if (ActionCableConfig.debug) {
        console.log('Willkommen');
      }
    },
    ping: function ping(message) {
      if (ActionCableConfig.debug) {
        console.log('ActionCable ping');
      }
    },

    // Rails5.0.0.beta3 backport
    _ping: function _ping(message) {
      if (ActionCableConfig.debug) {
        console.log('ActionCable 5.0.0.beta3 ping');
      }
    },
    confirm_subscription: function confirm_subscription(message) {
      var identifier = JSON.parse(message.identifier);
      var channel = identifier.channel;

      $rootScope.$broadcast('confirm_subscription:' + channel);

      if (ActionCableConfig.debug) {
        console.log('ActionCable confirm_subscription on channel: ' + message.identifier);
      }
    },
    ws_404: function ws_404(message) {
      if (ActionCableConfig.debug) {
        console.log('ActionCable route not found: ' + message);
      }
    }
  };

  var routeToActions = function routeToActions(actionCallbacks, message) {
    angular.forEach(actionCallbacks, function (func, id) {
      func.apply(null, [message]);
    });
  };

  var route = function route(message) {
    if (!!actions[message.type]) {
      actions[message.type](message);
      if (message.type == 'ping') methods.after_ping_callback();
    } else if (message.identifier == '_ping') {
      // Rails5.0.0.beta3 backport
      actions._ping(message); // Rails5.0.0.beta3 backport
      methods.after_ping_callback(); // Rails5.0.0.beta3 backport
    } else if (!!findActionCallbacksForChannel(channel_from(message), params_from(message))) {
      var actionCallbacks = findActionCallbacksForChannel(channel_from(message), params_from(message));
      routeToActions(actionCallbacks, message.message);
    } else {
      actions.ws_404(message);
    }
  };

  function findActionCallbacksForChannel(channelName, params) {
    return actions[channelName] && actions[channelName][params];
  }

  function channel_from(message) {
    if (message && message.identifier) {
      return JSON.parse(message.identifier).channel;
    }
  }

  function params_from(message) {
    var paramsData = JSON.parse(message.identifier).data;
    return JSON.stringify(paramsData);
  }

  var methods = {
    post: function post(message) {
      return route(message);
    },
    actions: actions,
    after_ping_callback: function after_ping_callback() {}
  };

  return methods;
};
ActionCableController.$inject = ["$rootScope", "ActionCableConfig"];

exports.default = ActionCableController;

},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/*@ngInject;*/
var ActionCableSocketWrangler = function ActionCableSocketWrangler($rootScope, ActionCableWebsocket, ActionCableConfig, ActionCableController) {
  var reconnectIntervalTime = 7537;
  var timeoutTime = 20143;
  var websocket = ActionCableWebsocket;
  var controller = ActionCableController;
  var _live = false;
  var _connecting = false;
  var _reconnectTimeout = false;
  var setReconnectTimeout = function setReconnectTimeout() {
    stopReconnectTimeout();
    _reconnectTimeout = _reconnectTimeout || setTimeout(function () {
      if (ActionCableConfig.debug) console.log("ActionCable connection might be dead; no pings received recently");
      connection_dead();
    }, timeoutTime + Math.floor(Math.random() * timeoutTime / 5));
  };
  var stopReconnectTimeout = function stopReconnectTimeout() {
    clearTimeout(_reconnectTimeout);
    _reconnectTimeout = false;
  };
  controller.after_ping_callback = function () {
    setReconnectTimeout();
  };
  var connectNow = function connectNow() {
    websocket.attempt_restart();
    setReconnectTimeout();
  };
  var startReconnectInterval = function startReconnectInterval() {
    _connecting = _connecting || setInterval(function () {
      connectNow();
    }, reconnectIntervalTime + Math.floor(Math.random() * reconnectIntervalTime / 5));
  };
  var stopReconnectInterval = function stopReconnectInterval() {
    clearInterval(_connecting);
    _connecting = false;
    clearTimeout(_reconnectTimeout);
    _reconnectTimeout = false;
  };
  var connection_dead = function connection_dead() {
    if (_live) {
      startReconnectInterval();
    }
    if (ActionCableConfig.debug) console.log("socket close");
    $rootScope.$apply();
  };
  websocket.on_connection_close_callback = connection_dead;
  var connection_alive = function connection_alive() {
    stopReconnectInterval();
    setReconnectTimeout();
    if (ActionCableConfig.debug) console.log("socket open");
    $rootScope.$apply();
  };
  websocket.on_connection_open_callback = connection_alive;
  var methods = {
    start: function start() {
      if (ActionCableConfig.debug) console.info("Live STARTED");
      _live = true;
      startReconnectInterval();
      connectNow();
    },
    stop: function stop() {
      if (ActionCableConfig.debug) console.info("Live stopped");
      _live = false;
      stopReconnectInterval();
      stopReconnectTimeout();
      websocket.close();
    }
  };

  Object.defineProperties(methods, {
    connected: {
      get: function get() {
        return _live && !_connecting;
      }
    },
    connecting: {
      get: function get() {
        return _live && !!_connecting;
      }
    },
    disconnected: {
      get: function get() {
        return !_live;
      }
    }
  });

  if (ActionCableConfig.autoStart) methods.start();
  return methods;
};
ActionCableSocketWrangler.$inject = ["$rootScope", "ActionCableWebsocket", "ActionCableConfig", "ActionCableController"];

exports.default = ActionCableSocketWrangler;

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
/*@ngInject;*/
var ActionCableWebsocket = function ActionCableWebsocket($websocket, ActionCableController, ActionCableConfig) {
  var controller = ActionCableController;
  var dataStream = null;
  var methods;
  var _connected = false;
  var currentChannels = [];
  var close_connection = function close_connection() {
    if (dataStream) {
      dataStream.close({ "force": true });
      dataStream = null;
      _connected = false;
    }
  };
  var subscribe_to = function subscribe_to(channel, data) {
    if (typeof data === 'undefined') data = "N/A";
    if (ActionCableConfig.debug) console.log("-> subscribing to: " + channel);
    return new_data_stream().send(JSON.stringify({
      "command": "subscribe",
      "identifier": JSON.stringify({ "channel": channel, "data": data })
    }));
  };
  var unsubscribe_from = function unsubscribe_from(channel, data) {
    if (typeof data === 'undefined') data = "N/A";
    if (ActionCableConfig.debug) console.log("<- unsubscribing from: " + channel);
    return new_data_stream().send(JSON.stringify({
      "command": "unsubscribe",
      "identifier": JSON.stringify({ "channel": channel, "data": data })
    }));
  };
  var send_to = function send_to(channel, data, message, action) {
    if (typeof data === 'undefined') data = "N/A";
    if (ActionCableConfig.debug) console.log("=> sending to: " + channel);
    return new_data_stream().send(JSON.stringify({
      "command": "message",
      "identifier": JSON.stringify({ "channel": channel, "data": data }),
      "data": JSON.stringify({ "message": message, "action": action })
    }));
  };
  var new_data_stream = function new_data_stream() {
    if (dataStream === null) {
      dataStream = $websocket(ActionCableConfig.wsUri);
      dataStream.onClose(function (arg) {
        close_connection();
        _connected = false;
        methods.on_connection_close_callback();
      });
      dataStream.onOpen(function (arg) {
        _connected = true;
        currentChannels.forEach(function (channel) {
          subscribe_to(channel.name, channel.data);
        });
        methods.on_connection_open_callback();
      });
      dataStream.onMessage(function (message) {
        //arriving message from backend
        controller.post(JSON.parse(message.data));
      });
    }
    return dataStream;
  };
  methods = {
    connected: function connected() {
      return _connected;
    },
    attempt_restart: function attempt_restart() {
      close_connection();
      new_data_stream();
      return true;
    },
    currentChannels: currentChannels,
    close: function close() {
      return close_connection();
    },
    on_connection_close_callback: function on_connection_close_callback() {},
    on_connection_open_callback: function on_connection_open_callback() {},
    subscribe: function subscribe(channel, data) {
      currentChannels.push({ name: channel, data: data });
      return this.connected() && subscribe_to(channel, data);
    },
    unsubscribe: function unsubscribe(channel, data) {
      for (var i = 0; i < currentChannels.length; i++) {
        if (currentChannels[i].name === channel) {
          currentChannels.splice(i, 1);
        }
      }
      return this.connected() && unsubscribe_from(channel, data);
    },
    send: function send(channel, data, message, action) {
      if (ActionCableConfig.debug) console.log("send requested");
      return this.connected() && send_to(channel, data, message, action);
    }
  };
  return methods;
};
ActionCableWebsocket.$inject = ["$websocket", "ActionCableController", "ActionCableConfig"];

exports.default = ActionCableWebsocket;

},{}],6:[function(require,module,exports){
'use strict';

var _actionCableChannel = require('./actionCableChannel');

var _actionCableChannel2 = _interopRequireDefault(_actionCableChannel);

var _actionCableConfig = require('./actionCableConfig');

var _actionCableConfig2 = _interopRequireDefault(_actionCableConfig);

var _actionCableController = require('./actionCableController');

var _actionCableController2 = _interopRequireDefault(_actionCableController);

var _actionCableSocketWrangler = require('./actionCableSocketWrangler');

var _actionCableSocketWrangler2 = _interopRequireDefault(_actionCableSocketWrangler);

var _actionCableWebsocket = require('./actionCableWebsocket');

var _actionCableWebsocket2 = _interopRequireDefault(_actionCableWebsocket);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

angular.module('ngActionCable', ['ngWebsocket']).service('ActionCableChannel', _actionCableChannel2.default).service('ActionCableConfig', _actionCableConfig2.default).service('ActionCableController', _actionCableController2.default).service('ActionCableSocketWrangler', _actionCableSocketWrangler2.default).service('ActionCableWebsocket', _actionCableWebsocket2.default);

},{"./actionCableChannel":1,"./actionCableConfig":2,"./actionCableController":3,"./actionCableSocketWrangler":4,"./actionCableWebsocket":5}]},{},[6])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYWN0aW9uQ2FibGVDaGFubmVsLmpzIiwic3JjL2FjdGlvbkNhYmxlQ29uZmlnLmpzIiwic3JjL2FjdGlvbkNhYmxlQ29udHJvbGxlci5qcyIsInNyYy9hY3Rpb25DYWJsZVNvY2tldFdyYW5nbGVyLmpzIiwic3JjL2FjdGlvbkNhYmxlV2Vic29ja2V0LmpzIiwic3JjL25nQWN0aW9uQ2FibGUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7OztBQ0FBO0FBQ0EsSUFBTSxxQkFBcUIsU0FBckIsa0JBQXFCLENBQVMsRUFBVCxFQUFhLFVBQWIsRUFBeUIscUJBQXpCLEVBQWdELG9CQUFoRCxFQUFzRSxpQkFBdEUsRUFBeUYseUJBQXpGLEVBQW1IO0FBQzVJLFNBQU8sVUFBUyxXQUFULEVBQXNCLGFBQXRCLEVBQW9DO0FBQ3pDLFNBQUssMkJBQUwsR0FBbUMsWUFBVztBQUM1Qyw0QkFBc0IsT0FBdEIsQ0FBOEIsS0FBSyxXQUFuQyxJQUFpRCxzQkFBc0IsT0FBdEIsQ0FBOEIsS0FBSyxXQUFuQyxLQUFtRCxFQUFwRztBQUNBLDRCQUFzQixPQUF0QixDQUE4QixLQUFLLFdBQW5DLEVBQWdELEtBQUssb0JBQXJELElBQTRFLHNCQUFzQixPQUF0QixDQUE4QixLQUFLLFdBQW5DLEVBQWdELEtBQUssb0JBQXJELEtBQThFLEVBQTFKO0FBQ0EsYUFBTyxzQkFBc0IsT0FBdEIsQ0FBOEIsS0FBSyxXQUFuQyxFQUFnRCxLQUFLLG9CQUFyRCxDQUFQO0FBQ0QsS0FKRDs7QUFNQSxTQUFLLGtCQUFMLEdBQXlCLFlBQVU7QUFDakMsYUFBTyxLQUFLLFNBQUwsQ0FBZSxNQUF0QjtBQUNELEtBRkQ7O0FBSUEsU0FBSyxXQUFMLEdBQWtCLFdBQWxCO0FBQ0EsU0FBSyxhQUFMLEdBQW9CLGlCQUFpQixFQUFyQztBQUNBLFNBQUssb0JBQUwsR0FBMkIsS0FBSyxTQUFMLENBQWUsS0FB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QUFDQTs7Ozs7O0FBRUEsUUFBUSxNQUFSLENBQWUsZUFBZixFQUFnQyxDQUFDLGFBQUQsQ0FBaEMsRUFDRyxPQURILENBQ1csb0JBRFgsZ0NBRUcsT0FGSCxDQUVXLG1CQUZYLCtCQUdHLE9BSEgsQ0FHVyx1QkFIWCxtQ0FJRyxPQUpILENBSVcsMkJBSlgsdUNBS0csT0FMSCxDQUtXLHNCQUxYIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qQG5nSW5qZWN0OyovXG5jb25zdCBBY3Rpb25DYWJsZUNoYW5uZWwgPSBmdW5jdGlvbigkcSwgJHJvb3RTY29wZSwgQWN0aW9uQ2FibGVDb250cm9sbGVyLCBBY3Rpb25DYWJsZVdlYnNvY2tldCwgQWN0aW9uQ2FibGVDb25maWcsIEFjdGlvbkNhYmxlU29ja2V0V3JhbmdsZXIpe1xuICByZXR1cm4gZnVuY3Rpb24oY2hhbm5lbE5hbWUsIGNoYW5uZWxQYXJhbXMpe1xuICAgIHRoaXMuX3dlYnNvY2tldENvbnRyb2xsZXJBY3Rpb25zID0gZnVuY3Rpb24oKSB7XG4gICAgICBBY3Rpb25DYWJsZUNvbnRyb2xsZXIuYWN0aW9uc1t0aGlzLmNoYW5uZWxOYW1lXT0gQWN0aW9uQ2FibGVDb250cm9sbGVyLmFjdGlvbnNbdGhpcy5jaGFubmVsTmFtZV0gfHwge307XG4gICAgICBBY3Rpb25DYWJsZUNvbnRyb2xsZXIuYWN0aW9uc1t0aGlzLmNoYW5uZWxOYW1lXVt0aGlzLl9jaGFubmVsUGFyYW1zU3RyaW5nXT0gQWN0aW9uQ2FibGVDb250cm9sbGVyLmFjdGlvbnNbdGhpcy5jaGFubmVsTmFtZV1bdGhpcy5fY2hhbm5lbFBhcmFtc1N0cmluZ10gfHwgW107XG4gICAgICByZXR1cm4gQWN0aW9uQ2FibGVDb250cm9sbGVyLmFjdGlvbnNbdGhpcy5jaGFubmVsTmFtZV1bdGhpcy5fY2hhbm5lbFBhcmFtc1N0cmluZ107XG4gICAgfTtcblxuICAgIHRoaXMuX3N1YnNjcmlwdGlvbkNvdW50PSBmdW5jdGlvbigpe1xuICAgICAgcmV0dXJuIHRoaXMuY2FsbGJhY2tzLmxlbmd0aDtcbiAgICB9O1xuXG4gICAgdGhpcy5jaGFubmVsTmFtZT0gY2hhbm5lbE5hbWU7XG4gICAgdGhpcy5jaGFubmVsUGFyYW1zPSBjaGFubmVsUGFyYW1zIHx8IHt9O1xuICAgIHRoaXMuX2NoYW5uZWxQYXJhbXNTdHJpbmc9IEpTT04uc3RyaW5naWZ5KHRoaXMuY2hhbm5lbFBhcmFtcyk7XG4gICAgdGhpcy5vbk1lc3NhZ2VDYWxsYmFjaz0gbnVsbDtcbiAgICB0aGlzLmNhbGxiYWNrcz0gdGhpcy5fd2Vic29ja2V0Q29udHJvbGxlckFjdGlvbnMoKTtcblxuICAgIHRoaXMuc3Vic2NyaWJlID0gZnVuY3Rpb24oY2Ipe1xuICAgICAgdmFyIHJlcXVlc3Q7XG5cbiAgICAgIGlmICh0eXBlb2YoY2IpICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoXCIweDAxIENhbGxiYWNrIGZ1bmN0aW9uIHdhcyBub3QgZGVmaW5lZCBvbiBzdWJzY3JpYmUoKS4gQWN0aW9uQ2FibGUgY2hhbm5lbDogJ1wiK3RoaXMuY2hhbm5lbE5hbWUrXCInLCBwYXJhbXM6ICdcIit0aGlzLl9jaGFubmVsUGFyYW1zU3RyaW5nK1wiJ1wiKTtcbiAgICAgICAgcmV0dXJuICRxLnJlamVjdCgpO1xuICAgICAgfVxuXG4gICAgICBpZiAodGhpcy5vbk1lc3NhZ2VDYWxsYmFjaykge1xuICAgICAgICBjb25zb2xlLmVycm9yKFwiMHgwMiBUaGlzIEFjdGlvbkNhYmxlQ2hhbm5lbCBpbnN0YW5jZSBpcyBhbHJlYWR5IHN1YnNjcmliZWQuIEFjdGlvbkNhYmxlIGNoYW5uZWw6ICdcIit0aGlzLmNoYW5uZWxOYW1lK1wiJywgcGFyYW1zOiAnXCIrdGhpcy5fY2hhbm5lbFBhcmFtc1N0cmluZytcIidcIik7XG4gICAgICAgIHJldHVybiAkcS5yZWplY3QoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuX3N1YnNjcmlwdGlvbkNvdW50KCkgPT09IDApIHtcbiAgICAgICAgcmVxdWVzdCA9IEFjdGlvbkNhYmxlV2Vic29ja2V0LnN1YnNjcmliZSh0aGlzLmNoYW5uZWxOYW1lLCB0aGlzLmNoYW5uZWxQYXJhbXMpO1xuICAgICAgfVxuXG4gICAgICB0aGlzLl9hZGRNZXNzYWdlQ2FsbGJhY2soY2IpO1xuXG4gICAgICByZXR1cm4gKHJlcXVlc3QgfHwgJHEucmVzb2x2ZSgpKTtcbiAgICB9O1xuXG4gICAgdGhpcy51bnN1YnNjcmliZSA9IGZ1bmN0aW9uKCl7XG4gICAgICB2YXIgcmVxdWVzdDtcbiAgICAgIHRoaXMuX3JlbW92ZU1lc3NhZ2VDYWxsYmFjaygpO1xuICAgICAgaWYgKHRoaXMuX3N1YnNjcmlwdGlvbkNvdW50KCkgPT09IDApIHsgcmVxdWVzdD0gQWN0aW9uQ2FibGVXZWJzb2NrZXQudW5zdWJzY3JpYmUodGhpcy5jaGFubmVsTmFtZSwgdGhpcy5jaGFubmVsUGFyYW1zKTsgfVxuICAgICAgcmV0dXJuIChyZXF1ZXN0IHx8ICRxLnJlc29sdmUoKSk7XG4gICAgfTtcblxuICAgIHRoaXMuc2VuZCA9IGZ1bmN0aW9uKG1lc3NhZ2UsIGFjdGlvbil7XG4gICAgICBpZiAoIXRoaXMub25NZXNzYWdlQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihcIjB4MDMgWW91IG5lZWQgdG8gc3Vic2NyaWJlIGJlZm9yZSB5b3UgY2FuIHNlbmQgYSBtZXNzYWdlLiBBY3Rpb25DYWJsZSBjaGFubmVsOiAnXCIrdGhpcy5jaGFubmVsTmFtZStcIicsIHBhcmFtczogJ1wiK3RoaXMuX2NoYW5uZWxQYXJhbXNTdHJpbmcrXCInXCIpO1xuICAgICAgICByZXR1cm4gJHEucmVqZWN0KCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gQWN0aW9uQ2FibGVXZWJzb2NrZXQuc2VuZCh0aGlzLmNoYW5uZWxOYW1lLCB0aGlzLmNoYW5uZWxQYXJhbXMsIG1lc3NhZ2UsIGFjdGlvbik7XG4gICAgfTtcblxuICAgIHRoaXMub25Db25maXJtU3Vic2NyaXB0aW9uID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIGlmIChBY3Rpb25DYWJsZUNvbmZpZy5kZWJ1ZykgeyBjb25zb2xlLmxvZygnQ2FsbGJhY2snLCAnY29uZmlybV9zdWJzY3JpcHRpb246JyArICB0aGlzLmNoYW5uZWxOYW1lKTsgfVxuICAgICAgJHJvb3RTY29wZS4kb24oJ2NvbmZpcm1fc3Vic2NyaXB0aW9uOicgKyAgdGhpcy5jaGFubmVsTmFtZSwgY2FsbGJhY2spO1xuICAgIH07XG5cbiAgICB0aGlzLl9hZGRNZXNzYWdlQ2FsbGJhY2s9IGZ1bmN0aW9uKGNiKXtcbiAgICAgIHRoaXMub25NZXNzYWdlQ2FsbGJhY2s9IGNiO1xuICAgICAgdGhpcy5jYWxsYmFja3MucHVzaCh0aGlzLm9uTWVzc2FnZUNhbGxiYWNrKTtcbiAgICB9O1xuXG4gICAgdGhpcy5fcmVtb3ZlTWVzc2FnZUNhbGxiYWNrPSBmdW5jdGlvbigpe1xuICAgICAgZm9yKHZhciBpPTA7IGk8dGhpcy5jYWxsYmFja3MubGVuZ3RoOyBpKyspe1xuICAgICAgICBpZiAodGhpcy5jYWxsYmFja3NbaV09PT10aGlzLm9uTWVzc2FnZUNhbGxiYWNrKSB7XG4gICAgICAgICAgdGhpcy5jYWxsYmFja3Muc3BsaWNlKGksIDEpO1xuICAgICAgICAgIHRoaXMub25NZXNzYWdlQ2FsbGJhY2s9IG51bGw7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChBY3Rpb25DYWJsZUNvbmZpZy5kZWJ1ZykgeyBjb25zb2xlLmxvZyhcIkNhbGxiYWNrczpcIik7IGNvbnNvbGUubG9nKHRoaXMuY2FsbGJhY2tzKTsgfVxuICAgICAgaWYgKEFjdGlvbkNhYmxlQ29uZmlnLmRlYnVnKSB7IGNvbnNvbGUubG9nKFwib25NZXNzYWdlQ2FsbGJhY2s6XCIpOyBjb25zb2xlLmxvZyh0aGlzLm9uTWVzc2FnZUNhbGxiYWNrKTsgfVxuICAgICAgdGhyb3cgXCJDYW4ndCBmaW5kIG9uTWVzc2FnZUNhbGxiYWNrIGluIGNhbGxiYWNrcyBhcnJheSB0byByZW1vdmVcIjtcbiAgICB9O1xuICB9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBBY3Rpb25DYWJsZUNoYW5uZWw7XG4iLCJjb25zdCBBY3Rpb25DYWJsZUNvbmZpZyA9IGZ1bmN0aW9uKCkge1xuICB2YXIgZGVmYXVsdFdzVXJpPSAnd3NzOi8vcGxlYXNlLmFkZC5hbi5hY3Rpb25jYWJsZS5tZXRhLnRhZy5pbnZhbGlkOjEyMzQ1L3BhdGgvdG8vY2FibGUnO1xuICB2YXIgX3dzVXJpO1xuICB2YXIgY29uZmlnPSB7XG4gICAgYXV0b1N0YXJ0OiBmYWxzZSxcbiAgICBkZWJ1ZzogdHJ1ZVxuICB9O1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb25maWcsICd3c1VyaScsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgIF93c1VyaT0gX3dzVXJpIHx8IGFjdGlvbmNhYmxlX21ldGFfdGFnX2NvbnRlbnQoKSB8fCAgZGVmYXVsdFdzVXJpO1xuICAgICAgcmV0dXJuIF93c1VyaTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24obmV3V3NVcmkpIHtcbiAgICAgIGRldmxvZyhgU2V0dGluZyBuZXcgd3NVcmkhICR7bmV3V3NVcml9YCk7XG4gICAgICBfd3NVcmk9IG5ld1dzVXJpO1xuICAgICAgcmV0dXJuIF93c1VyaTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gY29uZmlnO1xuICBmdW5jdGlvbiBhY3Rpb25jYWJsZV9tZXRhX3RhZ19jb250ZW50KCkge1xuICAgIHJldHVybiBfd3NVcmk7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IEFjdGlvbkNhYmxlQ29uZmlnO1xuIiwiLypAbmdJbmplY3Q7Ki9cbmNvbnN0IEFjdGlvbkNhYmxlQ29udHJvbGxlciA9IGZ1bmN0aW9uKCRyb290U2NvcGUsIEFjdGlvbkNhYmxlQ29uZmlnKSB7XG5cbiAgLy8gYWRkIGEgaGFzaCBvZiBjYWxsYmFja3MgaGVyZSB0aGF0IGByb3V0ZV9jaGFubmVsYCB3aWxsIGNhbGwgb24gYW4gaW5jb21pbmcgbWVzc2FnZS5cbiAgLy8gYWN0aW9ucyBmb3JtYXQ6IGFjdGlvbnNbY2hhbm5lbE5hbWVdW2RhdGFQYXJhbXNdID0gW2NhbGxiYWNrMSwgY2FsbGJhY2syLCAuLi5dXG4gIC8vIGUuZy4gYWN0aW9uc1tcIkdsb2JhbHNEYXRhXCJdW0pTT04uc3RyaW5naWZ5KHtcInJlc3BvbmRlcl9pZFwiOjF9KV09IFtmdW5jdGlvbihtZXNzYWdlKXsuLi59LCBhc3NpZ25tZW50XzI6IGZ1bmN0aW9uKG1lc3NhZ2Upey4uLn0sIC4uLiBdXG4gIHZhciBhY3Rpb25zID0ge1xuICAgIHdlbGNvbWU6IGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgaWYgKEFjdGlvbkNhYmxlQ29uZmlnLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdXaWxsa29tbWVuJyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBwaW5nOiBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgIGlmIChBY3Rpb25DYWJsZUNvbmZpZy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmxvZygnQWN0aW9uQ2FibGUgcGluZycpO1xuICAgICAgfVxuICAgIH0sXG5cbiAgICAvLyBSYWlsczUuMC4wLmJldGEzIGJhY2twb3J0XG4gICAgX3Bpbmc6IGZ1bmN0aW9uKG1lc3NhZ2Upe1xuICAgICAgaWYgKEFjdGlvbkNhYmxlQ29uZmlnLmRlYnVnKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdBY3Rpb25DYWJsZSA1LjAuMC5iZXRhMyBwaW5nJyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBjb25maXJtX3N1YnNjcmlwdGlvbjogZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgdmFyIGlkZW50aWZpZXIgPSBKU09OLnBhcnNlKG1lc3NhZ2UuaWRlbnRpZmllcik7XG4gICAgICB2YXIgY2hhbm5lbCAgICA9IGlkZW50aWZpZXIuY2hhbm5lbDtcblxuICAgICAgJHJvb3RTY29wZS4kYnJvYWRjYXN0KCdjb25maXJtX3N1YnNjcmlwdGlvbjonICsgIGNoYW5uZWwpO1xuXG4gICAgICBpZiAoQWN0aW9uQ2FibGVDb25maWcuZGVidWcpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0FjdGlvbkNhYmxlIGNvbmZpcm1fc3Vic2NyaXB0aW9uIG9uIGNoYW5uZWw6ICcgKyBtZXNzYWdlLmlkZW50aWZpZXIpO1xuICAgICAgfVxuICAgIH0sXG4gICAgd3NfNDA0OiBmdW5jdGlvbihtZXNzYWdlKXtcbiAgICAgIGlmIChBY3Rpb25DYWJsZUNvbmZpZy5kZWJ1Zykge1xuICAgICAgICBjb25zb2xlLmxvZygnQWN0aW9uQ2FibGUgcm91dGUgbm90IGZvdW5kOiAnICsgbWVzc2FnZSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIHZhciByb3V0ZVRvQWN0aW9ucz0gZnVuY3Rpb24oYWN0aW9uQ2FsbGJhY2tzLCBtZXNzYWdlKXtcbiAgICBhbmd1bGFyLmZvckVhY2goYWN0aW9uQ2FsbGJhY2tzLCBmdW5jdGlvbihmdW5jLCBpZCl7XG4gICAgICBmdW5jLmFwcGx5KG51bGwsIFttZXNzYWdlXSk7XG4gICAgfSk7XG4gIH07XG5cbiAgdmFyIHJvdXRlID0gZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgaWYgKCEhYWN0aW9uc1ttZXNzYWdlLnR5cGVdKSB7XG4gICAgICBhY3Rpb25zW21lc3NhZ2UudHlwZV0obWVzc2FnZSk7XG4gICAgICBpZiAobWVzc2FnZS50eXBlID09ICdwaW5nJykgbWV0aG9kcy5hZnRlcl9waW5nX2NhbGxiYWNrKCk7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLmlkZW50aWZpZXIgPT0gJ19waW5nJykgeyAgICAgLy8gUmFpbHM1LjAuMC5iZXRhMyBiYWNrcG9ydFxuICAgICAgYWN0aW9ucy5fcGluZyhtZXNzYWdlKTsgICAgICAgICAgICAgICAgICAgICAgIC8vIFJhaWxzNS4wLjAuYmV0YTMgYmFja3BvcnRcbiAgICAgIG1ldGhvZHMuYWZ0ZXJfcGluZ19jYWxsYmFjaygpOyAgICAgICAgICAgICAgICAvLyBSYWlsczUuMC4wLmJldGEzIGJhY2twb3J0XG4gICAgfSBlbHNlIGlmICghIWZpbmRBY3Rpb25DYWxsYmFja3NGb3JDaGFubmVsKGNoYW5uZWxfZnJvbShtZXNzYWdlKSwgcGFyYW1zX2Zyb20obWVzc2FnZSkpKSB7XG4gICAgICB2YXIgYWN0aW9uQ2FsbGJhY2tzPSBmaW5kQWN0aW9uQ2FsbGJhY2tzRm9yQ2hhbm5lbChjaGFubmVsX2Zyb20obWVzc2FnZSksIHBhcmFtc19mcm9tKG1lc3NhZ2UpKTtcbiAgICAgIHJvdXRlVG9BY3Rpb25zKGFjdGlvbkNhbGxiYWNrcywgbWVzc2FnZS5tZXNzYWdlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYWN0aW9ucy53c180MDQobWVzc2FnZSk7XG4gICAgfVxuICB9O1xuXG5cbiAgZnVuY3Rpb24gZmluZEFjdGlvbkNhbGxiYWNrc0ZvckNoYW5uZWwoY2hhbm5lbE5hbWUsIHBhcmFtcyl7XG4gICAgcmV0dXJuIChhY3Rpb25zW2NoYW5uZWxOYW1lXSAmJiBhY3Rpb25zW2NoYW5uZWxOYW1lXVtwYXJhbXNdKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNoYW5uZWxfZnJvbShtZXNzYWdlKXtcbiAgICBpZiAobWVzc2FnZSAmJiBtZXNzYWdlLmlkZW50aWZpZXIpIHtcbiAgICAgIHJldHVybiBKU09OLnBhcnNlKG1lc3NhZ2UuaWRlbnRpZmllcikuY2hhbm5lbDtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBwYXJhbXNfZnJvbShtZXNzYWdlKXtcbiAgICB2YXIgcGFyYW1zRGF0YT0gSlNPTi5wYXJzZShtZXNzYWdlLmlkZW50aWZpZXIpLmRhdGE7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHBhcmFtc0RhdGEpO1xuICB9XG5cbiAgdmFyIG1ldGhvZHMgPSB7XG4gICAgcG9zdDogZnVuY3Rpb24obWVzc2FnZSl7XG4gICAgICByZXR1cm4gcm91dGUobWVzc2FnZSk7XG4gICAgfSxcbiAgICBhY3Rpb25zOiBhY3Rpb25zLFxuICAgIGFmdGVyX3BpbmdfY2FsbGJhY2s6IGZ1bmN0aW9uKCl7fVxuICB9O1xuXG4gIHJldHVybiBtZXRob2RzO1xufVxuXG5leHBvcnQgZGVmYXVsdCBBY3Rpb25DYWJsZUNvbnRyb2xsZXI7XG4iLCIvKkBuZ0luamVjdDsqL1xuY29uc3QgQWN0aW9uQ2FibGVTb2NrZXRXcmFuZ2xlciA9IGZ1bmN0aW9uKCRyb290U2NvcGUsIEFjdGlvbkNhYmxlV2Vic29ja2V0LCBBY3Rpb25DYWJsZUNvbmZpZywgQWN0aW9uQ2FibGVDb250cm9sbGVyKSB7XG4gIHZhciByZWNvbm5lY3RJbnRlcnZhbFRpbWU9IDc1Mzc7XG4gIHZhciB0aW1lb3V0VGltZT0gMjAxNDM7XG4gIHZhciB3ZWJzb2NrZXQ9IEFjdGlvbkNhYmxlV2Vic29ja2V0O1xuICB2YXIgY29udHJvbGxlcj0gQWN0aW9uQ2FibGVDb250cm9sbGVyO1xuICB2YXIgX2xpdmU9IGZhbHNlO1xuICB2YXIgX2Nvbm5lY3Rpbmc9IGZhbHNlO1xuICB2YXIgX3JlY29ubmVjdFRpbWVvdXQ9IGZhbHNlO1xuICB2YXIgc2V0UmVjb25uZWN0VGltZW91dD0gZnVuY3Rpb24oKXtcbiAgICBzdG9wUmVjb25uZWN0VGltZW91dCgpO1xuICAgIF9yZWNvbm5lY3RUaW1lb3V0ID0gX3JlY29ubmVjdFRpbWVvdXQgfHwgc2V0VGltZW91dChmdW5jdGlvbigpe1xuICAgICAgaWYgKEFjdGlvbkNhYmxlQ29uZmlnLmRlYnVnKSBjb25zb2xlLmxvZyhcIkFjdGlvbkNhYmxlIGNvbm5lY3Rpb24gbWlnaHQgYmUgZGVhZDsgbm8gcGluZ3MgcmVjZWl2ZWQgcmVjZW50bHlcIik7XG4gICAgICBjb25uZWN0aW9uX2RlYWQoKTtcbiAgICB9LCB0aW1lb3V0VGltZSArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRpbWVvdXRUaW1lIC8gNSkpO1xuICB9O1xuICB2YXIgc3RvcFJlY29ubmVjdFRpbWVvdXQ9IGZ1bmN0aW9uKCl7XG4gICAgY2xlYXJUaW1lb3V0KF9yZWNvbm5lY3RUaW1lb3V0KTtcbiAgICBfcmVjb25uZWN0VGltZW91dD0gZmFsc2U7XG4gIH07XG4gIGNvbnRyb2xsZXIuYWZ0ZXJfcGluZ19jYWxsYmFjaz0gZnVuY3Rpb24oKXtcbiAgICBzZXRSZWNvbm5lY3RUaW1lb3V0KCk7XG4gIH07XG4gIHZhciBjb25uZWN0Tm93PSBmdW5jdGlvbigpe1xuICAgIHdlYnNvY2tldC5hdHRlbXB0X3Jlc3RhcnQoKTtcbiAgICBzZXRSZWNvbm5lY3RUaW1lb3V0KCk7XG4gIH07XG4gIHZhciBzdGFydFJlY29ubmVjdEludGVydmFsPSBmdW5jdGlvbigpe1xuICAgIF9jb25uZWN0aW5nPSBfY29ubmVjdGluZyB8fCBzZXRJbnRlcnZhbChmdW5jdGlvbigpe1xuICAgICAgY29ubmVjdE5vdygpO1xuICAgIH0sIHJlY29ubmVjdEludGVydmFsVGltZSArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHJlY29ubmVjdEludGVydmFsVGltZSAvIDUpKTtcbiAgfTtcbiAgdmFyIHN0b3BSZWNvbm5lY3RJbnRlcnZhbD0gZnVuY3Rpb24oKXtcbiAgICBjbGVhckludGVydmFsKF9jb25uZWN0aW5nKTtcbiAgICBfY29ubmVjdGluZz0gZmFsc2U7XG4gICAgY2xlYXJUaW1lb3V0KF9yZWNvbm5lY3RUaW1lb3V0KTtcbiAgICBfcmVjb25uZWN0VGltZW91dD0gZmFsc2U7XG4gIH07XG4gIHZhciBjb25uZWN0aW9uX2RlYWQ9IGZ1bmN0aW9uKCl7XG4gICAgaWYgKF9saXZlKSB7IHN0YXJ0UmVjb25uZWN0SW50ZXJ2YWwoKTsgfVxuICAgIGlmIChBY3Rpb25DYWJsZUNvbmZpZy5kZWJ1ZykgY29uc29sZS5sb2coXCJzb2NrZXQgY2xvc2VcIik7XG4gICAgJHJvb3RTY29wZS4kYXBwbHkoKTtcbiAgfTtcbiAgd2Vic29ja2V0Lm9uX2Nvbm5lY3Rpb25fY2xvc2VfY2FsbGJhY2s9IGNvbm5lY3Rpb25fZGVhZDtcbiAgdmFyIGNvbm5lY3Rpb25fYWxpdmU9IGZ1bmN0aW9uKCl7XG4gICAgc3RvcFJlY29ubmVjdEludGVydmFsKCk7XG4gICAgc2V0UmVjb25uZWN0VGltZW91dCgpO1xuICAgIGlmIChBY3Rpb25DYWJsZUNvbmZpZy5kZWJ1ZykgY29uc29sZS5sb2coXCJzb2NrZXQgb3BlblwiKTtcbiAgICAkcm9vdFNjb3BlLiRhcHBseSgpO1xuICB9O1xuICB3ZWJzb2NrZXQub25fY29ubmVjdGlvbl9vcGVuX2NhbGxiYWNrPSBjb25uZWN0aW9uX2FsaXZlO1xuICB2YXIgbWV0aG9kcz0ge1xuICAgIHN0YXJ0OiBmdW5jdGlvbigpe1xuICAgICAgaWYgKEFjdGlvbkNhYmxlQ29uZmlnLmRlYnVnKSBjb25zb2xlLmluZm8oXCJMaXZlIFNUQVJURURcIik7XG4gICAgICBfbGl2ZT0gdHJ1ZTtcbiAgICAgIHN0YXJ0UmVjb25uZWN0SW50ZXJ2YWwoKTtcbiAgICAgIGNvbm5lY3ROb3coKTtcbiAgICB9LFxuICAgIHN0b3A6IGZ1bmN0aW9uKCl7XG4gICAgICBpZiAoQWN0aW9uQ2FibGVDb25maWcuZGVidWcpIGNvbnNvbGUuaW5mbyhcIkxpdmUgc3RvcHBlZFwiKTtcbiAgICAgIF9saXZlPSBmYWxzZTtcbiAgICAgIHN0b3BSZWNvbm5lY3RJbnRlcnZhbCgpO1xuICAgICAgc3RvcFJlY29ubmVjdFRpbWVvdXQoKTtcbiAgICAgIHdlYnNvY2tldC5jbG9zZSgpO1xuICAgIH1cbiAgfTtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhtZXRob2RzLCB7XG4gICAgY29ubmVjdGVkOiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIChfbGl2ZSAmJiAhX2Nvbm5lY3RpbmcpO1xuICAgICAgfVxuICAgIH0sXG4gICAgY29ubmVjdGluZzoge1xuICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiAoX2xpdmUgJiYgISFfY29ubmVjdGluZyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBkaXNjb25uZWN0ZWQ6IHtcbiAgICAgIGdldDogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuICFfbGl2ZTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGlmIChBY3Rpb25DYWJsZUNvbmZpZy5hdXRvU3RhcnQpIG1ldGhvZHMuc3RhcnQoKTtcbiAgcmV0dXJuIG1ldGhvZHM7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBBY3Rpb25DYWJsZVNvY2tldFdyYW5nbGVyO1xuIiwiLypAbmdJbmplY3Q7Ki9cbmNvbnN0IEFjdGlvbkNhYmxlV2Vic29ja2V0ID0gZnVuY3Rpb24oJHdlYnNvY2tldCwgQWN0aW9uQ2FibGVDb250cm9sbGVyLCBBY3Rpb25DYWJsZUNvbmZpZykge1xuICB2YXIgY29udHJvbGxlciA9IEFjdGlvbkNhYmxlQ29udHJvbGxlcjtcbiAgdmFyIGRhdGFTdHJlYW0gPSBudWxsO1xuICB2YXIgbWV0aG9kcztcbiAgdmFyIGNvbm5lY3RlZCA9IGZhbHNlO1xuICB2YXIgY3VycmVudENoYW5uZWxzID0gW107XG4gIHZhciBjbG9zZV9jb25uZWN0aW9uID0gZnVuY3Rpb24oKXtcbiAgICBpZiAoZGF0YVN0cmVhbSl7XG4gICAgICBkYXRhU3RyZWFtLmNsb3NlKHtcImZvcmNlXCI6dHJ1ZX0pO1xuICAgICAgZGF0YVN0cmVhbSA9IG51bGw7XG4gICAgICBjb25uZWN0ZWQgPSBmYWxzZTtcbiAgICB9XG4gIH07XG4gIHZhciBzdWJzY3JpYmVfdG8gPSBmdW5jdGlvbihjaGFubmVsLCBkYXRhKXtcbiAgICBpZiAodHlwZW9mKGRhdGEpPT09J3VuZGVmaW5lZCcpIGRhdGEgPSBcIk4vQVwiO1xuICAgIGlmIChBY3Rpb25DYWJsZUNvbmZpZy5kZWJ1ZykgY29uc29sZS5sb2coXCItPiBzdWJzY3JpYmluZyB0bzogXCIgKyBjaGFubmVsKTtcbiAgICByZXR1cm4gbmV3X2RhdGFfc3RyZWFtKCkuc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIFwiY29tbWFuZFwiOiBcInN1YnNjcmliZVwiLFxuICAgICAgICBcImlkZW50aWZpZXJcIjogSlNPTi5zdHJpbmdpZnkoe1wiY2hhbm5lbFwiOiBjaGFubmVsLCBcImRhdGFcIjogZGF0YX0pXG4gICAgICB9KSk7XG4gIH07XG4gIHZhciB1bnN1YnNjcmliZV9mcm9tID0gZnVuY3Rpb24oY2hhbm5lbCwgZGF0YSl7XG4gICAgaWYgKHR5cGVvZihkYXRhKT09PSd1bmRlZmluZWQnKSBkYXRhID0gXCJOL0FcIjtcbiAgICBpZiAoQWN0aW9uQ2FibGVDb25maWcuZGVidWcpIGNvbnNvbGUubG9nKFwiPC0gdW5zdWJzY3JpYmluZyBmcm9tOiBcIiArIGNoYW5uZWwpO1xuICAgIHJldHVybiBuZXdfZGF0YV9zdHJlYW0oKS5zZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgXCJjb21tYW5kXCI6IFwidW5zdWJzY3JpYmVcIixcbiAgICAgICAgXCJpZGVudGlmaWVyXCI6IEpTT04uc3RyaW5naWZ5KHtcImNoYW5uZWxcIjogY2hhbm5lbCwgXCJkYXRhXCI6IGRhdGF9KVxuICAgICAgfSkpO1xuICB9O1xuICB2YXIgc2VuZF90byA9IGZ1bmN0aW9uKGNoYW5uZWwsIGRhdGEsIG1lc3NhZ2UsIGFjdGlvbil7XG4gICAgaWYgKHR5cGVvZihkYXRhKT09PSd1bmRlZmluZWQnKSBkYXRhID0gXCJOL0FcIjtcbiAgICBpZiAoQWN0aW9uQ2FibGVDb25maWcuZGVidWcpIGNvbnNvbGUubG9nKFwiPT4gc2VuZGluZyB0bzogXCIgKyBjaGFubmVsKTtcbiAgICByZXR1cm4gbmV3X2RhdGFfc3RyZWFtKCkuc2VuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIFwiY29tbWFuZFwiOiBcIm1lc3NhZ2VcIixcbiAgICAgICAgXCJpZGVudGlmaWVyXCI6IEpTT04uc3RyaW5naWZ5KHtcImNoYW5uZWxcIjogY2hhbm5lbCwgXCJkYXRhXCI6IGRhdGF9KSxcbiAgICAgICAgXCJkYXRhXCI6IEpTT04uc3RyaW5naWZ5KHtcIm1lc3NhZ2VcIjogbWVzc2FnZSwgXCJhY3Rpb25cIjogYWN0aW9ufSlcbiAgICAgIH0pKTtcbiAgfTtcbiAgdmFyIG5ld19kYXRhX3N0cmVhbSA9IGZ1bmN0aW9uKCl7XG4gICAgaWYoZGF0YVN0cmVhbSA9PT0gbnVsbCkge1xuICAgICAgZGF0YVN0cmVhbSA9ICR3ZWJzb2NrZXQoQWN0aW9uQ2FibGVDb25maWcud3NVcmkpO1xuICAgICAgZGF0YVN0cmVhbS5vbkNsb3NlKGZ1bmN0aW9uKGFyZyl7XG4gICAgICAgIGNsb3NlX2Nvbm5lY3Rpb24oKTtcbiAgICAgICAgY29ubmVjdGVkID0gZmFsc2U7XG4gICAgICAgIG1ldGhvZHMub25fY29ubmVjdGlvbl9jbG9zZV9jYWxsYmFjaygpO1xuICAgICAgfSk7XG4gICAgICBkYXRhU3RyZWFtLm9uT3BlbihmdW5jdGlvbihhcmcpe1xuICAgICAgICBjb25uZWN0ZWQgPSB0cnVlO1xuICAgICAgICBjdXJyZW50Q2hhbm5lbHMuZm9yRWFjaChmdW5jdGlvbihjaGFubmVsKXsgc3Vic2NyaWJlX3RvKGNoYW5uZWwubmFtZSwgY2hhbm5lbC5kYXRhKTsgfSk7XG4gICAgICAgIG1ldGhvZHMub25fY29ubmVjdGlvbl9vcGVuX2NhbGxiYWNrKCk7XG4gICAgICB9KTtcbiAgICAgIGRhdGFTdHJlYW0ub25NZXNzYWdlKGZ1bmN0aW9uKG1lc3NhZ2UpIHsgICAvL2Fycml2aW5nIG1lc3NhZ2UgZnJvbSBiYWNrZW5kXG4gICAgICAgIGNvbnRyb2xsZXIucG9zdChKU09OLnBhcnNlKG1lc3NhZ2UuZGF0YSkpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHJldHVybiBkYXRhU3RyZWFtO1xuICB9O1xuICBtZXRob2RzID0ge1xuICAgIGNvbm5lY3RlZDogZnVuY3Rpb24oKXsgcmV0dXJuIGNvbm5lY3RlZDsgfSxcbiAgICBhdHRlbXB0X3Jlc3RhcnQ6IGZ1bmN0aW9uKCl7XG4gICAgICBjbG9zZV9jb25uZWN0aW9uKCk7XG4gICAgICBuZXdfZGF0YV9zdHJlYW0oKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG4gICAgY3VycmVudENoYW5uZWxzOiBjdXJyZW50Q2hhbm5lbHMsXG4gICAgY2xvc2U6IGZ1bmN0aW9uKCl7IHJldHVybiBjbG9zZV9jb25uZWN0aW9uKCk7IH0sXG4gICAgb25fY29ubmVjdGlvbl9jbG9zZV9jYWxsYmFjazogZnVuY3Rpb24oKXt9LFxuICAgIG9uX2Nvbm5lY3Rpb25fb3Blbl9jYWxsYmFjazogZnVuY3Rpb24oKXt9LFxuICAgIHN1YnNjcmliZTogZnVuY3Rpb24oY2hhbm5lbCwgZGF0YSl7XG4gICAgICBjdXJyZW50Q2hhbm5lbHMucHVzaCh7bmFtZTogY2hhbm5lbCwgZGF0YTogZGF0YX0pO1xuICAgICAgcmV0dXJuICh0aGlzLmNvbm5lY3RlZCgpICYmIHN1YnNjcmliZV90byhjaGFubmVsLCBkYXRhKSk7XG4gICAgfSxcbiAgICB1bnN1YnNjcmliZTogZnVuY3Rpb24oY2hhbm5lbCwgZGF0YSl7XG4gICAgICBmb3IodmFyIGk9MDsgaTxjdXJyZW50Q2hhbm5lbHMubGVuZ3RoOyBpKyspeyBpZiAoY3VycmVudENoYW5uZWxzW2ldLm5hbWU9PT1jaGFubmVsKSB7Y3VycmVudENoYW5uZWxzLnNwbGljZShpLCAxKTt9IH1cbiAgICAgIHJldHVybiAodGhpcy5jb25uZWN0ZWQoKSAmJiB1bnN1YnNjcmliZV9mcm9tKGNoYW5uZWwsIGRhdGEpKTtcbiAgICB9LFxuICAgIHNlbmQ6IGZ1bmN0aW9uKGNoYW5uZWwsIGRhdGEsIG1lc3NhZ2UsIGFjdGlvbil7XG4gICAgICBpZiAoQWN0aW9uQ2FibGVDb25maWcuZGVidWcpIGNvbnNvbGUubG9nKFwic2VuZCByZXF1ZXN0ZWRcIik7XG4gICAgICByZXR1cm4gKHRoaXMuY29ubmVjdGVkKCkgJiYgc2VuZF90byhjaGFubmVsLCBkYXRhLCBtZXNzYWdlLCBhY3Rpb24pKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBtZXRob2RzO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgQWN0aW9uQ2FibGVXZWJzb2NrZXQ7XG4iLCJpbXBvcnQgQWN0aW9uQ2FibGVDaGFubmVsIGZyb20gJy4vYWN0aW9uQ2FibGVDaGFubmVsJztcbmltcG9ydCBBY3Rpb25DYWJsZUNvbmZpZyBmcm9tICcuL2FjdGlvbkNhYmxlQ29uZmlnJztcbmltcG9ydCBBY3Rpb25DYWJsZUNvbnRyb2xsZXIgZnJvbSAnLi9hY3Rpb25DYWJsZUNvbnRyb2xsZXInO1xuaW1wb3J0IEFjdGlvbkNhYmxlU29ja2V0V3JhbmdsZXIgZnJvbSAnLi9hY3Rpb25DYWJsZVNvY2tldFdyYW5nbGVyJztcbmltcG9ydCBBY3Rpb25DYWJsZVdlYnNvY2tldCBmcm9tICcuL2FjdGlvbkNhYmxlV2Vic29ja2V0JztcblxuYW5ndWxhci5tb2R1bGUoJ25nQWN0aW9uQ2FibGUnLCBbJ25nV2Vic29ja2V0J10pXG4gIC5zZXJ2aWNlKCdBY3Rpb25DYWJsZUNoYW5uZWwnLCBBY3Rpb25DYWJsZUNoYW5uZWwpXG4gIC5zZXJ2aWNlKCdBY3Rpb25DYWJsZUNvbmZpZycsIEFjdGlvbkNhYmxlQ29uZmlnKVxuICAuc2VydmljZSgnQWN0aW9uQ2FibGVDb250cm9sbGVyJywgQWN0aW9uQ2FibGVDb250cm9sbGVyKVxuICAuc2VydmljZSgnQWN0aW9uQ2FibGVTb2NrZXRXcmFuZ2xlcicsIEFjdGlvbkNhYmxlU29ja2V0V3JhbmdsZXIpXG4gIC5zZXJ2aWNlKCdBY3Rpb25DYWJsZVdlYnNvY2tldCcsIEFjdGlvbkNhYmxlV2Vic29ja2V0KTtcbiJdfQ==
