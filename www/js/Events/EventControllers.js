angular.module('letsy.EventControllers',[])

.controller('EventsListController',
    [
        '$window', 
        '$state', 
        '$scope', 
        '$ionicLoading', 
        '$ionicListDelegate',
        '$ionicPopup',
        '$filter',
        '$rootScope',
        'Event', 
        'Participant', 
        'ErrorHandler',
        'Chat',
        function( 
            $window, 
            $state, 
            $scope,
            $ionicLoading,
            $ionicListDelegate,
            $ionicPopup,
            $filter,
            $rootScope,
            Event,
            Participant,
            ErrorHandler,
            Chat
        )
    {

console.log('');
console.log('<<<<<<-----------   Events Screen  ---------->>>>>');

   
    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    calculateColectionItemSize();

    if( $rootScope.isOffline ) {
        Event.loadMyEvents().then(function(objects) {
            $scope.myEvents = objects;
            console.log('My Events: ', objects);
        })
        .finally( function() {
            $ionicLoading.hide();
        });
    }
    else {
        $scope.doRefresh();
    }

    Event.getNew().then(function(objects) {
        $scope.newEvents = objects;
        console.log('New Events: ', objects);
    });

    $scope.doRefresh = function() {

        if( $rootScope.isOffline ) {
            $scope.$broadcast('scroll.refreshComplete');
            return;
        }
console.log('<---------- Refresh events ----------->');
        Event.getMyEvents().then(function(objects) {
            $scope.myEvents = objects;
            console.log('myEvents: ', objects);
        });

        Event.getNew().then(function(objects) {
            $scope.newEvents = objects;
            console.log('newEvents: ', objects);
        })
        .finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
        });
    }

    $scope.showEvent = function(myEvent) {
        Event.showEvent = myEvent;
        $state.transitionTo('showEvent', {objectId: myEvent.id}, {reload: true});
    }

    $scope.joinNewEvent = function(newEvent, index) {

        Participant.updateByEvent(newEvent, Parse.User.current(), true).then(function() {
            $scope.doRefresh();
        });
        
        $ionicLoading.show({
          templateUrl : 'views/templateSuccessFeedback.html',
          duration: 1500,
          noBackdrop: true
        }).then(function(){
            alert(1);
        });

        $scope.newEvents.splice(index, 1);
        $scope.myEvents.push(newEvent);
        Event.updateEventLocally(newEvent);
    }

    angular.element(window).bind('resize', function () {
        calculateColectionItemSize();
    });

    $scope.leaveEvent = function(index) {
        console.log('leave Event index: ', index);

        $ionicPopup.confirm({
            title: $filter('translate')('event_close'),
            template: $filter('translate')('event_close_confirm')+$scope.newEvents[index].name+'?',
            okText: $filter('translate')('event_close'),
            okType: 'button-assertive',
            cancelText: $filter('translate')('cancel'),
            cancelType: 'button-stable'
        }).then(function(result) {
            $ionicListDelegate.$getByHandle('newEventsList').closeOptionButtons();
            if(result) {
                Participant.delete($scope.newEvents[index].participantId);
                $scope.newEvents.splice(index, 1);
                $ionicLoading.show({
                    templateUrl : 'views/templateDestroyFeedback.html',
                    duration: 1500,
                    noBackdrop: true
                });
            }
        });
    }

    function calculateColectionItemSize() {
        var width =  $window.innerWidth;
        $scope.item = {width: 0, height: 0};
        if( width > 700 ) {
            $scope.item.width = 120 + 'px';
        }
        else if( width > 550 ) {
            $scope.item.width = (width / 4 - 3) + 'px';
        }
        else if( width > 400 ) {
            $scope.item.width = (width / 3 - 3) + 'px';
        }
        else {
            $scope.item.width = (width / 2 - 3) + 'px';
        }
        $scope.item.height = $scope.item.width;
    }
}])

