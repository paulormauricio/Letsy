angular.module('letsy.LoginControllers', [])

  .controller('LoginController', 
    [
      '$scope', 
      '$state',
      '$filter',
      'Event',
      'PushService',
      'Language',
      'ErrorHandler',
      'PushService',
      'Theme',
      function(
        $scope, 
        $state,
        $filter,
        Event,
        PushService,
        Language,
        ErrorHandler,
        PushService,
        Theme
      )
    {
try {
    if( Parse.User.current() ) {
      //alert('Users logged in. Redirect to Events');
      $state.transitionTo("events");
    }

    var fbLogged = new Parse.Promise();
      
    var fbLoginSuccess = function(response) {
      if (!response.authResponse){
        fbLoginError("Cannot find the authResponse");
        return;
      }
      var expDate = new Date(
        new Date().getTime() + response.authResponse.expiresIn * 1000
      ).toISOString();

      var authData = {
        id: String(response.authResponse.userID),
        access_token: response.authResponse.accessToken,
        expiration_date: expDate
      }
      fbLogged.resolve(authData);
      console.log(response);
    };

    var fbLoginError = function(error){
      //alert('fbLoginError:'+error.message);
      fbLogged.reject(error);
      $scope.isLoginPressed = false;
    };

    $scope.login = function() {
      $scope.isLoginPressed = true;

//alert('chegou ao Login');
      if (!window.cordova or true) {
        facebookConnectPlugin.browserInit('1536111309938547');
      }
      facebookConnectPlugin.login(['email, user_friends'], fbLoginSuccess, fbLoginError);
//alert('passou o facebookConnectPlugin');
      fbLogged.then( function(authData) {
//alert('fbLogged Promised');
        return Parse.FacebookUtils.logIn(authData);
      })
      .then( function(userObject) {
//alert('FacebookUtils.logIn');
        //Get User Info
        facebookConnectPlugin.api('/me', null, 
          function(response) {
            console.log('Facebook PersonalData: ', response);
            userObject.set('name', response.name);
            userObject.set('email', response.email);
            userObject.set('facebookId', response.id);
            if( response.gender ) userObject.set('gender', response.gender);
            if( response.first_name ) userObject.set('first_name', response.first_name);
            if( response.last_name ) userObject.set('last_name', response.last_name);
            if( response.locale ) userObject.set('locale', response.locale.toLowerCase() );

            userObject.save(null, null, function(error) {
              ErrorHandler.error('LoginController', 'userObject.save()',error.message);
            });
          },
          function(error) {
            ErrorHandler.error('LoginController', 'facebookConnectPlugin.api(/me)',error);
            $scope.isLoginPressed = false;
          }
        );
        //Get Friends
        facebookConnectPlugin.api('/me/friends?limit=5000', null, 
          function(response) {
            console.log('Facebook Friends:', response);

            var Friend = null;
            var User = userObject;

            for (i = 0; i < response.data.length; i++) { 

              Friend = Parse.Object.extend("User");
              
              var query = new Parse.Query(Friend);
              query.equalTo("facebookId", response.data[i].id);
              query.first({
                success: function(object) {

                  if( object ) {
                    Friend = object;

                    var UserFriend = Parse.Object.extend("Friend");

                    var query = new Parse.Query(UserFriend);
                    query.equalTo("User", User);
                    query.equalTo("Friend", Friend);
                    query.first({
                      success: function(object) {
                        // IF friends relation was not added before, then store relationship
                        if (object === undefined) {
                          var UserFriend = Parse.Object.extend("Friend");
                          var UserRelation = new UserFriend();
                          UserRelation.set('User', User);
                          UserRelation.set('Friend', Friend);
                          UserRelation.set('isActive', true);

                          UserRelation.save(null, null, function(error){ErrorHandler.error('LoginController', 'facebookConnectPlugin.api(/me/friends) -> UserRelation.save()',error.message);});

                          var FriendRelation = new UserFriend();
                          FriendRelation.set('User', Friend);
                          FriendRelation.set('Friend', User);
                          FriendRelation.set('isActive', true);
                          FriendRelation.save(null, null, function(error){ErrorHandler.error('LoginController', 'facebookConnectPlugin.api(/me/friends) -> FriendRelation.save()',error.message);});

                          if( Friend.get('device_token') ) {
                            Language.set(Friend.get('locale') );
                            var token = [Friend.get('device_token')];
                            var message = Friend.get('first_name') + ' ' + Friend.get('last_name') + $filter('translate')('event_push_new_friend');
                            PushService.send(token, message);
                          }

                          console.log('Save Friends Success');
                        }
                      }
                    });

                  }

                },
                error: function(error) {
//alert('Login error: '+ error);
                  ErrorHandler.error('LoginController', 'facebookConnectPlugin.api(/me/friends) -> FriendRelation.save()',error.message);
                  $scope.isLoginPressed = false;
                }
              });

            }
          },
          function(error) {
            ErrorHandler.error('LoginController', 'Parse.Query.first()',error.message);
            $scope.isLoginPressed = false;
          }
        );
        

        PushService.init();

        Language.set();

        Theme.init();

        Event.isForceGetEvents = true;

        $state.go('events');
      })

    };

}
catch(error) {
  ErrorHandler.error('LoginController', 'Login Error',error.message);
//alert('Facebook Error: '+error.message);
}
  }]);