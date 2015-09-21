angular.module('letsy.EventServices',[])


.service('Event',['$rootScope', '$q', '$timeout', '$filter', 'ErrorHandler','PushService', function($rootScope, $q, $timeout, $filter, ErrorHandler, PushService){

console.log('<------ Start Events ----------->');

	var _db = new PouchDB('events', {adapter: 'websql'});
	var _myEvents = [];

	var Event = Parse.Object.extend("Event");
	var Participant = Parse.Object.extend("Participant");

	this.isForceGetEvents = false;
	this.myEvent = null;
	this.showEvent = {};


    // Listen for changes on the database.
    //_db.changes({ live: true, since: 'now', include_docs: true}).on('change', onDatabaseChange);

	this.loadMyEvents = function() {

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
	                //console.log('_myEvents: ', _myEvents);
	                return _myEvents;
				})
				.catch(function(err){console.log('Load Docs Error: ', err); return [];}));

	    } else {
	        // Return cached data as a promise
	        console.log('Loaded from cache');
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
				result.place_id = object.get('Event').get('place_id');
				result.place_name = object.get('Event').get('place_name');
				result.place_address = object.get('Event').get('place_address');
				result.place_image_url = object.get('Event').get('place_image_url');
				result.place_lat = object.get('Event').get('place_lat');
				result.place_lng = object.get('Event').get('place_lng');
				result.date = object.get('Event').get('date');
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

							result.participants = angular.toJson(participants, false);
							
							//Add to local database
							$q.when(_db.get(result._id)
								.then(function(doc) {
									doc.updatedAt = new Date(doc.updatedAt);
									if( result.updatedAt > doc.updatedAt  ) {
										result._rev = doc._rev;
										return _db.put( result );
									}
								})
								//.then(function(res){ console.log('Imported Event: ', res);})
								.catch(function (err) { 
									if( err.name === 'not_found' ) {
										_db.put(result).then(function(res){console.log('Put new event: ', res);}).catch(function(err){console.log('Import/Put new Event: ', err);})
									}
									else {
										console.log('Import Event Error: ', err); 
									}
								})
							);
							result.participants = participants;
							onDatabaseChange({doc: result, deleted: false, id: result._id});

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
		    $rootScope.$apply(function() { deferred.resolve([]); });
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
				result.place_id = object.get('Event').get('place_id');
				result.place_name = object.get('Event').get('place_name');
				result.place_address = object.get('Event').get('place_address');
				result.place_image_url = object.get('Event').get('place_image_url');
				result.place_lat = object.get('Event').get('place_lat');
				result.place_lng = object.get('Event').get('place_lng');
				result.date = object.get('Event').get('date');
				result.createdBy = object.get('Event').get('createdBy');
				result.isDeleted = object.get('Event').get('isDeleted');
				result.updatedAt = object.get('Event').updatedAt;

				this.push(result);

		  	},results);

		    $rootScope.$apply(function() { deferred.resolve(results); });

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
				result.place_id = object.get('place_id');
				result.place_name = object.get('place_name');
				result.place_address = object.get('place_address');
				result.place_image_url = object.get('place_image_url');
				result.place_lat = object.get('place_lat');
				result.place_lng = object.get('place_lng');
				result.date = object.get('date');
				result.createdBy = object.get('createdBy');
				result.updatedAt = object.updatedAt;
				result.isDeleted = object.get('isDeleted');
				result.participants = undefined;

				this.showEvent = result;

				_db.get(object.id)
				.then(function (doc) {
					onDatabaseChange({doc: result, deleted: false, id: result._id});
				})
				.catch(function(error) {
					if( error.name === 'not_found') {
						console.log('Document not found in local DB');
					}
					else {
						console.log('Get Doc error: ', error);
						ErrorHandler.error('EventServices', 'Event.get() -> _db.get()',error.message);
					}
				});

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
				id: 	this.myEvent.id,
				name: 	this.myEvent.name,
				theme: 	this.myEvent.theme,
				place_id: 	this.myEvent.place_id,
				place_name: this.myEvent.place_name,
				place_address: this.myEvent.place_address,
				place_image_url: this.myEvent.place_image_url,
				place_lat: 	this.myEvent.place_lat,
				place_lng: 	this.myEvent.place_lng,
				date: 		this.myEvent.date,
				createdBy:	this.myEvent.createdBy,
				isDeleted:	this.myEvent.isDeleted ? true : false
			};

			saveEvent.save( myEvent_temp , {
			  success: function(newEvent) {
			  	console.log('Event saved successfully!');

			  	myEvent_temp.id = newEvent.id;
				myEvent_temp._id = newEvent.id;
				myEvent_temp.updatedAt = newEvent.updatedAt;				

				//Add to local database
				$q.when(_db.get(myEvent_temp._id)
					.then(function(doc) {
						myEvent_temp._rev = doc._rev;
						return _db.put( myEvent_temp );
					})
					//.then(function(res){ console.log('Imported Event: ', res);})
					.catch(function (err) { 
						if( err.name === 'not_found' ) {
							_db.put(myEvent_temp).then(function(res){console.log('Put new event: ', res);}).catch(function(err){console.log('Import/Put new Event Error: ', err);})
						}
						else {
							console.log('Import Event Error: ', err); 
						}
					})
				);
				
				onDatabaseChange({doc: myEvent_temp, deleted: false, id: myEvent_temp._id});

			  	$rootScope.$apply(function() { deferred.resolve(newEvent); });

			  },
			  error: function(gameScore, error) {
			  	ErrorHandler.error('EventServices', 'Event.save()',error.message);
			  }
			});

			return deferred.promise;
		};

	this.updateEventLocally = function(myEvent) {

		$q.when(_db.get(myEvent.id)
			.then(function (doc) {
				doc.updatedAt = new Date(doc.updatedAt);

				if( myEvent.updatedAt > doc.updatedAt  ) {
					console.log('updateEventLocally');
					myEvent._id = myEvent.id;
					myEvent._rev = doc._rev;
					// Serialize participants
					myEvent.participants = angular.toJson(myEvent.participants, false);

					_db.put(myEvent);
					// Unserialize participants
					myEvent.participants = angular.fromJson(myEvent.participants);
					onDatabaseChange({doc: myEvent, deleted: false, id: myEvent._id});
				}
			})
			.catch(function(error) {
				if( error.name === 'not_found') {
					console.log('Document not found in local DB');
				}
				else {
					ErrorHandler.error('EventServices', 'Event.get() -> _db.get()',error.message);
				}
			})
		);

	}

	this.resetMyEvent = function() {
		this.myEvent = null;
	};

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
		$q.when(_db.remove(myEvent)).then(function(){
			console.log('Event left: ', myEvent);
		})
		.catch(function(){
			console.log('Event.leaveEvent() Error: ', error.message);
		});
	}

	this.destroy = function() {
		_db.destroy().then(function() { console.log('Events DB deleted') });
	}

}])

