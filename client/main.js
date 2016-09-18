import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import './main.html';


Template.hello.helpers({
  logs() {
    return Logs.find().fetch()
  },
  averages(){
    var logs = Logs.find().fetch()

    var grouped = _.groupBy( logs, 'name')
    // console.log('grouped', grouped );

    var results = _.map( grouped, function(e, key){
      var  count = e.length
      var reduce = _.reduce (e, function( sum, num){ return num.value + sum }, 0);
      // console.log('reduce each: ', reduce);
      var obj = {name : key, value: reduce/count}
      // obj[key] = reduce/count
      return obj

    })

    // console.log('results', results);

    return results
  }

});

Template.hello.events({
  'click button'(event) {
    Meteor.call("runProfile");
  },
  // "click #runProfile": function(event, template){
});



// $ DEPLOY_HOSTNAME=us-east-1.galaxy-deploy.meteor.com meteor deploy --settings settings.json profiler.wireline.io