.controller('EventShowController',
        [
            '$rootScope',
            '$scope',
            '$window',
            'Event',
            'Participant',
            '$state',
            '$stateParams',
            '$ionicLoading', 
            '$ionicPopup',
            '$ionicActionSheet',
            '$timeout',
            '$filter',
            '$rootScope',
            '$ionicScrollDelegate',
            'userlocation',
            'Weather',
            'Chat',
            'ErrorHandler',
            function(
                $rootScope,
                $scope,
                $window,
                Event,
                Participant,
                $state,
                $stateParams, 
                $ionicLoading,
                $ionicPopup,
                $ionicActionSheet,
                $timeout,
                $filter,
                $rootScope,
                $ionicScrollDelegate,
                userlocation,
                Weather,
                Chat,
                ErrorHandler
            )
    {
console.log('');
console.log('<<<<<<-----------   Show Screen  ---------->>>>>');

    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});
    $scope.myFacebookId = Parse.User.current().get('facebookId');

    if( !Event.showEvent.id ) {
        Event.get($stateParams.objectId).then(function(object) {
            if(object == undefined ) {
                $state.go('events');
            }
            else {
                Event.showEvent = object;
                loadEventDetail();
            }
        })
        .catch(function(fallback) {
            ErrorHandler.error('EventShowController', 'Get Event Error:',fallback);
        })
        .finally( function() {
            $ionicLoading.hide();
        });
    }
    else {
        loadEventDetail();
        $ionicLoading.hide();
    }

    var currentLocation = {};
    $scope.isEdit = false;
    $scope.isShowJoinButton = false;
    $scope.isShowEditButton = false;
    $scope.isShowDetailPanel = true;
    $scope.detailPanelScrollUp = 0;
    $scope.imageResizeHeight = 0;
    $scope.chatMarginTop = 0;
    $scope.chatMarginBottom = 0;
    loadChat();


    function loadEventDetail() {

        $scope.showEvent = Event.showEvent;
        console.log('$scope.showEvent: ', $scope.showEvent);

        if( $scope.showEvent.place_image_url == null || $scope.showEvent.place_image_url == undefined ) {
            $scope.background_image_url = 'img/themeIcon/'+$scope.showEvent.theme+'.png';
        }
        else {
            $scope.background_image_url = $scope.showEvent.place_image_url;
        }

        $scope.weather = {};
        if( !$rootScope.isOffline ) {
            //$scope.showEvent.participants = {};
            Participant.getAll(Event.showEvent).then(function(result) {
                
// result.push({id: 0, facebookId: "10152542092099862", first_name: 'Paulo', last_name: 'Mauricio'});
// result.push({id: 1, facebookId: "10152542092099862", first_name: 'Paulo', last_name: 'Mauricio'});
// result.push({id: 2, facebookId: "10152542092099862", first_name: 'Paulo', last_name: 'Mauricio'});
// result.push({id: 3, facebookId: "10152542092099862", first_name: 'Paulo', last_name: 'Mauricio'});
// result.push({id: 4, facebookId: "10152542092099862", first_name: 'Paulo', last_name: 'Mauricio'});
// result.push({id: 5, facebookId: "10152542092099862", first_name: 'Paulo', last_name: 'Mauricio'});
// result.push({id: 6, facebookId: "10152542092099862", first_name: 'Paulo', last_name: 'Mauricio'});
// result.push({id: 7, facebookId: "10152542092099862", first_name: 'Paulo', last_name: 'Mauricio'});
// result.push({id: 8, facebookId: "10152542092099862", first_name: 'Paulo', last_name: 'Mauricio'});
// result.push({id: 9, facebookId: "10152542092099862", first_name: 'Paulo', last_name: 'Mauricio'});

                $scope.showEvent.participants = $filter('orderBy')(result, '-isGoing +first_name +last_name' );
                $scope.showEvent.totalParticipants = 0;
                console.log('Participantes: ', $scope.showEvent.participants);

                // Store Participants Locally
                Event.updateEventLocally($scope.showEvent);

                // Validar se o utilizador vai ao evento
                var count = 0;
                for (var i = 0; i<$scope.showEvent.participants.length; i++) {
                    if($scope.showEvent.participants[i].isGoing) {
                        $scope.showEvent.totalParticipants++;
                        if( $scope.showEvent.participants[i].id == Parse.User.current().id )
                            count++;
                    }
                    else {
                        break;
                    }
                };
                $scope.isShowJoinButton = count == 0 ? true : false;

                if($scope.showEvent.createdBy == Parse.User.current().id) {
                    $scope.isShowEditButton = true;
                    $scope.isOwner = true;
                }
                else {
                    $scope.isShowEditButton = false;
                    $scope.isOwner = false;
                }

                calculateScreenSize();

            })
            .catch(function(error) {
                ErrorHandler.error('EventShowController', 'Get participants Error:',error);
            });

            getLocationWeather();
        }

    }

    function loadChat() {
        Chat.loadChats($stateParams.objectId).then(function(chats) {
            console.log('chats: ', chats);
            $scope.chats = chats;
            $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
        })
        .catch(function(error) {
            ErrorHandler.error('EventShowController', 'loadChat()',error);
        });
    }

    $scope.sendMessage = function(newMessage) {
        if(newMessage.length==0) return;

        var tokens = [$rootScope.myToken];
        Chat.send($stateParams.objectId, newMessage, tokens).then(function(){
            $scope.newMessage = '';
            $window.document.getElementById("inputMessage").focus();
            $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
            console.log('scrollBottom');
        });
        
    }

    $scope.onMessageHold = function(event, index, message) {
        console.log('onMessageHold');
    }

    $scope.$on('elastic:resize', function(event, element, oldHeight, newHeight) {
        oldHeight = oldHeight == 'auto' ? newHeight : oldHeight;
        $scope.chatMarginBottom += newHeight - oldHeight;
        $ionicScrollDelegate.scrollBottom();
    });

    function getLocationWeather() {
    
        if( $scope.showEvent.date ) {
            if( $scope.showEvent.place_lat && $scope.showEvent.place_lng ) {
                getWeather({lat: $scope.showEvent.place_lat, lng: $scope.showEvent.place_lng});
            }
            else {
                getUserLocation();
            }
        }
    }

    function getUserLocation() {
        
        userlocation.get().then(function(location) {
            currentLocation = location;
            getWeather(location);
        })
        .catch(function(error) {
            ErrorHandler.error('EventShowController', 'getUserLocation()',error);
        });
    }

    function getWeather(location) {
        console.log('<<<--- Get weather --->>>');
        console.log('location: ', location);
        
        Weather.get($scope.showEvent.date, location).then( function(data) {
            $scope.weather = data;
            console.log('weather: ', $scope.weather);
        })
        .catch(function(error) {
            ErrorHandler.error('EventShowController', 'getWeather()',error);
        });
    }

    $scope.toggleEdit = function() {
        $scope.isEdit = !$scope.isEdit;
    }

    $scope.back = function() {
        Chat.clearCache();
        $state.go('events');
    }

    $scope.joinEvent = function() {
        $ionicLoading.show({
          templateUrl : 'views/templateSuccessFeedback.html',
          duration: 1500,
          noBackdrop: true
        });

        Participant.updateByEvent($scope.showEvent, Parse.User.current(), true);
        $scope.isShowJoinButton = false;
        $scope.isShowEditButton = true;

        for (var i = 0; i<$scope.showEvent.participants.length; i++) {
            if($scope.showEvent.participants[i].facebookId == Parse.User.current().get('facebookId')) {
                $scope.showEvent.participants[i].isGoing = true;
                break;
            }
        }
        Event.updateEventLocally($scope.showEvent);

    }

    $scope.leaveEvent = function() {

        $ionicPopup.confirm({
            title: $filter('translate')('event_leave'),
            template: $filter('translate')('event_leave_confirm')+$scope.newEvents[index].name+'?',
            okText: $filter('translate')('event_leave'),
            okType: 'button-assertive',
            cancelText: $filter('translate')('cancel'),
            cancelType: 'button-stable'
        }).then(function(result) {
            if(result) {

                Participant.delete($scope.showEvent.participants.parcicipantId).then(function(){
                    Event.leaveEvent($scope.showEvent);
                    $ionicLoading.show({
                      templateUrl : 'views/templateDestroyFeedback.html',
                      duration: 1500,
                      noBackdrop: true
                    });
                    $timeout(function() {
                        $state.go('events');
                    }, 1500);
                });
            }
        });
    }

    $scope.deleteEvent = function() {
        if( $scope.isOwner ) {

            $ionicPopup.confirm({
                title: $filter('translate')('event_delete'),
                template: $filter('translate')('event_delete_confirm')+$scope.newEvents[index].name+'?',
                okText: $filter('translate')('event_delete'),
                okType: 'button-assertive',
                cancelText: $filter('translate')('cancel'),
                cancelType: 'button-stable'
            }).then(function(result) {
                if(result) {

                    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

                    Event.myEvent = $scope.showEvent;
                    Event.myEvent.isDeleted = true;
                    Event.save().then(function(){
                        console.log('Event deleted successfully!');
                        $state.go('events');
                    }).catch(function(error){
                        ErrorHandler.error('EventShowController', 'deleteEvent()', error.message);
                    }).finally(function(){
                        $ionicLoading.hide();
                    });
                }
            });
        }
    }


//  Edit Place  -------------------
    $scope.placePressed = function() {

        if( $scope.showEvent.place_id != undefined && !$scope.isEdit) {
            $state.go('showEventMap', {objectId: $scope.showEvent.id});
        }

        if( $scope.isShowJoinButton || !$scope.isEdit) return;

        if( !$scope.showEvent.place_name ) {
            Event.myEvent = $scope.showEvent;
            $state.go('editEventPlace', {objectId: $scope.showEvent.id});
        }
        else {

            // Show the action sheet
            var hideSheet = $ionicActionSheet.show({
                buttons: [
                    { text: $filter('translate')('event_place_edit') }
                ],
                destructiveText: $filter('translate')('event_place_clear'),
                // titleText: 'Modify your album',
                cancelText: $filter('translate')('cancel'),
                cancel: function() {
                    // add cancel code..
                },
                buttonClicked: function(index) {
                    console.log('Button clicked. Index = ', index);
                    switch(index) {
                        case 0: 
                            Event.myEvent = $scope.showEvent;
                            $state.go('editEventPlace', {objectId: $scope.showEvent.id});
                            break;
                        default: break;
                    }
                    hideSheet();
                    return ;
                },
                destructiveButtonClicked: function() {
                    console.log('chegou ao delete place');
                    hideSheet();
                    // Delete place

                    Event.myEvent = $scope.showEvent;
                    Event.deletePlace();

                    $scope.showEvent = Event.myEvent;
                    Event.resetMyEvent;
                    
                    $scope.showEvent.place_image_url = 'img/themeIcon/'+$scope.showEvent.theme+'.png';
        
                }
            });

            // For example's sake, hide the sheet after two seconds
            $timeout(function() {
                hideSheet();
            }, 8000);
        }

        $scope.isEdit = false;
    }
//  Edit Name Section --------------------------

    $scope.editName = function() {
        if( $scope.isEdit ) {
            Event.myEvent = $scope.showEvent;
            $state.go('editEventName', {objectId: $scope.showEvent.id});
        }
    }

//  Edit Participants Section -------------------

    $scope.editParticipants = function() {
        if( $scope.isEdit ) {
            Event.myEvent = $scope.showEvent;
            $state.go('editEventFriends', {objectId: $scope.showEvent.id});
        }
        else {
            $scope.isShowParticipants = !$scope.isShowParticipants;
        }
    }

    $scope.participantClick = function(index) {
        console.log('participantClick: ', index);
        $scope.showEvent.participants[index].show = true;
        $timeout(function() {
            $scope.showEvent.participants[index].show = false;
        }, 1000);
    }

    $scope.swipeDetailPanel = function(event) {

        var scroll = event.gesture.startEvent.center.pageY - event.gesture.center.pageY;

        if(scroll < 0 ) {
            // Aumenta imagem
            //console.log('Aumenta imagem');
            $scope.imageResizeHeight = -1*scroll/6;
        }
        else if( scroll >= $scope.item.firstRowHeight || event.gesture.velocityY > 0.3) {
            $scope.isShowDetailPanel = false;
            $scope.isEdit = false;
            $scope.chatMarginTop = 0;
            
            $timeout(function() {
                $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
            }, 100);
            console.log('hideDetailPanel');
        }
        else {
            //console.log('Reduce panel. Scroll = ', scroll);
            $scope.detailPanelScrollUp = -1*scroll;
        }
    }

    $scope.releaseDetailPanel = function() {
console.log('Release');
        if( $scope.isShowDetailPanel ) {
            $scope.detailPanelScrollUp = 0;
            $scope.imageResizeHeight = 0;
        }
    }

    $scope.showDetailPanel = function() {
        console.log('showDetailPanel');
        $scope.isShowDetailPanel = true;
        $scope.detailPanelScrollUp = 0;
        //var scroll = $ionicScrollDelegate.$getByHandle('chatScroll').getScrollPosition().top;
        $scope.chatMarginTop = $scope.item.firstRowHeight + 53;

        $timeout(function() {
            $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
        }, 100);

    }


//  Data Section --------------------------------
    $scope.editDate = function() {

        if( !$scope.isEdit || $scope.isShowJoinButton || $rootScope.isOffline) return;

        $scope.showAngularDateEditor = true;

        console.log(Event.showEvent);

        if( window.cordova) {

            var date = new Date();
            if( $scope.showEvent.date ) date = $scope.showEvent.date;


            var options = {
                date: date,
                mode: 'datetime',
                minuteInterval: 5,
                allowOldDates: false,
                doneButtonColor: '#0000FF',
                cancelButtonColor: '#000000',
                cancelButtonLabel: $filter('translate')('done'),
                clearButton: true,
                clearButtonColor: "#ddd",
                clearButtonLabel: $filter('translate')('event_date_clear')
            };

            datePicker.show(options, function(newDate){
                switch (newDate) {
                    case 'clear':
                        newDate = '';
                        break;
                    case 'cancel':
                        return;
                    default:
                        break;
                }
                saveDate(newDate);
            });
        }
        else {
            console.log('Not mobile');

            // Show the action sheet
            var hideSheet = $ionicActionSheet.show({
                buttons: [
                    { text: 'In 15 minutes' },
                    { text: 'In 30 minutes' },
                    { text: 'In 60 minutes' },
                    { text: 'In 2 hours' }
                ],
                destructiveText: 'Clear event date',
                // titleText: 'Modify your album',
                cancelText: 'Cancel',
                cancel: function() {
                    // add cancel code..
                },
                buttonClicked: function(index) {
                    console.log('Button clicked. Index = ', index);
                    switch(index) {
                        case 0: 
                            date = addMinutes(Date(), 15);
                            break;
                        case 1: 
                            date = addMinutes(Date(), 30);
                            break;
                        case 2: 
                            date = addMinutes(Date(), 60);
                            break;
                        case 3: 
                            date = addMinutes(Date(), 120);
                            break;
                        default: return;
                    }
                    hideSheet();
                    saveDate(date);
                },
                destructiveButtonClicked: function() {
                    console.log('chegou ao delete');
                    hideSheet();
                    saveDate('');
                }
            });

            // For example's sake, hide the sheet after two seconds
            $timeout(function() {
                hideSheet();
            }, 8000);

        }

        $scope.isEdit = false;

    }

    function addMinutes(newdate, minutes) {
        var date = new Date(newdate);
        console.log('Date:', date);
        return new Date(date.getTime() + minutes*60000);
    }

    function saveDate(newdate) {
        if( newdate == '' ) {
            $scope.showEvent.date = undefined;
            Event.showEvent.date = undefined;
        }
        else {
            var date = new Date(newdate);
            $scope.showEvent.date = date;
            Event.showEvent.date = date;
        }
        Event.myEvent = $scope.showEvent;
        Event.save();
        Event.resetMyEvent();
        getLocationWeather();
    }

    //  Other functions
    calculateScreenSize();

    angular.element(window).bind('resize', function () {
        calculateScreenSize();
    });

    function calculateScreenSize() {
        $scope.item = {
                height: $window.innerHeight,
                width:  $window.innerWidth,
                firstRowHeight: $window.innerHeight - 300,
                colletionItemWidth: 40
            };

        $scope.chatMarginTop = $scope.item.firstRowHeight + 53;

        if($scope.showEvent && $scope.showEvent.participants) {
            if( $scope.showEvent.participants.length > 6 )
                $scope.item.colletionItemWidth = $scope.item.width / 8;
            else if( $scope.showEvent.participants.length > 15 )
                $scope.item.colletionItemWidth = $scope.item.width / 10;
            else
                $scope.item.colletionItemWidth = $scope.item.width / 6;
        }
    }

}])


