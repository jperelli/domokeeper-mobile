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

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {

  });
})


// TODO: move this to another file
angular.module('app.controllers', [])

.controller('MainCtrl', function($scope, $http, $q) {
  $scope.port = 43569;
  if (window.networkinterface && window.networkinterface.getIPAddress)
    networkinterface.getIPAddress(function (ip) {
      $scope.ip = ip;
      $scope.net = ip.split('.').splice(0,3).join('.');
    });

  $scope.scannet = function() {
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
        $scope.servers.push(response.config.url);
        $scope.scani++;
      }, function errorCallback(response) {
        $scope.scani++;
      }));
    }
    $q.all(scanners).then(function(){$scope.scanning = false})
  }
})