angular.module('common.Directives',[])

.directive('dynamicHeader', function($rootScope) {
  return function(scope, elem, attr) {

    var start = 0;
    var threshold = 320;
    
    elem.bind('scroll', function(e) {
      
      if(e.detail.scrollTop - start > threshold) {
        $rootScope.slideHeader = true;
      } else {
        $rootScope.slideHeader = false;
      }
      if ($rootScope.slideHeaderPrevious > e.detail.scrollTop - start) {
        //$rootScope.slideHeader = false;
      }
      $rootScope.scrollHeight = e.detail.scrollTop;
      $rootScope.slideHeaderPrevious = e.detail.scrollTop - start;
      $rootScope.$apply();
    });
  };
})

.directive('ngEnter', function() {
        return function(scope, element, attrs) {
            element.bind("keydown keypress", function(event) {
                if(event.which === 13) {
                    scope.$apply(function(){
                      console.log('attrs.ngEnter: ', attrs.ngEnter);
                        scope.$eval(attrs.ngEnter);
                    });
                    
                    event.preventDefault();
            }
            });
        };
})

.directive('ngLoad', function($rootScope, $timeout) {
  return function(scope, elem, attr) {

    $timeout(function() {
      $rootScope.isLoaded = true;
      eval(attr.ngLoad);
      $rootScope.$apply();
    }, 10);

  };
});