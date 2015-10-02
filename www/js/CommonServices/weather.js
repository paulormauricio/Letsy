angular.module('letsy.WeatherServices',[])


.factory('Weather',['$q', '$http', '$filter', 'ErrorHandler', function( $q, $http, $filter, ErrorHandler){


	var locale = Parse.User.current().get('locale').substring(0, 2);
    var URL = "https://api.worldweatheronline.com/free/v2/weather.ashx?";
    var KEY = "eedf22d8e65bce4afbed9d86c0d38";

    var time = null;

	return {

		get: function(date, location) {

			time = $filter('date')(date, 'HH');
			date = $filter('date')(date, 'yyyy-MM-dd');

//https://api.worldweatheronline.com/free/v2/weather.ashx?key=eedf22d8e65bce4afbed9d86c0d38&tp=1&cc=no&num_of_days=1&format=json&date=2015-07-24&q=lisbon

			var query = location.lat+','+location.lng;

			var request = $http({
                        method: "get",
                        url: URL,
                        params: {
                            tp: '3',
                            cc: 'no',
                            num_of_days: 1,
                            format: 'json',
                            lang: locale,
                            key: KEY,
                            date: date,
                            q: query
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
        ErrorHandler.error('WeatherServices', 'Weather.get()',error.message);
        return( $q.reject( response.data.message ) );
    }
    function handleSuccess( response ) {
        console.log('weather: ',response);
        if(response.data.data.weather == undefined) {
            ErrorHandler.warning('WeatherServices', 'Weather.get() -> handleSuccess()','Response.data.data.weather is undefined!');
            return {};
        }
    	var index = Math.round(time * 3 / 10);
    	var data = response.data.data.weather[0].hourly[index];
    	var result = {
    		code: data.weatherCode,
    		desc: data.weatherDesc[0].value,
    		icon_url: data.weatherIconUrl[0].value,
    		tempC: data.FeelsLikeC,
    		tempF: data.FeelsLikeF
    	};
        var array = result.icon_url.split('/');
        result.icon = array[array.length - 1];
        
    	if( locale != 'en' ) result.desc = data['lang_'+locale][0].value;
        
        return( result );
    }
}]);
