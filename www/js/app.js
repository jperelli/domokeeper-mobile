function initApp() {
  if(window.cordova && window.cordova.plugins.Keyboard) {
    cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
    cordova.plugins.Keyboard.disableScroll(true);
  }
  if(window.StatusBar) {
    StatusBar.styleDefault();
  }

  // after all initialization, start angular
  angular.bootstrap(document.querySelector('body'), ['app']);
}

angular.module('app', ['ionic', 'app.controllers'])

.filter('urlencode', function() {
  return window.encodeURIComponent;
})

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {

  });
})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  .state('index', {
    url: '/index',
    templateUrl: 'templates/index.html',
    cache: false,
    controller: 'IndexCtrl'
  })

  .state('server-detail', {
    url: '/server/:id',
    templateUrl: 'templates/server-detail.html',
    cache: false,
    controller: 'ServerDetailCtrl'
  })

  .state('install', {
    url: '/server/:id_server/install',
    templateUrl: 'templates/install.html',
    cache: false,
    controller: 'InstallCtrl'
  })

  .state('plugin-detail', {
    url: '/server/:id_server/plugin/:id',
    templateUrl: 'templates/plugin-detail.html',
    cache: false,
    controller: 'PluginDetailCtrl'
  })

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/index');

});

// TODO: move this to another file
angular.module('app.controllers', [])

.controller('IndexCtrl', function($scope, $http, $q, $timeout) {
  $scope.port = 43569;
  function getNet() {
    if (window.networkinterface && window.networkinterface.getIPAddress)
      networkinterface.getIPAddress(function (ip) {
        $scope.ip = ip;
        $scope.net = ip.split('.').splice(0,3).join('.');
      });
    else {
      // for testing purposes only
      $scope.net = '192.168.0';
    }
  }
  getNet();

  $scope.scannet = function() {
    getNet();
    if ($scope.net) {
      $scope.servers = [];
      $scope.scanning = true;
      var scanners = [];
      $scope.scani = 0;
      for (var i = 1; i < 255; i++) {
        scanners.push($http({
          method: 'GET',
          url: 'http://' + $scope.net + '.' + i + ':' + $scope.port + '/',
          timeout: 1000
        }).then(function successCallback(response) {
          var ip = response.config.url.split('/')[2].split(':')[0];
          var port = response.config.url.split('/')[2].split(':')[1];
          if (response.data.domokeeper)
            $scope.servers.push({
              url: response.config.url,
              ip: ip,
              port: port,
              hostname: response.data.hostname,
              version: response.data.domokeeper
            });
          $scope.scani++;
        }, function errorCallback(response) {
          $scope.scani++;
        }));
      }
      $q.all(scanners).then(function(){$scope.scanning = false})
    }
  }

  $timeout($scope.scannet,0);

  if (navigator && navigator.splashscreen)
    $timeout(navigator.splashscreen.hide, 200);

})

.controller('ServerDetailCtrl', function($scope, $http, $stateParams, $ionicLoading) {
  $ionicLoading.show({template: 'Retrieving plugins<br><br><ion-spinner></ion-spinner>'})

  $scope.server = {
    ip: $stateParams.id.split(':')[0],
    port: $stateParams.id.split(':')[1]
  };

  $http({
    method: 'GET',
    url: 'http://'+$scope.server.ip+':'+$scope.server.port + '/plugins/'
  }).then(function successCallback(response) {
    $scope.plugins = response.data;
    $ionicLoading.hide();
  }, function errorCallback(response) {
    $ionicLoading.hide();
    alert('error querying /plugins/');
  })

})

