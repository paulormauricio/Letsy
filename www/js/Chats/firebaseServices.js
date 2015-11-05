angular.module('letsy.FirebaseServices',[])


.factory('Firebase',
	[
		'$rootScope', 
		'$q', 
		'$firebaseAuth',
		'$firebase',
		'$firebaseArray',
		'$filter', 
		'$timeout',
		'ErrorHandler',
		function(
			$rootScope, 
			$q, 
			$firebaseAuth,
			$firebase,
			$firebaseArray,
			$filter,
			$timeout,
			ErrorHandler
		)
	{


	var ref = new Firebase('letsyapp.firebaseIO.com/event');
	var eventsRef = [];

	var messagesDateFrom = new Date();




ref.child('evento1').on("child_changed", function(snapshot) {
	console.log('*************************************************');
	console.log('*************************************************');
	console.log('changed chat:', snapshot.val());
	alert('chegou');
  // ErrorHandler.debug('ChatService', 'Chat.$on:newChatFromPush',snapshot.val());
}, function(error) {
	console.log('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
	console.log('child_changed error:', error);
});




	var auth = $firebaseAuth(ref);

	var Message = {
		init: function(email, password) {
return;
console.log('<----- Login Firebase ---->');
			auth.$authWithPassword({
					email    : email,
					password : password
				}, function(error, authData) {
				if (error) {
					ErrorHandler.error('FirebaseServices', 'Firebase.init()', error);
				} else {
					console.log("Firebase - Authenticated successfully with payload:", authData);
				}
			});

		},
		registerUser: function(email, password) {
return;
console.log('<----- Register in Firebase ---->');
			auth.$createUser({
			  	email    : email,
			  	password : password
			}, function(error, userData) {
				if (error) {
					ErrorHandler.error('FirebaseServices', 'Firebase.registerUser()',error);
				} else {
					console.log("Firebase - Successfully created user account with uid:", userData.uid);
					this.init(email, password);
				}
			});
		},
		getAll: function(eventId) {

			ref.child(eventId).on("child_changed", function(snapshot) {
				if(snapshot.val().fromId != Parse.User.current().id) {
					console.log('changed chat:', snapshot.val());
				  	$rootScope.$broadcast('newChatFromPush', snapshot.val());
				}
			}, function (error) {
				ErrorHandler.error('FirebaseServices', 'Firebase on child_changed', error);
			});

			ref.child(eventId).on("child_removed", function(snapshot) {
				if(snapshot.val().fromId != Parse.User.current().id) {
					console.log('deleted chat:', snapshot.val());
					$rootScope.$broadcast('removeChatFromPush', snapshot.val());
				}
			});

			var messages = $firebaseArray(ref.child(eventId).limitToLast(30));
			return messages.$loaded().then(function(){
				console.log('Firebase messages: ', messages);
				return messages;
			})
			.catch(function(error){
				ErrorHandler.error('FirebaseServices', 'Firebase.getAll()', error);
				return [];
			});

		},
		add: function(eventId, newChat) {
			var record = {};
			record[newChat._id] = newChat;
			ref.child(eventId).update(record);
			console.log('Firebase - Add:', newChat);
		},
		delete: function(eventId, chatId) {
			var record = {};
			record[chatId] = null;
			ref.child(eventId).update(record);
			console.log('Firebase - delete:', chatId);
		},
		stopUpdates: function() {
			ref.off();
		}
	};

	return Message;
}]);