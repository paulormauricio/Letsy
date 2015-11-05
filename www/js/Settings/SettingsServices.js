angular.module('letsy.SettingsServices',[])

.factory('Settings',
	[
		'$rootScope', 
		'$q', 
		'$filter',
		'$ionicPopup',
		'ErrorHandler',
		'global_variables',
		function(
			$rootScope, 
			$q, 
			$filter,
			$ionicPopup,
			ErrorHandler,
			global_variables
		)
	{

	var locales = [
		{ code: 'en_us' },
		{ code: 'pt_pt' }
	];


	function getParseConfig() {

		if(!window.cordova) return;

		Parse.Config.get().then(function(config) {
			console.log("Get Settings from server");

			var appVersion = config.get("appVersion");
			console.log("appVersion: ", appVersion);

			if( appVersion > global_variables.app_version) {

				$ionicPopup.confirm({
					title: $filter('translate')('upgrade'),
					template: $filter('translate')('upgrade_desc'),
					okText: $filter('translate')('yes'),
					okType: 'themeBackgroundColor',
					cancelText: $filter('translate')('no'),
					cancelType: 'button-stable'
				}).then(function(result) {
					if(result && window.cordova) {
						var url = '';
						if(ionic.Platform.isIOS()) {
							console.log('Send to App Store');
							url = 'https://itunes.apple.com/app/coursera/id736535961';
						}
						else {
							console.log('Send to Google play')
							url = 'https://play.google.com/store/apps/details?id=com.abcd.xyz';
						}
						cordova.InAppBrowser.open(url, '_system', 'location=yes');
					}
				});

			}

		}, function(error) {
			ErrorHandler.error('SettingsServices', 'getParseConfig()',error);
			// console.log("Failed to fetch. Using Cached Config.");
			// var config = Parse.Config.current();
			// var welcomeMessage = config.get("welcomeMessage");
		});
	}

	getParseConfig();

	return {

		getAll: function() {
			
			var output = [];

			angular.forEach(locales, function(locale, key) {
				locale.text = $filter('translate')('locale_'+locale.code);
				this.push(locale);
			}, output);

			return output;
		},

		getParseConfig: getParseConfig

   }
}]);
