angular.module('letsy.ParseServices',[])

.factory('PushService',
	[
		'$rootScope', 
		'$q', 
		'$http',
		'$timeout',
		'Event', 
		function(
			$rootScope, 
			$q, 
			$http,
			$timeout,
			Event
		)
	{

    var app_id = "3JNm1SIMsSFg9dURqfXPon40ttp1lxoE5eQKG2XQ";
    var client_key = "OeC50st0M2iByVBzoCBfS6arUJ7mgj4Lb4SMNvN5";

    var device_token = '';

	return {

		init: function() {
return;
			if(window.cordova) {
try {
alert('parsePlugin exists? ' + ParsePushPlugin);
				if( ParsePushPlugin ) {
					
					alert('Parse: before subscribe()');

				    ParsePushPlugin.subscribe('SampleChannel', function() {
				    	alert('Parse: after subscribe()');

				        ParsePushPlugin.getInstallationId(function(id) {
				        	alert('Parse: after getInstallationId() = ' + id);
				            /**
				             * Now you can construct an object and save it to your own services, or Parse, and corrilate users to parse installations
				             * 
				             var install_data = {
				                installation_id: id,
				                channels: ['SampleChannel']
				             }
				             *
				             */

				        }, function(error) {
				            ErrorHandler.error('ParseServices', 'init() -> getInstallationId()',error);
				        });

				    }, function(error) {
				        ErrorHandler.error('ParseServices', 'init() -> subscribe()',error);
				    });

}
catch(err) {
    alert( 'Parse init Error: '+err.message);
}
				}
			}

		},

		newChannel: function(channel) {
			alert('New channel function');
		},

		deleteChannel: function(channel) {
			ParsePushPlugin.unsubscribe('SampleChannel', function(msg) {
		        console.log('Channel unsubscribed: ', channel);
		    }, function(error) {
		        ErrorHandler.error('ParseServices', 'PushService.deleteChannel()',error.message);
		    });
		},

		send: function(channel, message) {
return;
			//var oneDay = new Date();

			Parse.Push.send({
			  channels: [ channel ],
			  data: {
			    //action: '',
			    //expiration_time: oneDay,
			    alert: message,
			    badge: 'Increment',
			    title: "New message"
			  }
			}, {
			  success: function() {
			    // Push was successful
			  },
			  error: function(error) {
			    ErrorHandler.error('ParseServices', 'PushService.send()',error.message);
			  }
			});
		},

		unregister: function(channel) {
			var options = {};
			ParsePushPlugin.unsubscribe(channel, function(msg) {
			    alert('Parse unsubscribe OK');
			}, function(e) {
			    alert('error' + e);
			});
		}

   }
}]);