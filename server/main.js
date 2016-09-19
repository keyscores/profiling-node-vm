import { Meteor } from 'meteor/meteor';
var vm = require('vm');
var util = require('util');
var path = require('path');
var fork = require('child_process').fork;



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
  var timeA = Date.now()

  var childProcess = fork(filePath);

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

  //trigger a vm run in child.js
  childProcess.send({ input: 'world'});


}

initializing = true
startBackground = function( callback ){

  var base = path.resolve('.');
  var filePath = base+"/assets/app/child.js"
  //run a node child process witht he file child.js which is in the folder /private/
  var backgroundProcess = fork(filePath);


  var query = Job.find({});
  var handle = query.observe({
    added: function ( doc ) {

      if ( !initializing ){
        console.log('observeChanges, added: ', doc._id  + " time: " + Date.now() );

        Logs.insert({ testId: doc.testId , name: 'background' , start: Date.now() })
        backgroundProcess.send({ testId: doc.testId });
      }


      //trigger a job in the process
      // messageProcess()

    }
  });


  // backgroundProcess.send({ input: 'world'});
  // backgroundProcess.on('close', function (code, signal){
  //   console.log( 'child process terminated due to receipt of signal');
  // });

var update = function( idObj ){
  // var startTime = Logs.findOne({ testId: testId}).start
  var testId = idObj.testId
  var endTime = Date.now()
  console.log('endTime: ', endTime );

  var startTime = Logs.findOne({ testId: testId }).start
  // console.log('startTime: ', startTime );
  var totalTime = endTime - startTime
  console.log('totalTime ', totalTime);
  Logs.update({ testId: testId }, { $set: { end: endTime , value: totalTime }})
}
// place in a fiber so it doesn't get lost whe called on a event handler
update = Meteor.bindEnvironment( update )

  backgroundProcess.on('message', function(response) {
    if ( response !== 'done' ){
      // dont kill the process keep it running, just update the logs.
      var objResponse = JSON.parse( response )
      console.log( 'objResponse: ', objResponse);
      update( objResponse )
      console.log('time: ', Date.now() );
      console.log('message', response);

    }
  });

  initializing = false
  // Logs.insert({ testId: testId , name: 'background' , start: Date.now() })





}

triggerBackground = function(){
  var testId = Random.id()

  Job.insert({ testId: testId } )

}

logTimer = function( res, name ){
  // console.log('milliseconds: ', res )
//
console.log('called back');
  var obj = {name: name , value: res }
  // obj[name] = res
  Logs.insert( obj );
}

logTimer = Meteor.bindEnvironment( logTimer )

Meteor.methods({
  runProfile:function(){

    runNative( logTimer);

    runVM( logTimer )

    runVMChild( logTimer)

    triggerBackground()


  },
  triggerBackground: function(){
    triggerBackground()

  }
});



Meteor.startup( () => {
  // code to run on server at startup
  Logs.remove({})
  Job.remove({})


  startBackground()
  Meteor.call('runProfile')
});