.controller('EventEditNameController',
        [
            '$scope', 
            '$window',
            '$state', 
            '$stateParams',
            '$ionicLoading',
            '$filter',
            'Event', 
            'Participant',
            'Theme',
            'ErrorHandler',
            function(
                $scope,
                $window,
                $state, 
                $stateParams,
                $ionicLoading, 
                $filter,
                Event, 
                Participant,
                Theme,
                ErrorHandler
            )
        {
console.log('');
console.log('<<<<<<-----------   Edit Name Screen  ---------->>>>>');

    $scope.isNew = $stateParams.isNew ? true : false;

    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    if( $stateParams.objectId == '' ) {
        $scope.editEvent = {name: ''};
        Event.myEvent = $scope.editEvent;
    }
    else {
        if(!Event.myEvent) {
            Event.myEvent = {id: $stateParams.objectId};
        }
        $scope.editEvent = Event.myEvent;
    }

    $scope.back = function() {
        
        Event.resetMyEvent();
        if( $scope.isNew ) {
            $state.go('events');
        }
        else {
            $state.go('showEvent', {objectId: $scope.editEvent.id});
        }
    }

//  Edit Event Name
    $scope.loadThemes = function() {

        Theme.getAll().then(function(themes){
            $scope.themes = themes;
            console.log('Themes: ', themes);
        })
        .finally( function() {
            $ionicLoading.hide();
        });

        calculateColectionItemSize();
        angular.element(window).bind('resize', function () {
            calculateColectionItemSize();
        });

    }

    $scope.storeName = function(theme) {

        if( $scope.editEvent.name == undefined || $scope.editEvent.name == '' ) {            
            $scope.editEvent.name = $filter('translate')(theme.name);
        }

        $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

        Event.myEvent = $scope.editEvent;
        
        Event.myEvent.theme = theme.name;
        //Event.myEvent.place_image_url = 'img/themeIcon/'+theme.name+'.png';

        Event.save($scope.isNew).then(function(savedEvent) {

            Event.myEvent.id = savedEvent.id;
            Event.myEvent._id = savedEvent.id;
            if($scope.isNew) {
                Participant.store(Event.myEvent, Parse.User.current(), true);
            }
            
            if( !$scope.isNew ) {
                $state.go('showEvent', {objectId: savedEvent.id});
            }
            else {
                $state.go('editEventDate', {isNew: true, objectId: savedEvent.id}, {reload: true});
            }
        })
        .finally( function() {
            $ionicLoading.hide();
        });

    }

    //  Other functions
    function calculateColectionItemSize() {
        var width =  $window.innerWidth;
        $scope.item = {width: 0, height: 0};
        if( width > 700 ) {
            $scope.item.width = 70 + 'px';
        }
        else if( width > 550 ) {
            $scope.item.width = (width / 6 - 3) + 'px';
        }
        else if( width > 400 ) {
            $scope.item.width = (width / 5 - 2) + 'px';
        }
        else {
            $scope.item.width = (width / 4 - 0) + 'px';
        }
        $scope.item.height = $scope.item.width;
        console.log('height: ', $scope.item.height);
        console.log('width: ', $scope.item.width);
    }

}])


