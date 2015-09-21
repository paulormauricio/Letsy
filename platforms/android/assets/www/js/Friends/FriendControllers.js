angular.module('letsy.FriendControllers',[])

.controller('FriendsListController',
	[
		'$scope',
		'$ionicLoading', 
		'Friend',
		'ErrorHandler',
		function(
			$scope,
			$ionicLoading,
			Friend,
			ErrorHandler
		)
	{
    
    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    Friend.getAll().then(function(objects) {
    	$scope.objects = objects;
        
    })
    .catch(function(error) {
    	console.log('Friends Error: ', error);
    	ErrorHandler.error('FriendsListController', 'riend.getAll()',error);
    })
    .finally(function(){
    	$ionicLoading.hide();
    });

}]);