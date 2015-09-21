angular.module('letsy.SettingsControllers', [])

  .controller('SettingsController', 
    [
      '$scope', 
      '$state', 
      '$filter', 
      '$ionicActionSheet',
      '$timeout',
      '$translate',
      '$ionicPopup',
      'Settings', 
      'Event',
      'Chat',
      function(
        $scope, 
        $state, 
        $filter, 
        $ionicActionSheet,
        $timeout,
        $translate,
        $ionicPopup,
        Settings,
        Event,
        Chat
      )
    {
console.log('');
console.log('<<<<<<-----------   Settings Screen  ---------->>>>>');

    $scope.locale = Parse.User.current().get('locale').toLowerCase();

    $scope.changeLocale = function() {

      var locales = Settings.getAll();
      console.log('locales: ', locales);
      // Show the action sheet
      var hideSheet = $ionicActionSheet.show({
          buttons: locales ,
          titleText: $filter('translate')('locale_change'),
          cancelText: $filter('translate')('cancel'),
          cancel: function() {
              // add cancel code..
          },
          buttonClicked: function(index) {
              console.log('Button clicked. (Index, locale) = ', index,',',locales[index].code);

              Parse.User.current().set('locale', locales[index].code);
              $scope.locale = locales[index].code;

              $translate.use( locales[index].code );

              hideSheet();
              return;
          }
      });

      // For example's sake, hide the sheet after two seconds
      $timeout(function() {
          hideSheet();
      }, 8000);

    }

    $scope.logout = function() {
      console.log('Logout');


      $ionicPopup.confirm({
        title: $filter('translate')('logout')+'?',
        template: $filter('translate')('logout_confirm'),
        okText: $filter('translate')('continue'),
        okType: 'button-assertive',
        cancelText: $filter('translate')('cancel'),
        cancelType: 'button-stable'
      }).then(function(result) {
        if(result) {
          facebookConnectPlugin.logout(
            function (success) {
              $state.go('login');
            },
            function (failure) { console.log(failure) }
          );
          
          Parse.User.logOut();

          Event.destroy();
          Chat.destroy();

          //ionic.Platform.exitApp();
          
          $state.go('login');
        }

      });
       
    };
    
  }]);
