angular.module('common.ErrorHandlerServices',[])


.factory('ErrorHandler',['$q', '$rootScope', 'global_variables', function( $q, $rootScope, global_variables){

    var Error = Parse.Object.extend("Log");

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
        if(global_variables.debug) save('DEBUG', method, scope, message);
    }

   }

}])

.config(function ($provide) {

  var Error = Parse.Object.extend("Log");
  var uploadError = function(type, method, scope, message) {

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

  // catch exceptions inside angular
  $provide.decorator('$exceptionHandler', ['$delegate','global_variables', function($delegate, global_variables){
      return function(exception, cause){
console.log('->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> exceptions inside angular');

        var data = {};
        if(cause)               { data.cause    = cause;              }
        if(exception){
          if(exception.message) { data.message  = exception.message;  }
          if(exception.name) {    data.name  = exception.name;  }
        }

        if(global_variables.debug){
          $delegate(exception, cause);
          console.log('exception', data);
          if(window.cordova) window.alert('Error: '+data.message);
        } else {
          uploadError('ANGULAR EXCEPTION', window.location.hash, data.name, data.message);
        }
      };
    }]);

  // catch exceptions out of angular
  window.onerror = function(message, url, line, col, error){
console.log('->>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> exceptions outside angular');
      var stopPropagation = false;
      var data = {};
      if(message)       { data.message      = message;      }
      if(url)           { data.fileName     = url;          }
      if(line)          { data.lineNumber   = line;         }
      if(col)           { data.columnNumber = col;          }
      if(error){
        if(error.name)  { data.name         = error.name;   }
        if(error.stack)  { data.stack         = error.stack;   }
      }

      console.log('exception', data);
      if(window.cordova) {
        //window.alert('Error: '+data.message);
      }
      uploadError('JAVASCRIPT EXCEPTION', window.location.hash, data.name, data);

      return stopPropagation;
    };
});