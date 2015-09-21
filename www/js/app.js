angular.module('letsy', 
    [
      'ionic',
      'ngCordova',
      'letsy.EventControllers',
      'letsy.LoginControllers'
    ]
  )

.run(function
    (
      $ionicPlatform, 
      $rootScope, 
      $state, 
      $filter,
      $ionicPopup, 
      $timeout) {

  $ionicPlatform.ready(function() {
try {

    $rootScope.isOffline = false;
    $rootScope.isIOS = ionic.Platform.isIOS();

    if(window.cordova) {
        alert('Entrou no ionicPlatform.ready!');

      if(cordova.plugins.Keyboard) {
        cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
        cordova.plugins.Keyboard.disableScroll(true);
      }
    }
    if(ionic.Platform.isAndroid()) {
        StatusBar.backgroundColorByHexString("#125688"); //themeBackgroundColor
    }

    document.addEventListener("online", function() {
      loadMapsApi();
    });
    document.addEventListener("resume", function() {
      loadMapsApi();
    });
    document.addEventListener("pause", function() {
      alert('App paused');
    });
    loadMapsApi();

    //PushService.init();
}
catch(err) {
    alert('ionicPlatform.ready Error: ',err);
}
  })

  function loadMapsApi () {
    return;

      if( $rootScope.isOffline || typeof google.maps !== 'undefined') {
          return;
      }
      
      var script_map = document.createElement('script');
      script_map.type = 'text/javascript';
      script_map.src = 'https://maps.googleapis.com/maps/api/js?';
      document.body.appendChild(script_map);

      var script_places = document.createElement('script');
      script_places.type = 'text/javascript';
      script_places.src = 'https://maps.googleapis.com/maps/api/js?libraries=places';
      document.body.appendChild(script_places);

  }


  // UI Router Authentication Check
  $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams){
    
    if (toState.data.authenticate && !Parse.User.current()) {
      // User isn’t authenticated
      console.log('Redirect to login');
      $state.transitionTo("login");
      event.preventDefault(); 
    }
    else {
    }
  });
})


.config(function($stateProvider, $urlRouterProvider){
    $stateProvider
    .state('events',{
      url:'/events',
      templateUrl:'views/events.html',
      controller:'EventsListController',
      data: {
        authenticate: true
      }
    })
    .state('login', {
      url: '/login',
      templateUrl: 'views/login.html',
      controller: 'LoginController',
      data: {
        authenticate: false
      }
    });

  // Send to events if the URL was not found
  $urlRouterProvider.otherwise('/events');
}); 