.controller('EventEditParticipantsController',
        [
            '$scope', 
            '$window',
            '$timeout',
            '$state', 
            '$stateParams',
            '$ionicLoading',
            '$filter',
            'Event', 
            'Friend', 
            'Participant',
            'ErrorHandler',
            'PushService',
            function(
                $scope,
                $window,
                $timeout,
                $state, 
                $stateParams,
                $ionicLoading, 
                $filter,
                Event, 
                Friend,
                Participant,
                ErrorHandler,
                PushService
            )
        {
console.log('');
console.log('<<<<<<-----------   Edit Participant Screen  ---------->>>>>');

    $scope.isNew = $stateParams.isNew ? true : false;

    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    if( $stateParams.objectId == '' ) {
        $scope.editEvent = {};
        Event.myEvent = {};
    }
    else {
        if(!Event.myEvent) {
            Event.myEvent = {id: $stateParams.objectId};
        }
        $scope.editEvent = Event.myEvent;
    }

    $scope.back = function() {
        if( $scope.isNew ) {
            $state.go('editEventDate', {isNew: true, objectId: $scope.editEvent.id});
        }
        else {
            $state.go('showEvent', {objectId: $scope.editEvent.id});
        }
    }


//  Edit Event Participants

    $scope.loadFriends = function() {
        console.log('chegou ao loadFriends');

        $scope.friends = [];
        $scope.invitedFriends = [];
        
        Friend.getAll().then(function(friends) {

            $scope.friends = friends;

            Participant.getAll($scope.editEvent, false).then(function(invitedFriends){
                $scope.invitedFriends = invitedFriends;
console.log('$scope.invitedFriends: ', $scope.invitedFriends);

                //Remove participants from friends
                for (var i = 0; i < invitedFriends.length; i++) {
                    for (var j = 0; j < $scope.friends.length; j++) {

                        if(invitedFriends[i].id == $scope.friends[j].id ) {
                            $scope.friends.splice(j, 1);
                            break;
                        }
                    }
                }
            })
            .catch(function(fallback) {
                console.log('Error: ', fallback + '!!');
            });
            
        })
        .catch(function(fallback) {
            console.log('Error: ', fallback + '!!');
        })
        .finally( function() {
            $ionicLoading.hide();
        });
    }

    $scope.inviteFriend = function(index, friend) {
        friend.isNew = 1;
        $scope.friends.splice(index, 1);
        $scope.invitedFriends.unshift( friend );
    }

    $scope.uninviteFriend = function(index, friend) {
        if( !friend.isGoing ) {
            friend.isNew = 0;
            $scope.friends.unshift( friend );
            $scope.invitedFriends.splice(index, 1);
        }
    }

    $scope.notifyParticipants = function() {
        console.log('Notify Participants');

        var notify_tokens = [];
        var push_message = '';
        var payload = {
            '$state': 'showEvent',
            '$stateParams': '{\'objectId\': '+$stateParams.objectId+'}',
        };

        for (var i=0; i<$scope.invitedFriends.length; i++) {
            if($scope.invitedFriends[i].isNew == 1) {
                Participant.store(Event.myEvent, $scope.invitedFriends[i], false);
                notify_tokens.push($scope.invitedFriends[i].device_token);
            }
            else {
                break;
            }
        };
        if( notify_tokens.length > 0 ) {
            push_message = $filter('translate')('event_push_invite') + Event.myEvent.name;
            PushService.send(notify_tokens, push_message, payload);
        }

        notify_tokens = [];
        for (var i=0; i<$scope.friends.length; i++) {
            if($scope.friends[i].isNew == 0) {
                Participant.delete(Event.myEvent, $scope.friends[i], false);
            }
            else {
                break;
            }
        };
        if( notify_tokens.length > 0 ) {
            push_message = Event.myEvent.name + $filter('translate')('event_push_uninvite');
            PushService.send(notify_tokens, push_message);
        }
        Event.showEvent = Event.myEvent;
        Event.showEvent.participants = [];
        for (var i=0; i<$scope.invitedFriends.length; i++) {
            if($scope.invitedFriends[i].isGoing)
                Event.showEvent.participants.push($scope.invitedFriends[i]);
        };
        Event.updateEventLocally(Event.showEvent).then(function() {
            console.log('Event updated!');
            Event.resetMyEvent();
        });
        
        console.log('ShowEvent before show:', Event.showEvent);

        var delay = 0;
        if($scope.isNew) {
            delay = 1500;
            $ionicLoading.show({
              templateUrl : 'views/templateSuccessFeedback.html',
              duration: delay,
              noBackdrop: true
            });
        }

        $timeout(function() {
            $state.go('showEvent', {objectId: Event.showEvent.id});
        }, delay);
    }


}])


