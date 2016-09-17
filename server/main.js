import { Meteor } from 'meteor/meteor';
var vm = require('vm');
var util = require('util');
var path = require('path');
var fork = require('child_process').fork;

Meteor.startup( () => {
  // code to run on server at startup
  Meteor.call('runProfile')
});

runNative = function( callback ){//
  var timeA = Date.now()

  var run = function( ) {
    a=1;
    b=2;
    c= a+b;
    return c
  }
  run()

  callback( Date.now() - timeA , 'native')

  return
}

runVM = function( callback ){
  var timeA = Date.now()

  var script = "(function(callback) {  a=1; b=2; c= a+b; callback(c) })"


  var context = {setTimeout : setTimeout}
  var sandbox = vm.createContext(context);//Contextify({setTimeout : setTimeout});
  vm.runInContext( script , sandbox)(function( test ){ callback( Date.now() - timeA, 'vm' );  })

}

runVMChild = function( callback ){

  var base = path.resolve('.');
  var filePath = base+"/assets/app/child.js"
  //run a node child process witht he file child.js which is in the folder /private/
  var childProcess = fork(filePath);

  var timeA = Date.now()
  childProcess.send({ input: 'world'});
  childProcess.on('close', function (code, signal){
    console.log( 'child process terminated due to receipt of signal');
    callback( Date.now() - timeA, 'childvm' );
  });

  childProcess.on('message', function(response) {
    if ( response === 'done'){
      childProcess.kill('SIGHUP');

    }else{
      console.log(response);
    }
  });

}

logTimer = function( res, name ){
  // console.log('milliseconds: ', res )
//
console.log('called back');
  var obj = {}
  obj[name] = res
  Logs.insert( obj );
}

logTimer = Meteor.bindEnvironment( logTimer )

Meteor.methods({
  runProfile:function(){
    Logs.remove({})

    runNative( logTimer);

    runVM( logTimer )

    runVMChild( logTimer)

  }
});
