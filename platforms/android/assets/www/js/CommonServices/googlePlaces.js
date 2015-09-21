angular.module('letsy.GooglePlacesServices',[])

.factory('GooglePlaces', ['$timeout', '$rootScope', '$q', '$http', function( $timeout, $rootScope, $q, $http) {

//https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=-33.8670522,151.1957362&radius=500&types=food&name=cruise&key=AIzaSyDj5NWOTJPip1I2LAA2BgvB50UzzYECgeQ

	var url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?types=food&name=cruise';

	var key = 'AIzaSyAo1_8GKCmgPHRlGa_IqZI4F7p6JOBmwNk';


    return {

    	get: function(options) {

			var service = new google.maps.places.PlacesService();
			console.log('Service: ', service);
			service.search( request, callback );

			function callback(results, status) 
			{
				console.log('Google results: ', results);
			    if (status == google.maps.places.PlacesServiceStatus.OK) {
			        
			    }
			}

    	},


        nearbySearch: function (options) {

        	var location = options.latitude+','+options.longitude;

        	var query = options.name;
        	var radius = options.radius > 0 ? options.radius : 500;

			var request = $http({
                        method: "get",
                        url: url,
                        params: {
                        	sensor: 	true, 
                        	key: 		key,
                        	location: 	location,
                        	radius: 	radius,
                        	name: 		query
                        }
                    });
			return( request.then( handleSuccess, handleError ) );
        	
        }

    }

    function handleError( response ) {
        if (
            ! angular.isObject( response.data ) ||
            ! response.data.message
            ) {
            return( $q.reject( "An unknown error occurred." ) );
        }
        alert('Google Places Get Error: ' +response.data.message);
        return( $q.reject( response.data.message ) );
    }
    function handleSuccess( response ) {
                
    	console.log('Google places:', response);

        return( response );
    }
}]);
