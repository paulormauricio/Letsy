angular.module('letsy.SettingsServices',[])

.factory('Settings',
	[
		'$rootScope', 
		'$q', 
		'$filter',
		function(
			$rootScope, 
			$q, 
			$filter
		)
	{

	var locales = [
		{ code: 'en_us' },
		{ code: 'pt_pt' }
	];

	return {

		getAll: function() {
			
			var output = [];

			angular.forEach(locales, function(locale, key) {
				locale.text = $filter('translate')('locale_'+locale.code);
				this.push(locale);
			}, output);

			return output;
		}

   }
}]);
