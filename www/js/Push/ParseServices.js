angular.module('letsy.PushServices',[])

.factory('PushService',
	[
		'$rootScope', 
		'$q', 
		'$http',
		'$timeout',
		'ErrorHandler',
		function(
			$rootScope, 
			$q, 
			$http,
			$timeout,
			ErrorHandler
		)
	{

    var applicationId = "3JNm1SIMsSFg9dURqfXPon40ttp1lxoE5eQKG2XQ";
	var clientKey = "OeC50st0M2iByVBzoCBfS6arUJ7mgj4Lb4SMNvN5";


	return {

		init: function() {

			if( window.parsepushnotification ) {
				alert('Entrou no parsepushnotification!');

				window.parsepushnotification.setUp(applicationId, clientKey);

				//registerAsPushNotificationClient callback (called after setUp) 
				window.parsepushnotification.onRegisterAsPushNotificationClientSucceeded = function() {
			        alert('onRegisterAsPushNotificationClientSucceeded');
			    };

			    window.parsepushnotification.onRegisterAsPushNotificationClientFailed = function() {
			        alert('onRegisterAsPushNotificationClientFailed');
			    };

			    //subscribe callback 
			    window.parsepushnotification.onSubscribeToChannelSucceeded = function() {
			        alert('onSubscribeToChannelSucceeded');
			    };

			    window.parsepushnotification.onSubscribeToChannelFailed = function() {
			        alert('onSubscribeToChannelFailed');
			    };  

			    //unsubscribe callback 
			    window.parsepushnotification.onUnsubscribeSucceeded = function() {
			        alert('onUnsubscribeSucceeded');
			    };
			    window.parsepushnotification.onUnsubscribeFailed = function() {
			        alert('onUnsubscribeFailed');
			    };  
			}

		},

		subscribeToChannel: function(channel) {
			window.parsepushnotification.subscribeToChannel('Teste');
			alert('Subscribe to channel: ' + channel);
		},

		unsubscribeToChannel: function(channel) {
			window.parsepushnotification.unsubscribe('Teste');
			alert('Unsubscribe to channel: ' + channel);
		},

		send: function(channels, tokens, msg, payload) {

			Parse.Push.send({
			  channels: channels,
			  data: {
			    //action: '',
			    //expiration_time: oneDay,
			    alert: msg,
			    badge: 'Increment',
			    title: message,
			    payload: angular.toJson(payload)
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