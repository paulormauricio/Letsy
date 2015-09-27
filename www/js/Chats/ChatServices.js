angular.module('letsy.ChatServices',['firebase'])


.service('Chat',
	[
		'$rootScope', 
		'$q', 
		'$timeout', 
		'$filter', 
		'$firebase',
		'ErrorHandler', 
		'PushService',
		function(
			$rootScope, 
			$q, 
			$timeout, 
			$filter, 
			$firebase,
			ErrorHandler,
			PushService
		)
	{


	var _db = new PouchDB('chats', {adapter: 'websql'});
	var _myChats = [];

	//var firechat = new Firebase("https://letsyapp.firebaseio.com/chats");

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

	function onDatabaseChange(change) {  
		console.log('----->  Database change: ', change);
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

	$rootScope.$on('newChatFromPush', function(event, args) {
	    this.save(args.newChat);
	});

	this.save = function(newChat) {

		if( !angular.isDate(newChat.date) ) newChat.date = new Date(newChat.date);

		newChat._id = newChat.eventId+'/'+newChat.date.getTime()+'/'+newChat.fromId;

		return $q.when(_db.get(newChat._id)
			.then(function(doc) {
				newChat._rev = doc._rev;
				return _db.put( newChat );
			})
			.then(function(result) {
				console.log('updatedChat message: ', result);
				onDatabaseChange({doc: newChat, deleted: false, id: newChat._id});
			})
			.catch(function(error) {
				if( error.name === 'not_found' ) {
					return _db.put(newChat).then(function(res){
						console.log('newChat message: ', res);
						onDatabaseChange({doc: newChat, deleted: false, id: newChat._id});
					}).catch(function(error){ErrorHandler.error('ChatServices', 'Chat.save() -> db.put()',error.message);})
				}
				else {
					ErrorHandler.error('ChatServices', 'Chat.save()',error.message);
				}
			}));
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

		console.log('Send Chat: ', newChat);
		console.log('Send Chat with payload: ', payload);

		PushService.send(tokens, message, payload);

		return this.save(newChat);
	}

	this.destroy = function() {
		_db.destroy().then(function() { console.log('Chats DB deleted') });
	}

	this.clearCache = function() {
		_myChats = [];
	}

}]);
