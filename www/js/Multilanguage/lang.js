angular.module('letsy.translations', 
		[
			'pascalprecht.translate',
			'letsy.lang_en_us',
			'letsy.lang_pt_pt'
		])

.config(function ($translateProvider, lang_en_us, lang_pt_pt) {
	
	$translateProvider.translations('en_us', lang_en_us);
	$translateProvider.translations('pt_pt', lang_pt_pt);

	$translateProvider.useSanitizeValueStrategy(null);
	$translateProvider.preferredLanguage('en_us');

//	$translateProvider.useLocalStorage();// saves selected language to localStorage

})

.factory('Language',['$rootScope', '$q', '$translate', function($rootScope, $q, $translate){

	function getDateFormat() {
		if( Parse.User.current() )
			return Parse.User.current().get('locale').toLowerCase() == 'en_us' ? 'MM-DD' : 'DD-MM';
		else
			return 'DD-MM';
	}

	return {

		set: function(locale) {

			if( locale ) {
				$translate.use(locale.toLowerCase());
			} else if( Parse.User.current() ) {
	          locale = Parse.User.current().get('locale');
	          $translate.use( locale.toLowerCase() );
	        }

		},

		dateFormat: getDateFormat()

   }
}]);
