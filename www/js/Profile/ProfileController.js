angular.module('letsy.ProfileControllers', [])

.controller('ProfileController', ['$scope', '$state', 'Profile', function($scope, $state, Profile) {

	console.log('');
	console.log('<<<<<<-----------   Settings Screen  ---------->>>>>');

    $scope.facebookId = Parse.User.current().get('facebookId');

    Profile.getTotalFriends().then( function(count){
      $scope.total_friends = count;
    });

    $scope.sendPush = function() {
    	alert('Send push notification');

    	PushService.send();
    }

    $scope.teste = function() {
    	//PushService.init();
    }

    
  }]);
