angular.module('common.DynamicBackgroundImage',[])


.directive('resizeOnScroll', function($rootScope) {
  return function(scope, elem, attr) {
    var start = 0;

    $rootScope.imageResize = {height: 0};

    elem.bind('scroll', function(e) {
      
      if(start - e.detail.scrollTop > 0) {
        $rootScope.imageResize.height = start - e.detail.scrollTop;
      } 
      else {
      	$rootScope.imageResize.height = 0;
      }

      $rootScope.$apply();
    });
  };
});