.controller('EventEditPlaceController',
        [
            '$scope', 
            '$window',
            '$state', 
            '$stateParams',
            '$ionicLoading',
            'Event', 
            'Friend', 
            'Participant',
            'Theme',
            'userlocation',
            'ngGPlacesAPI',
            'ErrorHandler',
            function(
                $scope,
                $window,
                $state, 
                $stateParams,
                $ionicLoading, 
                Event, 
                Friend,
                Participant,
                Theme,
                userlocation,
                ngGPlacesAPI,
                ErrorHandler
            )
        {


console.log('');
console.log('<<<<<<-----------   Edit Place Screen  ---------->>>>>');

    $scope.isNew = $stateParams.isNew ? true : false;

    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    if( $stateParams.objectId == '' ) {
        $scope.editEvent = {};
        Event.myEvent = {};
    }
    else {
        if(!Event.myEvent) {
            Event.myEvent = {id: $stateParams.objectId};
        }
        $scope.editEvent = Event.myEvent;
    }

    var currentLocation = {};

//  Edit Event Place
    $scope.loadSuggestedPlaces = function() {
        console.log('chegou ao loadPlaces()');
        

        GoogleOptions = {
            //types: ['food'],
            radius: 1000
        };

        userlocation.get().then(function(location) {
            console.log('Location:', location);

            currentLocation = {
                latitude: location.lat,
                longitude: location.lng
            };

            GoogleOptions = {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                radius: 1500
            };
            
            ngGPlacesAPI.nearbySearch(GoogleOptions).then( function(data) {
                $scope.suggestedPlaces = data;
                console.log('Data: ', data);
            })
            .finally( function() {
                $ionicLoading.hide();
            });

        })
        .catch(function(error) {
            $ionicLoading.hide();
            ErrorHandler.error('EventEditPlaceController', 'loadSuggestedPlaces()',error);
        })
        .finally( function() {
        });

    }   

    $scope.loadPlaces = function (query) {

        GoogleOptions['name'] = query;
        GoogleOptions['radius'] = 30000;

        return ngGPlacesAPI.nearbySearch(GoogleOptions).then( function(data) {

            console.log('Filtered Data: ', data);

            return data;
        })
        .catch(function(error) {
            console.log('Error: ', error);
        })
        .finally( function() {
        });
        
    }

    // Save selected place
    $scope.callbackMethod = function(callback) {
        console.log('Selected place: ', callback.item);

        Event.myEvent.place_name = callback.item.name;

        if( callback.item.place_id != '-1' ) {
            Event.myEvent.place_id = callback.item.place_id;
            Event.myEvent.place_address = callback.item.vicinity;

            if( callback.item.geometry.location ) {
                Event.myEvent.place_lat = callback.item.geometry.location.lat();
                Event.myEvent.place_lng = callback.item.geometry.location.lng();
            }
            if( callback.item.photos ) {
                Event.myEvent.place_image_url = callback.item.photos[0].getUrl({'maxWidth': 600, 'maxHeight': 600});
            }
        }
console.log('Save Event: ', Event.myEvent);
        Event.save();
        
        Event.showEvent = Event.myEvent;
        Event.resetMyEvent;
console.log('showEvent: ', Event.showEvent);
        $state.go('showEvent', {objectId: Event.showEvent.id}, {reload: true});

    }


}])


