angular.module('common.ErrorHandlerServices',[])


.factory('ErrorHandler',['$q', '$rootScope', function( $q, $rootScope){

    var Error = Parse.Object.extend("Log");
    var User = Parse.Object.extend("User");

    var isDebug = true;

    function save(type, method, scope, message) {
        console.log('Registered '+type+': ', {
            method: method,
            scope: scope,
            message: message
        });

        if( $rootScope.isOffline || !window.cordova ) return;

        var error = new Error();

        error.set('type', type);
        if( Parse.User.current() ) {
            error.set('User', Parse.User.current());
            error.set('email', Parse.User.current().get('email'));
        }
        error.set('method', method);
        error.set('scope', scope);
        error.set('message', angular.toJson(message));
        error.save();
    }


	return {

		error: function(method, scope, message) {
            save('ERROR', method, scope, message);
		},

        warning: function(method, scope, message) {
            save('WARNING', method, scope, message);
        },

        debug: function(method, scope, message) {
            if(isDebug) save('DEBUG', method, scope, message);
        }

   }

}])

.config(function ($provide) {

  $provide.decorator('$exceptionHandler', ['$delegate', function($delegate){
      return function(exception, cause){
console.log('->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Chegou decorator');
        $delegate(exception, cause);

        var data = {
          type: 'angular',
          url: window.location.hash,
          localtime: Date.now()
        };
        if(cause)               { data.cause    = cause;              }
        if(exception){
          if(exception.message) { data.message  = exception.message;  }
          if(exception.name)    { data.name     = exception.name;     }
          if(exception.stack)   { data.stack    = exception.stack;    }
        }

        if(debug){
          console.log('exception', data);
          window.alert('Error: '+data.message);
        } else {
          ErrorHandler.error(data.url, exception.name, exception.message);
        }
      };
    }]);
    // catch exceptions out of angular
    window.onerror = function(message, url, line, col, error){
console.log('->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Chegou onerror');
      var stopPropagation = debug ? false : true;
      var data = {
        type: 'javascript',
        url: window.location.hash,
        localtime: Date.now()
      };
      if(message)       { data.message      = message;      }
      if(url)           { data.fileName     = url;          }
      if(line)          { data.lineNumber   = line;         }
      if(col)           { data.columnNumber = col;          }
      if(error){
        if(error.name)  { data.name         = error.name;   }
        if(error.stack) { data.stack        = error.stack;  }
      }

      if(debug){
        console.log('exception', data);
        window.alert('Error: '+data.message);
      } else {
        ErrorHandler.error(data.url, error.name, data.message);
      }
      return stopPropagation;
    };
})

.constant('config', {
    debug: true,
    version: '1.0.0'
});