.controller('PluginDetailCtrl', function($scope, $http, $stateParams, $ionicLoading, $ionicPopup) {
  $ionicLoading.show({template: 'Retrieving plugin<br><br><ion-spinner></ion-spinner>'})

  $scope.server = {
    ip: $stateParams.id_server.split(':')[0],
    port: $stateParams.id_server.split(':')[1]
  };

  $scope.plugin = {
    name: $stateParams.id
  }

  $http({
    method: 'GET',
    url: 'http://'+$scope.server.ip+':'+$scope.server.port + '/plugins/' + $stateParams.id
  }).then(function successCallback(response) {
    $scope.plugin = response.data;
    $scope.plugin.name = $stateParams.id.replace('domokeeper-plugin-', '');
    $ionicLoading.hide();
  }, function errorCallback(response) {
    $ionicLoading.hide();
    alert('error querying /plugin/'+$stateParams.id);
  })

  $scope.action = function(action) {
    $ionicLoading.show({template: 'Executing '+$scope.plugin.name+'<br><br>'+action+'<br><br><ion-spinner></ion-spinner>'})
    $http({
      method: 'POST',
      url: 'http://'+$scope.server.ip+':'+$scope.server.port + '/plugins/domokeeper-plugin-' + $scope.plugin.name + '/action/' + action,
    }).then(function successCallback(response) {
      $ionicLoading.hide();
    }, function errorCallback(response) {
      $ionicLoading.hide();
      alert('error executing action ' + $scope.plugin.name + ' > ' + action);
    })
  }

  $scope.sensor = function(sensor) {
    $ionicLoading.show({template: 'Executing '+$scope.plugin.name+'<br><br>'+sensor+'<br><br><ion-spinner></ion-spinner>'})
    $http({
      method: 'GET',
      url: 'http://'+$scope.server.ip+':'+$scope.server.port + '/plugins/domokeeper-plugin-' + $scope.plugin.name + '/sensor/' + sensor,
    }).then(function successCallback(response) {
      $ionicLoading.hide();
      $ionicPopup.alert({
        title: sensor + ' value',
        template: response.data
      });
    }, function errorCallback(response) {
      $ionicLoading.hide();
      alert('error getting data from sensor ' + $scope.plugin.name + ' > ' + sensor);
    })
  }

  $scope.remove = function(plugin) {
    $ionicPopup.confirm({
      title: 'Remove plugin',
      template: 'Remove plugin ' + plugin.name + '?',
      okText: 'Yes',
      cancelText: 'No'
    }).then(function(res) {
      if (res) {
        $ionicLoading.show({template: 'Removing '+plugin.name+'<br><br><ion-spinner></ion-spinner>'})
        $http({
          method: 'DELETE',
          url: 'http://'+$scope.server.ip+':'+$scope.server.port + '/plugins/domokeeper-plugin-' + plugin.name,
        }).then(function successCallback(response) {
          $ionicLoading.hide();
        }, function errorCallback(response) {
          $ionicLoading.hide();
          alert('error deleting ' + plugin.name);
        })
      }
    });
  }

})

.controller('InstallCtrl', function($scope, $http, $stateParams, $ionicLoading, $ionicPopup) {
  $ionicLoading.show({template: 'Retrieving plugins<br><br><ion-spinner></ion-spinner>'})

  $scope.server = {
    ip: $stateParams.id_server.split(':')[0],
    port: $stateParams.id_server.split(':')[1]
  };

  $http({
    method: 'GET',
    url: 'http://'+$scope.server.ip+':'+$scope.server.port + '/plugins/install/'
  }).then(function successCallback(response) {
    $scope.plugins = response.data;
    $ionicLoading.hide();
  }, function errorCallback(response) {
    $ionicLoading.hide();
    alert('error retrieving /install/');
  })


  $scope.install = function(plugin) {
    $ionicPopup.confirm({
      title: 'Install plugin',
      template: 'Install plugin ' + plugin.name + ' v' + plugin.version + '?',
      okText: 'Yes',
      cancelText: 'No'
    }).then(function(res) {
      if (res) {
        $ionicLoading.show({template: 'Installing '+plugin.name+'<br><br><ion-spinner></ion-spinner>'})
        $http({
          method: 'POST',
          url: 'http://'+$scope.server.ip+':'+$scope.server.port + '/plugins/install/' + plugin.name,
        }).then(function successCallback(response) {
          $ionicLoading.hide();
        }, function errorCallback(response) {
          $ionicLoading.hide();
          alert('error installing ' + plugin.name);
        })
      }
    });
  }

})