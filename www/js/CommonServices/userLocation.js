angular.module('common.GeolocationServices',['geolocation'])

.factory('userlocation', ['$timeout', '$rootScope', '$q', '$cordovaGeolocation', 'geolocation', 'ErrorHandler', function( $timeout, $rootScope, $q, $cordovaGeolocation, geolocation, ErrorHandler) {

    return {
        get: function () {

        	var deferred = $q.defer();

        	if( ionic.Platform.isIOS() || ionic.Platform.isAndroid() || ionic.Platform.isWindowsPhone() ) {
	        	$cordovaGeolocation.getCurrentPosition()
		            .then(function (position) {
		            	
		                var glocation = {
			                lat: position.coords.latitude,
			                lng: position.coords.longitude
			            };

			            $timeout(function() {
			            	$rootScope.$apply(function() { deferred.resolve(glocation); });
		            	})

		            }, function (error) {
		                console.log('Geolocation error: ', error);
		                ErrorHandler.error('GeolocationServices', 'userlocation.get()',error.message);
		            });
            }
            else {
            	
            	geolocation.getLocation().then(function(position){
			    	var glocation = {
		    			lat: position.coords.latitude, 
		    			lng: position.coords.longitude
		    		};
		    		
		    		// Workaround para contornar o erro "$digest already in progress"
			    	$timeout(function() {
			    		$rootScope.$apply(function() { deferred.resolve(glocation); });
		    		})

			    });
            }

            return deferred.promise;
        }

    }

}]);