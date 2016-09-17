
var vm = require('vm');
Contextify = require('contextify');


process.on('message', function(m) {

  var context = {console : console }
  var sandbox = vm.createContext(context);//Contextify({setTimeout : setTimeout});
  var script = "(function(callback) {  a=1; b=2; c= a+b; callback(c) })"
  vm.runInContext( script , sandbox)(function( test ){ process.send('done') })

});