.controller('EventShowMapController',
        [
            '$scope',
            '$window',
            'Event',
            '$state',
            '$rootScope',
            '$stateParams',
            '$ionicLoading', 
            '$ionicActionSheet',
            'userlocation',
            'ErrorHandler',
            function(
                $scope,
                $window,
                Event,
                $state,
                $rootScope,
                $stateParams,
                $ionicLoading,
                $ionicActionSheet,
                userlocation,
                ErrorHandler
            )
    {
console.log('');
console.log('<<<<<<-----------   Show Map Screen  ---------->>>>>');

    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    $scope.showEvent = Event.showEvent;

    calculateScreenSize();

    if( !$scope.showEvent.place_id ) {

        Event.get($stateParams.objectId).then(function(object) {
            if(object == undefined ) {
                $state.go('events');
            }
            else {
                $scope.showEvent = object;
                initializeGoogleMaps($scope.showEvent.place_lat, $scope.showEvent.place_lng);
            }
        })
        .catch(function(fallback) {
            alert('Get Event Error: '+fallback);
        })
        .finally( function() {
            $ionicLoading.hide();
        });
    }
    else {

        initializeGoogleMaps($scope.showEvent.place_lat, $scope.showEvent.place_lng);
        $ionicLoading.hide();
    }

    function initializeGoogleMaps(lat, lng) {

        if( $rootScope.isOffline ) {
            return;
        }

        console.log('Initialize Maps (lat, lng): '+lat+', '+lng);

        if(!window.google) {
            console.log('Google Maps library not loaded!');
            ErrorHandler.warning('EventShowMapController', 'initializeGoogleMaps()','Google Maps library not loaded!');
            return;
        }
        // if(ionic.Platform.isWebView())  alert('Initialize GoogleMaps (lat, lng) = ('+lat+', '+lng+')');

    try {
        var myLatlng = new google.maps.LatLng(lat,lng);

        // Create an array of styles.
        var styles = [
            {
                // stylers: [
                //     { hue: "#00ffe6" },
                //     { saturation: -20 }
                // ]
            },{
                featureType: "road",
                stylers: [
                    { lightness: 100 },
                    { visibility: "simplified" }
                ]
            },{
                featureType: "road",
                elementType: "labels",
                stylers: [
                    { visibility: "off" }
                ]
            }
        ];

        // Create a new StyledMapType object, passing it the array of styles,
        // as well as the name to be displayed on the map type control.
        var styledMap = new google.maps.StyledMapType(styles, {name: "Styled Map"});

        // Create a map object, and include the MapTypeId to add
        // to the map type control.
        var mapOptions = {
            center: myLatlng,
            zoom: 15,
            streetViewControl: false,
            mapTypeControlOptions: {
                mapTypeIds: [google.maps.MapTypeId.ROADMAP, 'map_style']
            }
        };
        var map = new google.maps.Map(document.getElementById("fullMap"), mapOptions);

        //Associate the styled map with the MapTypeId and set it to display.
        map.mapTypes.set('map_style', styledMap);
        map.setMapTypeId('map_style');
        
        var marker = new google.maps.Marker({
            position: myLatlng,
            map: map,
            animation: google.maps.Animation.DROP,
            title: 'Place!'
        });
    }
    catch(err) {
        console.log('Maps Error: ',err);
        alert( 'Maps Error: '+err.message);
    }

    }


    //  Other functions
    angular.element(window).bind('resize', function () {
        calculateScreenSize();
    });

    function calculateScreenSize() {
        $scope.item = {
                height: $window.innerHeight +'px',
                width:  $window.innerWidth + 'px'
            };
    }

}])


