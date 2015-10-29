angular.module('letsy.PushServices',[])

.factory('PushService',
	[
		'$ionicUser', 
		'$rootScope', 
		'$ionicPush', 
		'$http', 
		'ErrorHandler',
		function(
			$ionicUser, 
			$rootScope, 
			$ionicPush, 
			$http,
			ErrorHandler
		)
	{

	var credentials = {
	    appId : "8018ff6a",
	    privateKey : "4c8e6051ce138fc060f8a6f8679ea3668e99be6a05c45cb3"
	};

	var message = {
		"tokens":[],
		"notification":{
			"alert": undefined,
			"ios":{
				"badge":1,
				"sound":"ping.aiff",
				"expiry": undefined,
				"priority": 10,
				"contentAvailable": true,
				"payload":{
				}
			},
			"android":{
				"collapseKey":"foo",
				"delayWhileIdle":true,
				"timeToLive": undefined,
				"payload":{
				}
			}
		}
	};


	$rootScope.$on('$cordovaPush:tokenReceived', function(event, data) {
		//alert("Successfully registered token " + data.token);
		console.log('Ionic Push: Got token ', data.token, data.platform);
		$rootScope.myToken = data.token;

		ErrorHandler.debug('PushService', 'PushService.$cordovaPush:tokenReceived',data);

		Parse.User.current().set('device_token', data.token);
		Parse.User.current().set('device_platform', data.platform);
		Parse.User.current().set('app_version', 0.01);
		Parse.User.current().save();
		
	});


	return {

		init: function() {
 
			if(!Parse.User.current()) return;

		    console.log('Ionic User: Identifying with Ionic User service');

		    var user = $ionicUser.get();
		    if(!user.user_id) {
		      // Set your user_id here, or generate a random one.
		      //user.user_id = $ionicUser.generateGUID();
		      user.user_id = Parse.User.current().id;
		    };

		    // Add some metadata to your user object.
		    angular.extend(user, {
		      name: Parse.User.current().get('name'),
		      app_version: 0.1
		    });

		    // Identify your user with the Ionic User Service
		    $ionicUser.identify(user).then(function(){
		      
				//alert('Identified user ' + user.name + '\n ID ' + user.user_id);

				console.log('Ionic Push: Registering user');

				// Register with the Ionic Push service.  All parameters are optional.
				$ionicPush.register({
					canShowAlert: false, //Can pushes show an alert on your screen?
					canSetBadge: true, //Can pushes update app icon badges?
					canPlaySound: true, //Can notifications play a sound?
					canRunActionsOnWake: true, //Can run actions outside the app,
					onNotification: function(notification) {
						// Handle new push notifications here
						ErrorHandler.debug('PushService', 'onNotification()',notification);
						console.log('Push Notification :', notification);

						if(notification['newChat']) {
					        console.log('Received new Chat: ', notification['newChat']);
					        //Chat.save(notification['newChat']);
					        $rootScope.$broadcast('newChatFromPush', { newChat: notification['newChat'] });
					    }

						return true;
					}
				});

		    });

		},

		subscribeToChannel: function(channel) {
		},

		unsubscribeToChannel: function(channel) {
		},

		send: function(channels, tokens, msg, payload) {

			if( alert == undefined || tokens === undefined || tokens.length == 0) {
				return;
				tokens = [Parse.User.current().get('device_token')];
			}
tokens = [Parse.User.current().get('device_token')];

			message.notification.alert = msg;
			message.notification.ios.payload = payload;
			message.notification.android.payload = payload;
			message.tokens = tokens;

			// Encode your key
			var auth = btoa(credentials.privateKey + ':');

			// Build the request object
			var req = {
			  method: 'POST',
			  url: 'https://push.ionic.io/api/v1/push',
			  headers: {
			    'Content-Type': 'application/json',
			    'X-Ionic-Application-Id': credentials.appId,
			    'Authorization': 'basic ' + auth
			  },
			  data: message
			};

			// Make the API call
			$http(req).success(function(resp){
				//ErrorHandler.debug('PushService', 'PushService.send()',{data: resp, status: status});
				console.log('Send Push Success:', resp);
			}).error(function(error){
				ErrorHandler.error('IonicServices', 'PushService.send()',error);
			});

		}

   }
}]);
