angular.module('letsy.EventControllers',[])

.controller('EventsListController',
    [
        '$window', 
        '$state', 
        '$scope', 
        '$ionicLoading', 
        '$filter',
        function( 
            $window, 
            $state, 
            $scope,
            $ionicLoading,
            $filter
        )
    {

console.log('');
alert('<<<<<<-----------   Events Screen  ---------->>>>>');


      Parse.User.logOut();
      
      $state.go('login');
}]);