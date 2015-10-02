angular.module('letsy', 
    [
      'ionic',
      'ngCordova',
      'ionic.service.core',
      'ionic.service.push',
      'ion-autocomplete',
      'ion-sticky',
      'ngGPlaces',
      'monospaced.elastic',
      'letsy.translations',
      'letsy.EventControllers',
      'letsy.EventServices',
      'letsy.WeatherServices',
      'letsy.Storage',
      'letsy.LoginControllers',
      'letsy.ProfileControllers',
      'letsy.ProfileServices',
      'letsy.SettingsControllers',
      'letsy.SettingsServices',
      'letsy.FriendControllers',
      'letsy.FriendServices',
      'letsy.ChatServices',
      'letsy.filters',
      'common.ErrorHandlerServices',
      'common.GeolocationServices',
      'common.Directives',
      'common.DynamicBackgroundImage',
      'letsy.IonicServices'
    ]
  )

.run(function
    (
      $ionicPlatform, 
      $rootScope, 
      $state, 
      $filter,
      $ionicPopup, 
      $timeout,
      $translate, 
      Language, 
      PushService,
      Event,
      ErrorHandler) {

  $ionicPlatform.ready(function() {

    $rootScope.isOffline = false;
    $rootScope.isIOS = ionic.Platform.isIOS();

    Language.set();

    if(window.cordova) {
        //alert('Entrou no ionicPlatform.ready!');

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
    // document.addEventListener("resume", function() { loadMapsApi(); });
    // document.addEventListener("pause", function() { });
    loadMapsApi();

    PushService.init();
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

  // listen for Offline event
  $rootScope.$on('$cordovaNetwork:offline', function(event, networkState) {
    //var offlineState = networkState;

    $ionicPopup.alert({
      title: $filter('translate')('internet_disconnected'),
      template: $filter('translate')('internet_disconnected_desc'),
      okText: $filter('translate')('continue'),
      okType: 'button-light'
    }).then(function() {

      $rootScope.isOffline = true;

    });

  });

  // listen for Online event
  $rootScope.$on('$cordovaNetwork:online', function(event, networkState){
      $rootScope.isOffline = false;
      //PushService.init();
  });

  // UI Router Authentication Check
  $rootScope.$on("$stateChangeStart", function(event, toState, toParams, fromState, fromParams){
    
    if (toState.data.authenticate && !Parse.User.current()) {
      // User isn’t authenticated
      console.log('Redirect to login');
      $state.transitionTo("login");
      event.preventDefault(); 
    }
    else {
      Language.set();
    }
  });
})

.config(['$ionicAppProvider', function($ionicAppProvider) {
  $ionicAppProvider.identify({
    app_id: '8018ff6a',
    api_key: '1db15076a7bbfda81a4f728a1f904332e490096b9140fb4d',
    dev_push: false
  });
}])

.config(function($stateProvider, $urlRouterProvider){
    $stateProvider
    .state('events',{
      url:'/events',
      templateUrl:'views/events.html',
      controller:'EventsListController',
      data: {
        authenticate: true
      }
    }).state('editEventName',{
      url:'/event/editName/:isNew/:objectId',
      controller:'EventEditNameController',
      templateUrl:'views/editEventName.html',
      cache: false,
      data: {
        authenticate: true
      }
    })
    .state('editEventFriends',{
      url:'/event/editFriends/:isNew/:objectId',
      controller:'EventEditParticipantsController',
      templateUrl:'views/editEventFriends.html',
      cache: false,
      data: {
        authenticate: true
      }
    })
    .state('editEventPlace',{
      url:'/event/editPlace/:objectId',
      controller:'EventEditPlaceController',
      templateUrl:'views/editEventPlace.html',
      data: {
        authenticate: true
      }
    })
    .state('editEventDate',{
      url:'/event/editDate/:isNew/:objectId',
      controller:'EventEditDateController',
      templateUrl:'views/editEventDate.html',
      cache: false,
      data: {
        authenticate: true
      }
    })
    .state('showEvent',{
      url:'/event/:objectId',
      controller:'EventShowController',
      templateUrl:'views/showEvent.html',
      cache: false,
      data: {
        authenticate: true
      }
    })
    .state('showEventMap',{
      url:'/event/:objectId/map',
      controller:'EventShowMapController',
      templateUrl:'views/showEventMap.html',
      cache: false,
      data: {
        authenticate: true
      }
    })
    .state('profile',{
      url:'/profile',
      templateUrl:'views/profile.html',
      controller:'ProfileController',
      data: {
        authenticate: true
      }
    })
    .state('settings',{
      url:'/settings',
      templateUrl:'views/settings.html',
      controller:'SettingsController',
      data: {
        authenticate: true
      }
    })
    .state('friends',{
      url:'/friends',
      templateUrl:'views/friends.html',
      controller:'FriendsListController',
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
})
.constant('global_variables',{
  app_version: 0.01,
  debug: true
});