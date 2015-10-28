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
        '$timeout',
        'Event', 
        'Participant', 
        'ErrorHandler',
        'Chat',
        'Theme',
        function( 
            $window, 
            $state, 
            $scope,
            $ionicLoading,
            $ionicListDelegate,
            $ionicPopup,
            $filter,
            $rootScope,
            $timeout,
            Event,
            Participant,
            ErrorHandler,
            Chat,
            Theme
        )
    {

console.log('');
console.log('<<<<<<-----------   Events Screen  ---------->>>>>');

   
    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    calculateColectionItemSize();

    $scope.doRefresh = function() {

        if( $rootScope.isOffline ) {
            $scope.$broadcast('scroll.refreshComplete');
            return;
        }
console.log('<---------- Refresh events ----------->');
        Event.getMyEvents().then(function(objects) {
            console.log('myEvents: ', objects);
            if(objects)
                $scope.myEvents = objects;
            else 
                loadLocalEvents();
        });

        Event.getNew().then(function(objects) {
            $scope.newEvents = objects;
            console.log('newEvents: ', objects);
        })
        .finally(function() {
            $scope.$broadcast('scroll.refreshComplete');
            $ionicLoading.hide();
        });
    }

    if( $rootScope.isOffline ) {
        loadLocalEvents();
    }
    else {
        $scope.doRefresh();
    }

    Event.getNew().then(function(objects) {
        $scope.newEvents = objects;
        console.log('New Events: ', objects);
    });

    function loadLocalEvents() {
        console.log('Loading Local Events');
        Event.loadMyEvents().then(function(objects) {
            $scope.myEvents = objects;
            console.log('My Events: ', objects);
        })
        .finally( function() {
            $ionicLoading.hide();
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
        });

        Theme.incrementUsage(newEvent.theme);

        $timeout(function() {
            $scope.newEvents.splice(index, 1);
            $scope.myEvents.push(newEvent);
            Event.updateEventLocally(newEvent);
        });
        //Notify event host
        Event.notifyHost(newEvent, Parse.User.current().get('first_name')+' '+Parse.User.current().get('last_name')+$filter('translate')('event_push_user_join')+newEvent.name );
    }

    $scope.leaveEvent = function(newEvent, index) {
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
                //Notify event host
                Event.notifyHost(newEvent, Parse.User.current().get('first_name')+' '+Parse.User.current().get('last_name')+$filter('translate')('event_push_user_left')+newEvent.name );
            }
        });
    }

    // angular.element(window).bind('resize', function () {
    //     calculateColectionItemSize();
    // });
    function calculateColectionItemSize() {
        $timeout(function() {
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
        });
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
            'Theme',
            'PushService',
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
                theme,
                PushService,
                ErrorHandler
            )
    {
console.log('');
console.log('<<<<<<-----------   Show Screen  ---------->>>>>');

    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});
    
    $timeout(function() {
        $scope.myFacebookId = Parse.User.current().get('facebookId');
        $scope.isShowJoinButton = false;
        $scope.isHost = false;
        $scope.isShowDetailPanel = true;
        $scope.detailPanelScrollUp = 0;
        $scope.imageResizeHeight = 0;
        $scope.chatMarginTop = 10;
        $scope.chatMarginBottom = 0;
        $scope.isPanelSlow = false;
    });

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
    loadChat();
    

    function loadEventDetail() {

        $scope.showEvent = Event.showEvent;
        console.log('$scope.showEvent: ', $scope.showEvent);
console.log('$scope.showEvent.background_url: ',$scope.showEvent.background_url);
        if($scope.showEvent.background_url) {
            $scope.background_image_url = $scope.showEvent.background_url;
        }
        else if($scope.showEvent.place_image_url) {
            $scope.background_image_url = $scope.showEvent.place_image_url;
        }
        else {
            $scope.background_image_url = 'img/themeIcon/'+$scope.showEvent.theme+'.png';
        }


        $scope.weather = {};
        if( !$rootScope.isOffline ) {
            //$scope.showEvent.participants = {};
            Participant.getAll(Event.showEvent).then(function(result) {
         
                $scope.showEvent.participants_all = $filter('orderBy')(result, '-isGoing +first_name +last_name' );
                $scope.showEvent.totalParticipants = 0;

                $scope.showEvent.participants = [];

                // Validar se o utilizador vai ao evento
                var count = 0;
                for (var i = 0; i<$scope.showEvent.participants_all.length; i++) {
                    if($scope.showEvent.participants_all[i].isGoing) {
                        $scope.showEvent.participants.push($scope.showEvent.participants_all[i]);
                        $scope.showEvent.totalParticipants++;
                        if( $scope.showEvent.participants_all[i].id == Parse.User.current().id ) {
                            count++;
                            // Store Participants Locally
                            Event.updateEventLocally($scope.showEvent);
                        }
                    }
                    else {
                        break;
                    }
                };
                console.log('Participantes: ', $scope.showEvent.participants_all);
                $scope.isShowJoinButton = count == 0 ? true : false;

                if($scope.showEvent.createdBy == Parse.User.current().id) {
                    $scope.isHost = true;
                    $scope.isOwner = true;
                }
                else {
                    $scope.isHost = false;
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
            $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
            $window.document.getElementById("inputMessage").focus();
            console.log('scrollBottom');
        });
        
    }

    $scope.onMessageHold = function(event, index, message) {
        console.log('onMessageHold');
    }

    $scope.$on('elastic:resize', function(event, element, oldHeight, newHeight) {
        oldHeight = oldHeight == 'auto' ? newHeight : oldHeight;
        $scope.chatMarginBottom += newHeight - oldHeight;
        $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
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

    $scope.back = function() {
        Chat.clearCache();
        $state.go('events', {}, {reload: true});
    }

    $scope.edit = function() {
        if($scope.isHost) {
            Event.myEvent = $scope.showEvent;
            $state.go('editEvent', {objectId: $scope.showEvent.id});
        }
    }

    $scope.joinEvent = function() {
        $ionicLoading.show({
          templateUrl : 'views/templateSuccessFeedback.html',
          duration: 1500,
          noBackdrop: true
        });

        Theme.incrementUsage($scope.showEvent.theme);
        Participant.updateByEvent($scope.showEvent, Parse.User.current(), true);
        
        // Remove event from newEvents list
        Event.removeFromNewEvents($scope.showEvent.id);

        $timeout(function() {
            $scope.isShowJoinButton = false;

            for (var i = 0; i<$scope.showEvent.participants_all.length; i++) {
                if($scope.showEvent.participants_all[i].facebookId == Parse.User.current().get('facebookId')) {
                    $scope.showEvent.participants_all[i].isGoing = true;
                    $scope.showEvent.participants.push($scope.showEvent.participants_all[i]);
                    $scope.showEvent.totalParticipants++;
                    break;
                }
            }
            Event.updateEventLocally($scope.showEvent);
        });

        //Notify event host
        Event.notifyHost($scope.showEvent, Parse.User.current().get('first_name')+' '+Parse.User.current().get('last_name')+$filter('translate')('event_push_user_join')+$scope.showEvent.name );
    }

    $scope.leaveEvent = function() {

        $ionicPopup.confirm({
            title: $filter('translate')('event_leave'),
            template: $filter('translate')('event_leave_confirm')+$scope.showEvent.name+'?',
            okText: $filter('translate')('event_leave'),
            okType: 'button-assertive',
            cancelText: $filter('translate')('cancel'),
            cancelType: 'button-stable'
        }).then(function(result) {
            if(result) {

                for (var i = 0; i < $scope.showEvent.participants_all.length; i++) {
                    if( $scope.showEvent.participants_all[i].id === Parse.User.current().id ) {
                        Participant.delete($scope.showEvent.participants_all[i].participantId);
                        break;
                    }
                };

                Event.leaveEvent($scope.showEvent);

                $ionicLoading.show({
                  templateUrl : 'views/templateDestroyFeedback.html',
                  duration: 1500,
                  noBackdrop: true
                });
                $timeout(function() {
                    $state.go('events');
                }, 1500);

                // Remove event from newEvents list
                if($scope.isShowJoinButton) 
                    Event.removeFromNewEvents($scope.showEvent.id);

                //Notify event host
                Event.notifyHost($scope.showEvent, Parse.User.current().get('first_name')+' '+Parse.User.current().get('last_name')+$filter('translate')('event_push_user_left')+$scope.showEvent.name );
            }
        });
    }

//  Edit Place  -------------------
    $scope.placePressed = function() {
        if( $scope.showEvent.place_lat != undefined && $scope.showEvent.place_lng != undefined ) {
            $state.go('showEventMap', {objectId: $scope.showEvent.id});
        }
    }

//  Edit Participants Section -------------------
    $scope.showParticipants = function() {
        console.log('chegou');
        $scope.isShowParticipants = !$scope.isShowParticipants;
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
            $scope.hideDetailPanel();
        }
        else {
            //console.log('Reduce panel. Scroll = ', scroll);
            $scope.detailPanelScrollUp = -1*scroll;
        }
    }

    $scope.releaseDetailPanel = function() {
console.log('Release');
        if( $scope.isShowDetailPanel ) {
            $timeout(function() {
                $scope.detailPanelScrollUp = 0;
                $scope.imageResizeHeight = 0;
            });
        }
    }

    $scope.hideDetailPanel = function() {
        $timeout(function() {
            $scope.isShowDetailPanel = false;
            $scope.isEdit = false;
            $scope.chatMarginTop = 10;
            $scope.detailPanelScrollUp = 0;
            $scope.isPanelSlow = true;
            $scope.isShowParticipants = false;
        });
        
        $timeout(function() {
            $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
        }, 200);
        console.log('hideDetailPanel');
    }

    $scope.showDetailPanel = function() {
        if( !$scope.isShowDetailPanel ) {
            console.log('showDetailPanel');
            $timeout(function() {
                $scope.isShowDetailPanel = true;
                $scope.detailPanelScrollUp = 0;
                $scope.chatMarginTop = $scope.item.firstRowHeight + 50;
            });

            $timeout(function() {
                $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
                $scope.isPanelSlow = false;
            }, 1000);
        }
    }

    //  Other functions
    calculateScreenSize();

    // angular.element(window).bind('resize', function () {
    //     calculateScreenSize();
    // });

    function calculateScreenSize() {
        $timeout(function() {
            $scope.item = {
                    height: $window.innerHeight,
                    width:  $window.innerWidth,
                    firstRowHeight: $window.innerHeight - 300,
                    colletionItemWidth: 40
                };

            $scope.chatMarginTop = $scope.item.firstRowHeight + 47;

            if($scope.showEvent && $scope.showEvent.participants) {
                if( $scope.showEvent.participants.length > 6 )
                    $scope.item.colletionItemWidth = $scope.item.width / 8;
                else if( $scope.showEvent.participants.length > 15 )
                    $scope.item.colletionItemWidth = $scope.item.width / 10;
                else
                    $scope.item.colletionItemWidth = $scope.item.width / 6;
            }
        });
    }

}])


