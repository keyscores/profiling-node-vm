import { Meteor } from 'meteor/meteor';
var vm = require('vm');
var util = require('util');
var path = require('path');
var fork = require('child_process').fork;

Meteor.startup( () => {
  // code to run on server at startup
  Logs.remove({})
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

runBackground = function( callback ){

  var base = path.resolve('.');
  var filePath = base+"/assets/app/child.js"
  //run a node child process witht he file child.js which is in the folder /private/
  var backgroundProcess = fork(filePath);

  var testId = Random.id()
  // var timeA = Date.now()

  var query = Job.find({});
  var handle = query.observe({
    added: function ( doc ) {
      console.log('observeChanges, added', doc._id + "-" + JSON.stringify(doc) );
      //trigger a job in the process
      Logs.insert({ testId: testId , name: 'background' , start: Date.now() })
      backgroundProcess.send({ input: 'world'});

    }
  });


  // backgroundProcess.send({ input: 'world'});
  // backgroundProcess.on('close', function (code, signal){
  //   console.log( 'child process terminated due to receipt of signal');
  // });

var update = function(){
  // var startTime = Logs.findOne({ testId: testId}).start

  var endTime = Date.now()

  var startTime = Logs.findOne({ testId: testId}).start
  var totalTime = endTime - startTime
  Logs.update({ testId: testId }, { $set: { end: endTime , value: totalTime }})


}
update = Meteor.bindEnvironment( update)

  backgroundProcess.on('message', function(response) {
    if ( response === 'done'){
      // backgroundProcess.kill('SIGHUP');
      console.log('done');
      update()
      // var endTime = Date.now()
      //
      // var startTime = Logs.findOne({ testId: testId}).start
      // var totalTime = endTime - startTime
      // Logs.update({ testId: testId }, { $set: { end: endTime , value: totalTime }})
      //
      // Meteor.setTimeout(function(){
      //
      // }, 1000 )
    }else{
      console.log('response from process: ', response);
    }
  });

  Job.insert({test: "asdf"} )




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

  },
  runBackground: function(){
    runBackground()
  }
});
