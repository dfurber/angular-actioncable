angular.module('ngActionCable').factory('ActionCableConfig', function() {
  var defaultWsUri= 'wss://please.add.an.actioncable.meta.tag.invalid:12345/path/to/cable';
  var _wsUri;
  var config= {
    autoStart: false,
    debug: true
  };

  Object.defineProperty(config, 'wsUri', {
    get: function () {
      _wsUri= _wsUri || actioncable_meta_tag_content() ||  defaultWsUri;
      return _wsUri;
    },
    set: function(newWsUri) {
      // devlog(`Setting new wsUri! ${newWsUri}`);
      _wsUri= newWsUri;
      return _wsUri;
    }
  });
  return config;
  function actioncable_meta_tag_content() {
    return _wsUri;
  }
});