.controller('EventEditController',
        [
            '$scope',
            'Event',
            'Participant',
            '$state',
            '$stateParams',
            '$ionicLoading', 
            '$ionicPopup',
            '$ionicActionSheet',
            '$timeout',
            '$filter',
            'PushService',
            'ErrorHandler',
            function(
                $scope,
                Event,
                Participant,
                $state,
                $stateParams, 
                $ionicLoading,
                $ionicPopup,
                $ionicActionSheet,
                $timeout,
                $filter,
                theme,
                PushService,
                ErrorHandler
            )
    {
console.log('');
console.log('<<<<<<-----------   Edit Screen  ---------->>>>>');

    
    $scope.myFacebookId = Parse.User.current().get('facebookId');
console.log('Event.myEvent: ', Event.myEvent);
    if( $stateParams.objectId == '') {
        $state.go('events');
        return;
    }
    else if( !Event.myEvent ) {
        $state.go('showEvent', {objectId: $stateParams.objectId});
        return;
    }
    
    $scope.editEvent = Event.myEvent;

    console.log('Event.myEvent: ', Event.myEvent);

    if($scope.editEvent.background_url) {
        $scope.background_image_url = $scope.editEvent.background_url;
    }
    else if($scope.editEvent.place_image_url) {
        $scope.background_image_url = $scope.editEvent.place_image_url;
    }
    else {
        $scope.background_image_url = 'img/themeIcon/'+$scope.editEvent.theme+'.png';
    }

    $scope.back = function() {
        Event.resetMyEvent();
        $state.go('showEvent', {objectId: Event.showEvent.id});
    }

    $scope.changePhoto = function() {
        console.log('change photo!');
    }

    $scope.deleteEvent = function() {

        $ionicPopup.confirm({
            title: $filter('translate')('event_delete'),
            template: $filter('translate')('event_delete_confirm')+$scope.editEvent.name+'?',
            okText: $filter('translate')('event_delete'),
            okType: 'button-assertive',
            cancelText: $filter('translate')('cancel'),
            cancelType: 'button-stable'
        }).then(function(result) {
            if(result) {

                $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

                Event.myEvent.isDeleted = true;
                Event.save().then(function(){
                    console.log('Event deleted successfully!');

                    var notify_tokens = [];
                    var push_message = '';
                    var payload = {
                    };
                    for (var i = 0; i < $scope.editEvent.participants.length; i++) {
                        notify_tokens.push($scope.editEvent.participants[i].device_token);
                    }
                    if( notify_tokens.length > 0 ) {
                        push_message = Event.myEvent.name+' '+$filter('translate')('event_push_canceled');
                        PushService.send(notify_tokens, push_message, payload);
                    }
                    $state.go('events');
                }).catch(function(error){
                    ErrorHandler.error('EventShowController', 'deleteEvent()', error.message);
                }).finally(function(){
                    $ionicLoading.hide();
                });
            }
        });
    }


//  Edit Place  -------------------
    $scope.placePressed = function() {

        if( !$scope.editEvent.place_name ) {
            $state.go('editEventPlace', {objectId: $scope.editEvent.id});
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
                            $state.go('editEventPlace', {objectId: $scope.editEvent.id});
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
                    Event.deletePlace();
                    $scope.editEvent = Event.myEvent;
                }
            });

            // For example's sake, hide the sheet after two seconds
            $timeout(function() {
                hideSheet();
            }, 8000);
        }
    }