.factory('Participant',['$rootScope', '$q', 'Event', 'ErrorHandler', function($rootScope, $q, Event, ErrorHandler){

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
			  	}
			  	else {
			  		console.log('Warning: Participant not found! ', participant);
			  	}
			  },
			  error: function(error) {
			    ErrorHandler.error('EventServices', 'Participant.updateByEvent()',error.message);
			  }
			});
		},

		delete: function (participantId) {
			var participant = new Participant();
			participant.id = participantId;
			participant.destroy({
				success: function(myObject) {
					console.log('Participant removed :', participantId);
				},
				error: function(myObject, error) {
			    	ErrorHandler.error('EventServices', 'Participant.delete()',error.message);
				}
			});

		}

   }
}])

.factory('Theme',['$rootScope', '$q', '$timeout', function($rootScope, $q, $timeout){

	var themes = [
		{name: 'beach', 	tags_en_us: 'beach, sand, sea, sun',	tags_pt_pt: 'praia, areia, mar, sol'},
		{name: 'beer', 		tags_en_us: 'beers, drinks, party',		tags_pt_pt: 'cervejas, bebidas, festas'},
		{name: 'burger', 	tags_en_us: 'hamburger, lunch, dinner',	tags_pt_pt: 'humburger, comer, almoçar, jantar'},
		{name: 'cocktail', 	tags_en_us: 'drinks, cocktails, party', tags_pt_pt: 'bebidas, beber, copo, cocktails, festas'},
		{name: 'cycling', 	tags_en_us: 'cycling, cycle, ride', 	tags_pt_pt: 'bicicletas, andar, passear'},
		{name: 'drinks', 	tags_en_us: 'drinks, party', 			tags_pt_pt: 'bebidas, beber, copo, festas'},
		{name: 'food', 		tags_en_us: 'dinner, lunch, food', 		tags_pt_pt: 'jantar, comer, almoçar, almoço'},
		{name: 'football', 	tags_en_us: 'play, football', 			tags_pt_pt: 'jogar, futebol, bola'},
		{name: 'golf',	 	tags_en_us: 'golf, play',				tags_pt_pt: 'golf, jogar'},
		{name: 'rugby', 	tags_en_us: 'rugby, play',				tags_pt_pt: 'rugby, jogar, rugbi'},
		{name: 'running', 	tags_en_us: 'run, running', 			tags_pt_pt: 'correr, corrida, caminhar, caminhada'},
		{name: 'surf',	 	tags_en_us: 'surfing, waves',			tags_pt_pt: 'surfing, surfar, ondas'}
	];

	return {

		getAll: function() {
			var deferred = $q.defer();

			$timeout(function() {
				$rootScope.$apply(function() { deferred.resolve(themes); });
			}, 1000);

			return deferred.promise;
		}

   }
}]);