.controller('EventEditDateController',
        [
            '$scope', 
            '$window',
            '$state', 
            '$stateParams',
            '$ionicLoading',
            '$ionicScrollDelegate',
            '$filter',
            '$timeout',
            'Event', 
            'ErrorHandler',
            function(
                $scope,
                $window,
                $state, 
                $stateParams,
                $ionicLoading, 
                $ionicScrollDelegate,
                $filter,
                $timeout,
                Event, 
                ErrorHandler
            )
        {
console.log('');
console.log('<<<<<<-----------   Edit Date Screen  ---------->>>>>');

    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    $scope.scrollItemHeight = 35;

    if( $stateParams.objectId == '' ) {
        $scope.editEvent = {};
        Event.myEvent = {};
    }
    else {
        if(!Event.myEvent) {
            Event.myEvent = {id: $stateParams.objectId};
        }
        $scope.editEvent = Event.myEvent;
    }

    $scope.back = function() {
        if( $stateParams.isNew ) {
            $state.go('editEventName', {isNew: true, objectId: $scope.editEvent.id});
        }
        else {
            $state.go('showEvent', {objectId: $scope.editEvent.id});
        }
    }


    $scope.loadDates = function() {
        console.log('chegou ao loadDates');

        var newDate = new Date();
        var aux;
        $scope.days = [];
        $scope.hours = [];
        $scope.minutes = [];
        $scope.days[0] = {
            day: newDate.getDate(),
            month: newDate.getMonth()+1,
            year: newDate.getFullYear(),
            desc: $filter('translate')('date_today'),
            isSelected: true
        }
        $scope.selectedDay = 0;
        for(i=1; i<90; i++) {
            newDate.setTime( newDate.getTime() + 1000 * 60 * 60 * 24 );
            aux = $filter('date')(newDate, 'dd/')+$filter('translate')('date_month_'+$filter('date')(newDate, 'MM'));
            $scope.days[i] = {
                day: newDate.getDate(),
                month: newDate.getMonth()+1,
                year: newDate.getFullYear(),
                desc: $filter('translate')('date_week_'+$filter('date')(newDate,'EEE').toLowerCase())+' '+aux,
                isSelected: false
            }
        }
        console.log('days: ', $scope.days);

        newDate = new Date();
        aux = newDate.getHours();
        $scope.selectedHour = 0;
        for(i=0; i<24; i++){
            if(aux == i-1) $scope.selectedHour = i;
            $scope.hours.push({
                hour: i,
                desc: i<10 ? '0'+i : i,
                isSelected: (aux == i-1) ? true : false
            });
        }
        $timeout(function() {
            $ionicScrollDelegate.$getByHandle('hoursScroll').scrollTo(0, $scope.selectedHour*$scope.scrollItemHeight-13, true);
        }, 500);

        $scope.selectedMinute = 0;
        newDate = new Date();
        for(j=0; j<12; j++) {            
            $scope.minutes.push({
                minutes: j*5,
                desc: j<2 ? '0'+j*5 : j*5,
                isSelected: j==0 ? true : false
            });
        }

        $ionicLoading.hide();
    }

    $scope.selectDay = function(index) {
        if($scope.selectedDay >= 0) 
            $scope.days[$scope.selectedDay].isSelected = false;

        $scope.selectedDay = index;
        $scope.days[$scope.selectedDay].isSelected = true;
    }
    $scope.selectHour = function(index) {
        if($scope.selectedHour >= 0) 
            $scope.hours[$scope.selectedHour].isSelected = false;

        $scope.selectedHour = index;
        $scope.hours[$scope.selectedHour].isSelected = true;
    }
    $scope.selectMinute = function(index) {
        if($scope.selectedMinute >= 0) 
            $scope.minutes[$scope.selectedMinute].isSelected = false;

        $scope.selectedMinute = index;
        $scope.minutes[$scope.selectedMinute].isSelected = true;
    }

    $scope.save = function(isEmpty) {
        
        if(!isEmpty) {
            Event.myEvent.date = new Date(
                $scope.days[$scope.selectedDay].year,
                $scope.days[$scope.selectedDay].month-1,
                $scope.days[$scope.selectedDay].day,
                $scope.hours[$scope.selectedHour].hour,
                $scope.minutes[$scope.selectedMinute].minutes,
                0,
                0
            );
            Event.save();
        }

        if( $stateParams.isNew ) {
            $state.go('editEventFriends', {isNew: true, objectId: $scope.editEvent.id});
        }
        else {
            $state.go('showEvent', {objectId: $scope.editEvent.id});
        }
    }

    //  Other functions
    calculateScreenSize();
    angular.element(window).bind('resize', function () {
        calculateScreenSize();
    });

    function calculateScreenSize() {
        $scope.item = {
                height: ($window.innerHeight-160) +'px',
                width:  $window.innerWidth + 'px'
            };
console.log('item: ', $scope.item);
    }

}]);