//  Edit Participants Section -------------------
    $scope.editParticipants = function() {
        $state.go('editEventFriends', {objectId: $scope.editEvent.id});
    }

//  Data Section --------------------------------
    $scope.editDate = function() {
        $state.go('editEventDate', {objectId: $scope.editEvent.id});
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
            '$timeout',
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
                $timeout,
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
        $scope.editEvent = !Event.myEvent ? {id: $stateParams.objectId} : Event.myEvent;
    }

    $scope.back = function() {
        if( $scope.isNew ) {
            Event.resetMyEvent();
            $state.go('events');
        }
        else {
            $state.go('editEvent', {objectId: $scope.editEvent.id});
        }
    }

//  Edit Event Name
    $scope.loadThemes = function() {

        Theme.getAll().then(function(themes){
            $timeout(function() {
                $scope.themes = themes;
                $scope.showThemes = true;
            });
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

        Event.myEvent = $scope.editEvent;
        
        Event.myEvent.theme = theme.name;

        $timeout(function() {
           console.log('theme.name: ', theme.name);
            Theme.incrementUsage(theme.name);
        });
        
        if(!$scope.isNew) {
            $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

            Theme.getUrl(theme.name).then(function(url){
                Event.myEvent.background_url =  url;
                console.log('Event.myEvent.background_url: ', Event.myEvent.background_url);

                Event.save($scope.isNew).then(function(savedEvent) {
                    $state.go('showEvent', {objectId: Event.myEvent.id});
                });
            })
            .finally( function() {
                $ionicLoading.hide();
            });
        }
        else {
            Theme.getUrl(theme.name).then(function(url){
                Event.myEvent.background_url =  url;
                console.log('Event.myEvent.background_url: ', Event.myEvent.background_url);
            });
            $state.go('editEventDate', {isNew: true, objectId: Event.myEvent.id}, {reload: true});
        }
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

    if( $stateParams.objectId == '' && !Event.myEvent) {
        $state.go('events');
        return;
    }

    $scope.isNew = $stateParams.isNew ? true : false;

    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    $scope.editEvent = Event.myEvent == undefined ? {} : Event.myEvent;
    if( $stateParams.objectId !== '' && Event.myEvent ) {
        if( Event.myEvent.id == undefined )
            $scope.editEvent.id = $stateParams.objectId; 
    }

    $scope.back = function() {
        if( $scope.isNew ) {
            $state.go('editEventDate', {isNew: true, objectId: $scope.editEvent.id});
        }
        else {
            $state.go('editEvent', {objectId: $scope.editEvent.id});
        }
    }


    $scope.loadFriends = function() {
        console.log('chegou ao loadFriends');

        $scope.friends = [];
        $scope.invitedFriends = [];
        
        Friend.getAll().then(function(friends) {

            $scope.friends = friends;

            if( $scope.editEvent.id ) {
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
            }
            else {
                $scope.invitedFriends[0] = {
                    id: Parse.User.current().id,
                    facebookId: Parse.User.current().get('facebookId'),
                    first_name: Parse.User.current().get('first_name'),
                    last_name: Parse.User.current().get('last_name'),
                    isGoing: true,
                    isHidden: false
                }
            }
            
        })
        .catch(function(fallback) {
            console.log('Error: ', fallback + '!!');
        })
        .finally( function() {
            $ionicLoading.hide();
        });
    }

    function loadParticipants() {

    }

//  Edit Event Participants
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

    $scope.saveEvent = function() {

console.log('$scope.editEvent: ', $scope.editEvent);
console.log('Event.myEvent: ', Event.myEvent);

        Event.myEvent = $scope.editEvent;
        $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});
        Event.save($scope.isNew).then(function(savedEvent) {
            Event.myEvent.id = savedEvent.id;
            Event.myEvent._id = savedEvent.id;
console.log('Event.myEvent after save: ', savedEvent);
            Participant.store(Event.myEvent, Parse.User.current(), true);
            
            notifyParticipants();


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
            
            $ionicLoading.hide();

            var delay = 0;
            if($scope.isNew) {
                $ionicLoading.show({
                  templateUrl : 'views/templateSuccessFeedback.html',
                  duration: 1500,
                  noBackdrop: true
                });
            }

        })
        .catch(function(error){
            ErrorHandler.error('EventEditParticipantsController', 'saveEvent()',error.message);
            $ionicLoading.hide();
        })
        .finally( function() {
            $timeout(function() {
                $state.go('showEvent', {objectId: Event.showEvent.id});
            }, 1500);
        });
    }

    function notifyParticipants() {
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

    if( $stateParams.objectId == '' && !Event.myEvent) {
        $state.go('events');
        return;
    }

    $scope.isNew = $stateParams.isNew ? true : false;

    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    $scope.editEvent = Event.myEvent == undefined ? {} : Event.myEvent;
    if( $stateParams.objectId !== '' && Event.myEvent ) {
        if( Event.myEvent.id == undefined )
            $scope.editEvent.id = $stateParams.objectId; 
    }
    else if( $stateParams.objectId == '' ) {
        $state.go('events');
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

    if($stateParams.objectId=''){
        $state.go('events');
    }
    else if(!Event.showEvent) {
        $state.go('showEvent', {objectId: $stateParams.objectId});
    }

    $scope.showEvent = Event.showEvent;

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
    
    if( $stateParams.objectId == '' && !Event.myEvent) {
        $state.go('events');
        return;
    }

    $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});

    $scope.scrollItemHeight = 35;

    $scope.editEvent = Event.myEvent == undefined ? {} : Event.myEvent;
    if( Event.myEvent ) {
        if( Event.myEvent.id == undefined )
            $scope.editEvent.id = $stateParams.objectId; 
    }

    $scope.isRepeat = ($scope.editEvent.repeatEventType == 0 || !$scope.editEvent.repeatEventType) ? false : true;

console.log('$scope.editEvent: ', $scope.editEvent);
console.log('Event.myEvent: ', Event.myEvent);

    $scope.back = function() {
        if( $stateParams.isNew ) {
            $state.go('editEventName', {isNew: true, objectId: $scope.editEvent.id});
        }
        else {
            $state.go('editEvent', {objectId: $scope.editEvent.id});
        }
    }

    var selectedDay = 0;
    var selectedDate = Date();
    function setDay(newDate) {
        selectedDate = newDate;
        selectedDay = newDate.getDate();

        var week = $filter('translate')('date_week_'+$filter('date')(newDate,'EEE').toLowerCase());
        var day = $filter('date')(newDate, 'dd/')+$filter('translate')('date_month_'+$filter('date')(newDate, 'MM'));

        $scope.selectedDayDesc = day + ' <small>('+week+')</small>';
    }
    var selectedHour = 0;
    function setHour(newDate) {
        selectedHour = newDate.getHours();
        if( selectedHour < 10 ) $scope.selectedHourDesc = '0'+selectedHour;
        else $scope.selectedHourDesc = selectedHour;
    }
    var selectedMinute = 0;
    function setMinute(newDate) {
        selectedMinute = newDate.getMinutes();
        if( selectedMinute < 10 ) $scope.selectedMinuteDesc = '0'+selectedMinute;
        else $scope.selectedMinuteDesc = selectedMinute;
    }
    function evaluateDates() {
        var newDate = new Date();
        if( newDate.getYear() >= selectedDate.getYear() &&
            newDate.getMonth() >= selectedDate.getMonth() &&
            newDate.getDate() >= selectedDay )
            $scope.allowLowerDays = false;
        else
            $scope.allowLowerDays = true;

        if( newDate.getHours() >= selectedHour && !$scope.allowLowerDays) {
            $scope.allowLowerHours = false;
            setHour(newDate);
            setMinute(newDate);
        }
        else 
            $scope.allowLowerHours = true;
        

        if( newDate.getMinutes() >= selectedMinute && !$scope.allowLowerHours) {
            $scope.allowLowerMinutes = false;
            setMinute(newDate);
        }
        else 
            $scope.allowLowerMinutes = true;
        
    }

    Date.prototype.addDays = function(d) {    
       this.setTime(this.getTime() + (d*24*60*60*1000)); 
       return this;   
    }
    Date.prototype.addHours = function(h) {    
       this.setTime(this.getTime() + (h*60*60*1000)); 
       return this;   
    }
    Date.prototype.addMinutes = function(m) {    
       this.setTime(this.getTime() + (m*60*1000)); 
       return this;   
    }

    $scope.datepickerObject = {};

    $scope.loadDates = function() {
        console.log('chegou ao loadDates');

        var newDate = new Date();
        newDate.addHours(1);
        newDate.setMinutes(0);

        setDay(newDate);
        setHour(newDate);
        setMinute(newDate);

        evaluateDates();

        console.log('selectedDate: ', selectedDate.addDays(-1));

        $scope.datepickerObject = {
            titleLabel: $filter('translate')('date_select'),  //Optional
            todayLabel: $filter('translate')('date_today'),  //Optional
            closeLabel: $filter('translate')('event_close'),  //Optional
            monthList: [
                $filter('translate')('date_month_01'),
                $filter('translate')('date_month_02'),
                $filter('translate')('date_month_03'),
                $filter('translate')('date_month_04'),
                $filter('translate')('date_month_05'),
                $filter('translate')('date_month_06'),
                $filter('translate')('date_month_07'),
                $filter('translate')('date_month_08'),
                $filter('translate')('date_month_09'),
                $filter('translate')('date_month_10'),
                $filter('translate')('date_month_11'),
                $filter('translate')('date_month_12')
            ],
            weekDaysList: [
                $filter('translate')('date_week_su'),
                $filter('translate')('date_week_m'),
                $filter('translate')('date_week_t'),
                $filter('translate')('date_week_w'),
                $filter('translate')('date_week_t'),
                $filter('translate')('date_week_f'),
                $filter('translate')('date_week_s')
            ],
            setLabel: 'OK',  //Optional
            setButtonType : 'themeBackgroundColor',  //Optional
            todayButtonType : 'button-stable',  //Optional
            closeButtonType : 'button-stable',  //Optional
            inputDate: selectedDate,    //Optional
            mondayFirst: true,    //Optional
            // disabledDates: disabledDates,
            templateType: 'popup', //Optional
            showTodayButton: 'true', //Optional
            modalHeaderColor: 'themeBackgroundColor', //Optional
            modalFooterColor: 'bar-stable', //Optional
            from: newDate,   
            callback: function (val) {    //Mandatory
                if(val) {
                    setDay(val);
                }
            }
        }

        $ionicLoading.hide();
    }

    $scope.changeDay = function(isUp) {
        if(isUp) 
            selectedDate.addDays(1);
        else 
            selectedDate.addDays(-1);
        setDay(selectedDate);
        evaluateDates();
    }
    $scope.changeHour = function(isUp) {
        if(isUp) 
            selectedDate.addHours(1);
        else 
            selectedDate.addHours(-1);
        setHour(selectedDate);
        setDay(selectedDate);
        evaluateDates();
    }
    $scope.changeMinute = function(isUp) {
        if(isUp) 
            selectedDate.addMinutes(5);
        else 
            selectedDate.addMinutes(-5);
        setMinute(selectedDate);  
        setHour(selectedDate);
        setDay(selectedDate); 
        evaluateDates();
    }
    $scope.changeRepeat = function(val) {
        if( $scope.isRepeat && $scope.editEvent.repeatEventType == 0 ||
            !$scope.editEvent.repeatEventType) {
            $scope.editEvent.repeatEventType = 1;
        }
        $scope.isRepeat = !$scope.isRepeat;
    }

    $scope.save = function(isEmpty) {
        
        if(!isEmpty) {
            console.log('$scope.isRepeat: ', $scope.isRepeat);
            console.log('$scope.editEvent.repeatEventType: ', $scope.editEvent.repeatEventType);
            Event.myEvent.date = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth()-1,
                selectedDay,
                selectedHour,
                selectedMinute,
                0,
                0
            );
            Event.myEvent.repeatEventType = !$scope.isRepeat ? 0 : $scope.editEvent.repeatEventType;
        }
        else {
            Event.myEvent.repeatEventType = 0;
            Event.myEvent.date = undefined;
        }

        if( $stateParams.isNew ) {
            $state.go('editEventFriends', {isNew: true, objectId: $scope.editEvent.id});
        }
        else {
            $scope.loadingIndicator = $ionicLoading.show({showBackdrop: false});
            Event.save().then(function(savedEvent) {
                $state.go('showEvent', {objectId: Event.myEvent.id});
            })
            .finally( function() {
                $ionicLoading.hide();
            });
        }
    }

    //  Other functions
    calculateScreenSize();
    angular.element(window).bind('resize', function () {
        calculateScreenSize();
    });

    function calculateScreenSize() {
        $scope.scroll = {
                height: ($window.innerHeight-373),
                width:  $window.innerWidth
            };
    }

}]);