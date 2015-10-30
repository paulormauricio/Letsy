angular.module('letsy.EventServices',['letsy.EventThemes'])


.service('Event',['$rootScope', '$q', '$timeout', '$filter', 'ErrorHandler','PushService', function($rootScope, $q, $timeout, $filter, ErrorHandler, PushService){

console.log('<------ Start Events ----------->');

	var _db = new PouchDB('events', {adapter: 'websql'});
	var _myEvents = [];
	var _newEvents = [];

	var Event = Parse.Object.extend("Event");
	var Participant = Parse.Object.extend("Participant");

	this.isForceGetEvents = false;
	this.myEvent = null;
	this.showEvent = {};


    // Listen for changes on the database.
    //_db.changes({ live: true, since: 'now', include_docs: true}).on('change', onDatabaseChange);

	this.loadMyEvents = function() {
		return loadLocalEvents();
	}

	function loadLocalEvents() {

		if( this.isForceGetEvents ) {
			console.log('Force get MyEvents');
			this.isForceGetEvents = false;
			return this.getMyEvents();
		}
		if( _db === undefined ) {
			alert('Database not loaded!');
			return this.getMyEvents();
		}

	    if (_myEvents.length == 0) {
	    	console.log('Load MyEvents from local storage');
	    	var currDate = $filter('date')(new Date(), 'yyyy-MM-dd' );
	    	
	       return $q.when(_db.createIndex({
					index: {fields: ['date', 'isDeleted']}
				})
				.then(function () {
					return _db.find({
						
						selector: {
						    $and: [
						      { date: {$gte: currDate}},
						      { isDeleted: false }
						    ]
						  }
					});
				})
				.then(function(docs) {

	                _myEvents = docs.docs.map(function(doc) {
	                    doc.date = doc.date ? new Date(doc.date) : undefined;
	                    doc.updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : undefined;

						// Unserialize participants
						doc.participants = angular.fromJson(doc.participants);

	                    return doc;
	                });
					
					//return _myEvents;
					return _db.find({
						selector: {date: {$exists: false}}
					});

				})
				.then(function(docs){
					var events_withoutDate = [];
	                events_withoutDate = docs.docs.map(function(doc) {
	                    doc.date = doc.date ? new Date(doc.date) : undefined;
	                    doc.updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : undefined;

						// Unserialize participants
						doc.participants = angular.fromJson(doc.participants);

	                    return doc;
	                });
	                _myEvents = _myEvents.concat(events_withoutDate);

	                console.log('_myEvents: ', _myEvents);
	                return _myEvents;
				})
				.catch(function(err){console.log('Load Docs Error: ', err); return [];}));

	    } else {
	        // Return cached data as a promise
	        console.log('Load events from cache');
	        return $q.when(_myEvents);
	    }
	}



	function onDatabaseChange(change) {  
console.log('----->  Database change: ', change);
	    var index = findIndex(_myEvents, change.id);

	    if (change.deleted) {
	        if (_myEvents[index]) {
	            _myEvents.splice(index, 1); // delete
	        }
	    } else {
	        if (_myEvents[index] && _myEvents[index]._id === change.id) { 
	            _myEvents[index] = change.doc; // update
	        } else {
	            _myEvents.splice(index, 0, change.doc) // insert
	        }
	    }
	    console.log('_myEvents:', _myEvents);

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

	this.getMyEvents = function() {
		_myEvents = [];
		var deferred = $q.defer();

		// Validate network connection
		if( $rootScope.isOffline ) {
			$timeout(function() {
				$rootScope.$apply(function() { deferred.resolve([]); });
			}, 100);
			return deferred.promise;
		}

		var query = new Parse.Query(Event);
		var innerQuery = new Parse.Query(Participant);

		innerQuery.matchesQuery("Event", query);
		innerQuery.equalTo("User", Parse.User.current() );
		innerQuery.equalTo("isHidden", false );
		innerQuery.equalTo("isGoing", true );
		innerQuery.include("Event");

		innerQuery.find({
		  success: function(objects) {
		  	console.log('getMyEvents: List get successfully!');
		  	var currDate = $filter('date')(new Date(), 'yyyy-MM-dd');
		  	var results = [];
			angular.forEach(objects, function(object) {

				var result = {};
				result.id = object.get('Event').id;
				result._id = object.get('Event').id;

				result.name = object.get('Event').get('name');
				result.theme = object.get('Event').get('theme');
				result.background_url = object.get('Event').get('background_url');
				result.place_id = object.get('Event').get('place_id');
				result.place_name = object.get('Event').get('place_name');
				result.place_address = object.get('Event').get('place_address');
				result.place_image_url = object.get('Event').get('place_image_url');
				result.place_lat = object.get('Event').get('place_lat');
				result.place_lng = object.get('Event').get('place_lng');
				result.date = object.get('Event').get('date');
				result.repeatEventType = object.get('Event').get('repeatEventType');
				result.createdBy = object.get('Event').get('createdBy');
				result.isDeleted = object.get('Event').get('isDeleted');
				result.updatedAt = object.get('Event').updatedAt;

				var eventDate = $filter('date')(result.date, 'yyyy-MM-dd');

				if( !result.isDeleted && (result.date == null || result.date === undefined || currDate <= eventDate )) {
					
					this.push(result);

					query = new Parse.Query(Participant);
					query.equalTo('Event', object.get('Event') );
					query.equalTo("isGoing", true );
					query.include("User");
					query.find({
						success: function(results) {
							
							var participants = [];

							angular.forEach(results, function(object, key) {

								if(object.get('User')) {
									var participant = {};
									participant.id = object.get('User').id;
									participant.participantId = object.id;
									participant.facebookId = object.get('User').get('facebookId');
									participant.first_name = object.get('User').get('first_name');
									participant.last_name = object.get('User').get('last_name');
									participant.isGoing = object.get('isGoing');
									participant.isHidden = object.get('isHidden');
									participant.isNotified = object.get('isNotified');
									this.push(participant);
								}
							}, participants);

							result.participants = participants;
							
							//Add to local database
							updateLocalDB(result);

						},
						error: function(error) {

						}
					});
				}

			}, results);

			_myEvents = results;

		    $rootScope.$apply(function() { deferred.resolve(results); });

		  },
		  error: function(error) {
		    ErrorHandler.error('EventServices', 'Event.getMyEvents()',error.message);
		    $rootScope.$apply(function() { deferred.resolve(undefined); });
		  }
		});
		return deferred.promise;
	};

	this.getNew = function() {
		var deferred = $q.defer();

		// Validate network connection
		if( $rootScope.isOffline ) {
			$timeout(function() {
				$rootScope.$apply(function() { deferred.resolve([]); });
			}, 100);
			return deferred.promise;
		}

		var query = new Parse.Query(Event);
		var innerQuery = new Parse.Query(Participant);

		innerQuery.matchesQuery("Event", query);
		innerQuery.equalTo("User", Parse.User.current() );
		innerQuery.equalTo("isHidden", false );
		innerQuery.equalTo("isGoing", false );
		query.equalTo("isDeleted", false );
		innerQuery.include("Event");

		innerQuery.find({
		  success: function(objects) {
		  	console.log('getNew: Events List get successfully!');

		  	var results = [];
		  	angular.forEach(objects, function(object){
				var result = {};
				result.id = object.get('Event').id;
				result._id = object.get('Event').id;
				result.participantId = object.id;
				result.name = object.get('Event').get('name');
				result.theme = object.get('Event').get('theme');
				result.background_url = object.get('Event').get('background_url');
				result.place_id = object.get('Event').get('place_id');
				result.place_name = object.get('Event').get('place_name');
				result.place_address = object.get('Event').get('place_address');
				result.place_image_url = object.get('Event').get('place_image_url');
				result.place_lat = object.get('Event').get('place_lat');
				result.place_lng = object.get('Event').get('place_lng');
				result.date = object.get('Event').get('date');
				result.repeatEventType = object.get('Event').get('repeatEventType');
				result.createdBy = object.get('Event').get('createdBy');
				result.isDeleted = object.get('Event').get('isDeleted');
				result.updatedAt = object.get('Event').updatedAt;

				this.push(result);

		  	},results);

		  	_newEvents = results;
		    $rootScope.$apply(function() { deferred.resolve(_newEvents); });

		  },
		  error: function(error) {
		    ErrorHandler.error('EventServices', 'Event.getNewEvent()',error.message);
		    $rootScope.$apply(function() { deferred.resolve([]); });
		  }
		});
		return deferred.promise;
	};


	function loadEvent(id) {

		if( _db === undefined ) {
			ErrorHandler.error('EventServices', 'Event.loadEvent()', 'Database not loaded');
			return {};
		}

       return $q.when(_db.get(id)
	       		.then(function (doc) {

					doc.date = doc.date ? new Date(doc.date) : undefined;
					doc.updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : undefined;
					// Unserialize participants
					doc.participants = angular.fromJson(doc.participants);
console.log('Event loaded locally: ', doc);
				  return doc;
				}).catch(function (err) {
				  console.log(err);
				})
			);
	};

	this.get = function(id) {

		if( $rootScope.isOffline ) {
			return loadEvent(id);
		}

		var deferred = $q.defer();

		var query = new Parse.Query(Event);
		query.equalTo("objectId", id );
		query.first({
		  success: function(object) {

		  	console.log('Event get successfully!');

		  	var result = {};

		  	if( object == undefined ) {
		  		result = object;
		  	}
			else {
				result.id = object.id;
				result._id = object.id;
				result.name = object.get('name');
				result.theme = object.get('theme');
				result.background_url = object.get('background_url');
				result.place_id = object.get('place_id');
				result.place_name = object.get('place_name');
				result.place_address = object.get('place_address');
				result.place_image_url = object.get('place_image_url');
				result.place_lat = object.get('place_lat');
				result.place_lng = object.get('place_lng');
				result.date = object.get('date');
				result.repeatEventType = object.get('repeatEventType');
				result.createdBy = object.get('createdBy');
				result.updatedAt = object.updatedAt;
				result.isDeleted = object.get('isDeleted');
				result.participants = undefined;

				this.showEvent = result;

				//Add to local database
				updateLocalDB(result);

			}
			
		  	$rootScope.$apply(function() { deferred.resolve(result); });

		  },
		  error: function(error) {
		    ErrorHandler.error('EventServices', 'Event.get()',error.message);
		    loadEvent(id).then(function(result){
		    	deferred.resolve(result);
		    });
		  }
		});

		return deferred.promise;
	};

	this.save = function(isNew) {

			isNew = typeof isNew !== 'undefined' ? isNew : false;
			var deferred = $q.defer();

			var saveEvent = new Event();

			if(isNew) {
				this.myEvent.createdBy = Parse.User.current().id;
			}
			else {
				saveEvent.id = this.myEvent.id;
			}
			var myEvent_temp = {
				// id: 	this.myEvent.id,
				isDeleted:	this.myEvent.isDeleted ? true : false
			};

			myEvent_temp.name 			= this.myEvent.name;
			myEvent_temp.theme 			= this.myEvent.theme;
			myEvent_temp.background_url = this.myEvent.background_url;
			myEvent_temp.place_id 		= this.myEvent.place_id;
			myEvent_temp.place_name 	= this.myEvent.place_name;
			myEvent_temp.place_address 	= this.myEvent.place_address;
			myEvent_temp.place_image_url = this.myEvent.place_image_url;
			myEvent_temp.place_lat 		= this.myEvent.place_lat;
			myEvent_temp.place_lng 		= this.myEvent.place_lng;
			myEvent_temp.date 			= this.myEvent.date;
			myEvent_temp.repeatEventType = this.myEvent.repeatEventType;
			myEvent_temp.createdBy 		= this.myEvent.createdBy;

			saveEvent.save( myEvent_temp , {
			  success: function(newEvent) {
			  	console.log('Event saved successfully!');

			  	myEvent_temp.id = newEvent.id;
				myEvent_temp._id = newEvent.id;
				myEvent_temp.updatedAt = newEvent.updatedAt;				
// console.log('saved newEvent: ', newEvent);

				//Add to local database
				updateLocalDB(myEvent_temp);
				$rootScope.$apply(function() { deferred.resolve(newEvent); });
				
			  },
			  error: function(gameScore, error) {
			  	ErrorHandler.error('EventServices', 'Event.save()',error.message);
			  }
			});

			return deferred.promise;
		};

	function copyEvent(myEvent) {
		return {
			id: 			myEvent._id,
			name: 			myEvent.name,
			theme: 			myEvent.theme,
			background_url: myEvent.background_url,

			place_id: 		myEvent.place_id,
			place_name: 	myEvent.place_name,
			place_address: 	myEvent.place_address,
			place_image_url:myEvent.place_image_url,
			place_lat: 		myEvent.place_lat,
			place_lng: 		myEvent.place_lng,

			date: 			$filter('date')(myEvent.date, 'yyyy-MM-dd HH:mm'),
			repeatEventType:myEvent.repeatEventType,
			createdBy: 		myEvent.createdBy,
			updatedAt: 		myEvent.updatedAt,
			isDeleted: 		myEvent.isDeleted ? true : false,
			participants: 	myEvent.participants
		};
	}

	this.updateEventLocally = function(myEvent) {
		return updateLocalDB(myEvent);
	}

	function updateLocalDB(myEvent) {
		console.log('updateEventLocally: ', myEvent);
		myEvent._id = myEvent.id;
		return $q.when(_db.get(myEvent.id)
			.then(function (doc) {
				doc.updatedAt = new Date(doc.updatedAt);
//				if( myEvent.updatedAt >= doc.updatedAt  ) {
					myEvent._rev = doc._rev;
					// Serialize participants
					myEvent.participants = angular.toJson(myEvent.participants, false);

					_db.upsert(myEvent.id, function(doc){
						return copyEvent(myEvent);
					}).then(function (res) {
						console.log('update event: ', res);
					}).catch(function(error){
						ErrorHandler.error('EventServices', 'Event.updateEventLocally() -> Update doc',{error: error, object: myEvent});
					});

					// Unserialize participants
					myEvent.participants = angular.fromJson(myEvent.participants);
					onDatabaseChange({doc: myEvent, deleted: false, id: myEvent._id});
//				}
			})
			.catch(function(error) {

				if( error.name === 'not_found') {
					console.log('Document not found in local DB');
					myEvent.participants = angular.toJson(myEvent.participants, false);

					_db.upsert(myEvent.id, function(doc){
						return copyEvent(myEvent);
					}).then(function (res) {
						console.log('Put new event: ', res);
					}).catch(function(error){
						ErrorHandler.error('EventServices', 'Event.updateEventLocally() -> Put new doc',{error: error, object: myEvent});
					});

					myEvent.participants = angular.fromJson(myEvent.participants);
					onDatabaseChange({doc: myEvent, deleted: false, id: myEvent._id});
				}
				else {
					ErrorHandler.error('EventServices', 'Event.updateEventLocally() -> _db.get()',error.message);
				}
			})
		);

	}

	this.resetMyEvent = function() {
		this.myEvent = null;
	};
	this.removeFromNewEvents = function(eventId) {
		console.log('removeFromNewEvents: ', eventId);
		var index = findIndex(_newEvents, eventId);
		_newEvents.splice(index, 1);
	}

	this.deletePlace = function() {
		this.myEvent.place_id = undefined;
		this.myEvent.place_name = undefined;
		this.myEvent.place_address = undefined;
		this.myEvent.place_lat = undefined;
		this.myEvent.place_lng = undefined;
		this.myEvent.place_image_url = undefined;

		this.save();
	}

	this.leaveEvent = function(myEvent) {
		onDatabaseChange({doc: myEvent, deleted: true, id: myEvent._id});
		$q.when(_db.remove(myEvent).then(function(){
			console.log('Event left: ', myEvent);
		})
		.catch(function(error){
			console.log('Event.leaveEvent() Error: ', error.message);
		}));
	}

	this.notifyHost = function(myEvent, message) {
		console.log('Push Notify Host: ', message);
	}

	this.destroy = function() {
		_db.destroy().then(function() { console.log('Events DB deleted') });
	}

}])

.factory('Participant',['$rootScope', '$q', 'Event', 'ErrorHandler', 'PushService', function($rootScope, $q, Event, ErrorHandler, PushService){

	var Participant = Parse.Object.extend("Participant");
	var Event = Parse.Object.extend("Event");
	var User = Parse.Object.extend("User");

	var participants = [];

	return {

		getAll: function(myEvent, isGoing) {
			var deferred = $q.defer();

			var thisEvent = new Event(); 
			thisEvent.id = myEvent.id;
			
			var query = new Parse.Query(Participant);
			query.equalTo("Event", thisEvent );
			query.equalTo("isHidden", false );
			if (isGoing) {
				query.equalTo("isGoing", true );
			}
			query.include("User");
			query.ascending("");
			query.find({
			  success: function(objects) {
			  	console.log('Participants List get successfully!');

				var results = [];

				angular.forEach(objects, function(object, key) {
					if(object.get('User')) {
						var result = {};
						result.id = object.get('User').id;
						result.participantId = object.id;
						result.facebookId = object.get('User').get('facebookId');
						result.name = object.get('User').get('name');
						result.first_name = object.get('User').get('first_name');
						result.last_name = object.get('User').get('last_name');
						result.isGoing = object.get('isGoing');
						result.isHidden = object.get('isHidden');
						result.isNotified = object.get('isNotified');
						this.push(result);
					}
				}, results);

			    $rootScope.$apply(function() { deferred.resolve(results); });

			    participants = results;

			  },
			  error: function(error) {
			    ErrorHandler.error('EventServices', 'Participant.getAll()',error.message);
			  }
			});
			return deferred.promise;
		},

		store: function(myEvent, friend, isOwner) {

	  		var participant = new Participant();

	  		var saveEvent = new Event(); 
	  		saveEvent.id = myEvent.id;

	  		var user = new User(); 
	  		user.id = friend.id;

            participant.set('Event', saveEvent);
            participant.set('User', user);
            participant.set('isSeen', isOwner);
            participant.set('isHidden', false);
            participant.set('isNotified', isOwner);
			participant.set('isGoing', isOwner);

console.log('saveEvent before store Participant:', saveEvent);

			var query = new Parse.Query(Participant);
			query.equalTo("Event", saveEvent );
			query.equalTo("User", user );

			query.first({
			  success: function(object) {

			  	if (object === undefined) {
			  		console.log('Participant saved successfully!');
                    participant.save();
			  	}

			  },
			  error: function(error) {
			    ErrorHandler.error('EventServices', 'Participant.store()',error.message);
			  }
			});

		},

		update: function(participantId, isSeen, isHidden, isGoing) {

	  		var participant = new Participant();

	  		participant.id = participantId;
            participant.set('isGoing', isGoing);
            participant.set('isHidden', isHidden);
            participant.set('isSeen', isSeen);

			participant.save();
			console.log('Participant updated successfully!');
		},

		updateByEvent: function(saveEvent, user, isGoing) {
			var deferred = $q.defer();
	  		var queryEvent = new Event(); 
	  		queryEvent.id = saveEvent.id;

			var query = new Parse.Query(Participant);
			query.equalTo("Event", queryEvent );
			query.equalTo("User", user );

			query.first({
			  success: function(participant) {

			  	if (participant.id != undefined) {
                    console.log('Participant updated successfully!');
		            participant.set('isGoing', isGoing);
		            participant.set('isHidden', false);

					participant.save();

					if(isGoing) PushService.subscribeToChannel(Event.myEvent.id);
			  	}
			  	else {
			  		console.log('Warning: Participant not found! ', participant);
			  	}
			  	$rootScope.$apply(function() { deferred.resolve(true); });
			  },
			  error: function(error) {
			    ErrorHandler.error('EventServices', 'Participant.updateByEvent()',error.message);
			  }
			});

			return deferred.promise;
		},

		delete: function (participantId, eventId) {
			console.log('Participant.delete: ', participantId);
			var participant = new Participant();
			participant.id = participantId;
			participant.destroy({
				success: function(myObject) {
					console.log('Participant removed :', participantId);
					if(eventId) PushService.unsubscribeToChannel(eventId);
				},
				error: function(myObject, error) {
			    	ErrorHandler.error('EventServices', 'Participant.delete()',error);
				}
			});

		}

   }
}])

.factory('Theme',['$rootScope', '$q', '$http', '$timeout', 'ErrorHandler', 'staticThemes', '$filter', function($rootScope, $q, $http, $timeout, ErrorHandler, staticThemes, $filter){

	var _db = new PouchDB('themes', {adapter: 'websql'});

	var _themes = [];


	function myDeltaFunction(doc) {
		doc.counter = doc.counter || 0;
		doc.counter++;
		return doc;
	}

	return {

		init: function() {
console.log('<------ Theme Load ----------->');
			_themes = $filter('orderBy')(staticThemes, '-totalUsage');

			_db.bulkDocs(_themes).then(function (result) {
				console.log('Themes: staticThemes stores successfully');
			}).catch(function (error) {
				ErrorHandler.error('EventServices', 'Theme.init()',error.message);
			});

		},

		getAll: function() {
			var deferred = $q.defer();
			console.log('themes: ', _themes);

			if(!_themes || _themes.length===0) {

				return $q.when(_db.allDocs({ include_docs: true}).then(function (docs) {
			        var themes = docs.rows.map(function(doc) {
			            return doc.doc;
			        });
			        _themes = $filter('orderBy')(themes, '-totalUsage');
			        return _themes;
				}).catch(function (error) {
					ErrorHandler.error('EventServices', 'Theme.db.allDocs()',error.message);
				}));	
			}
			else {
				return $timeout(function() {return _themes;});				
			}

		},

		getUrl: function(theme) {

			var url = 'http://letsy.co/fileStorage/'+theme+'/'+theme+'.jpg';
			var options = {
			  	headers: {
				    'Content-Type': 'application/json'
			  	}
			}
		    return $http.head(url, options).then(function(response){
				return response.status != 404 ? url : undefined;
		    })
		    .catch(function(error){
				ErrorHandler.error('EventServices', 'Theme.getUrl()',error.message);
		    });
		},

		incrementUsage: function(theme) {
			for (var i = 0; i < _themes.length; i++) {
				if( _themes[i].name === theme ) {
					_themes[i].totalUsage++;
					break;
				}
			}
			$q.when(_db.get(theme)
			.then(function (doc) {
				_themes = $filter('orderBy')(_themes, '-totalUsage');
				doc.totalUsage++;
				_db.put(doc).then(function(res){console.log(doc.name+' incrementUsage: ', doc.totalUsage);}).catch(function(error){ErrorHandler.error('EventServices', 'Theme.incrementUsage()',error);})
			})
			.catch(function(error){
				ErrorHandler.error('EventServices', 'Theme.incrementUsage()',error.message);
			}));
		},

		destroy: function() {
			_db.destroy().then(function() { 
				console.log('Themes DB deleted') 
			})
			.catch(function(error){
				ErrorHandler.error('EventServices', 'Theme.destroy()',error.message);
			});
		}

   }
}]);