angular.module('letsy.ChatServices',['letsy.FirebaseServices'])


.service('Chat',
	[
		'$rootScope', 
		'$q', 
		'$timeout', 
		'$filter', 
		'Firebase',
		'ErrorHandler', 
		'PushService',
		function(
			$rootScope, 
			$q, 
			$timeout, 
			$filter, 
			Firebase,
			ErrorHandler,
			PushService
		)
	{


	var _db = new PouchDB('chats', {adapter: 'websql'});
	var _myChats = [];

	this.loadChats = function(eventID) {

		if( _db === undefined ) {
			alert('Database not loaded!');
			return [];
		}

	    if (_myChats.length == 0) {

	    	var currDate = $filter('date')(new Date(), 'yyyy-MM-dd' );

	       return $q.when(_db.createIndex({
					index: {fields: ['date', 'eventId']}
				})
				.then(function () {
					return _db.find({
						selector: {eventId: {$eq: eventID}, date: {$exists: true}},
						sort: [{date: 'desc'}]
					});
				})
				.then(function(docs) {

	                _myChats = docs.docs.map(function(doc) {
	                    doc.date = doc.date ? new Date(doc.date) : undefined;

	                    return doc;
	                });
	                console.log('_myChats: ', _myChats);
					
					return _myChats.reverse();
					
				})
				.catch(function(error){
					ErrorHandler.error('ChatServices', 'Chat.loadChats()',error.message);
					return [];
				}));

	    } else {
	        // Return cached data as a promise
	        console.log('Chats Loaded from cache');
	        return $q.when(_myChats);
	    }
	}

	this.getChats = function(eventId) {
		if( !$rootScope.isOffline ) {
			return this.loadChats(eventId);
		}

		return Firebase.getAll(eventId);

	}

	function onDatabaseChange(change) {  
		console.log('----->  Chat database change: ', change);
	    var index = findIndex(_myChats, change.id);

	    if (change.deleted) {
	        if (_myChats[index]) {
	            _myChats.splice(index, 1); // delete
	        }
	    } else {
	        if (_myChats[index] && _myChats[index]._id === change.id) { 
	            _myChats[index] = change.doc; // update
	        } else {
	            _myChats.push(change.doc) // insert
	        }
	    }

	}
	// Binary search, the array is by default sorted by _id.
	function findIndex(array, id) {  
	    var low = 0, high = array.length, mid;
	    while (low < high) {
		    mid = (low + high) >>> 1;
		    array[mid]._id < id ? low = mid + 1 : high = mid
	    }
	    return low;
	}

	$rootScope.$on('newChatFromPush', function(event, newChat) {
	    console.log('newChatFromPush:', newChat);
	    saveChat(newChat);
	    ErrorHandler.debug('ChatService', 'Chat.$on:newChatFromPush',newChat);
	});
	$rootScope.$on('removeChatFromPush', function(event, newChat) {
	    console.log('removeChatFromPush:', removedChat);
	    // deleteChat(removedChat);
	    ErrorHandler.debug('ChatService', 'Chat.$on:removeChatFromPush',removedChat);
	});

	function saveChat(newChat) {

		if( !angular.isDate(newChat.date) ) newChat.date = new Date(newChat.date);

		newChat._id = newChat.eventId+'_'+newChat.date.getTime()+'_'+newChat.fromId;

		Firebase.add(newChat.eventId, newChat);
		onDatabaseChange({doc: newChat, deleted: false, id: newChat._id});
		return $q.when(_db.get(newChat._id)
			.then(function (doc) {
				newChat._rev = doc._rev;
				_db.upsert(newChat._id, function(doc){return newChat;})
				.then(function (res) {
					console.log('update chat locally: ', res);
				}).catch(function(error){
					ErrorHandler.error('ChatServices', 'Chat.save()',error.message);
				});
			})
			.catch(function(error){
				if( error.name === 'not_found') {
					_db.upsert(newChat._id, function(doc){return newChat;})
					.then(function (res) {
						console.log('create chat locally: ', res);
					}).catch(function(error){
						ErrorHandler.error('ChatServices', 'Chat.save() -> Put new chat', error.message);
					});
				}
				else {
					ErrorHandler.error('ChatServices', 'Chat.save() -> _db.get()',error.message);
				}
			})
		);
	}

	this.save = function(newChat) {
		return saveChat(newChat);
	}

	this.send = function(eventID, message, tokens) {

		var newChat = {
			eventId: eventID,
			date: new Date(),
			fromId: Parse.User.current().id,
			fromName: Parse.User.current().get('first_name')+' '+Parse.User.current().get('last_name'),
			fromFacebookId: Parse.User.current().get('facebookId'),
			message: message
		};

		var payload = {
			'$state': 'showEvent',
			'$stateParams': '{\'objectId\': '+eventID+'}',
			'newChat': angular.toJson(newChat, 0)
		};

		// console.log('Send Chat: ', newChat, payload);
		console.log('Send Chat with payload: ', payload);

		PushService.send([eventID], tokens, message, payload);

		return this.save(newChat);
	}

	this.destroy = function() {
		Firebase.stopUpdates();
		_db.destroy().then(function() { console.log('Chats DB deleted') });
	}

	this.clearCache = function() {
		_myChats = [];
		Firebase.stopUpdates();
	}

}]);
