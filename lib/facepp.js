var fpp = require('face-plus-plus');
var fs = require('fs');
var assert = require('assert');
var EventEmitter = require('events');

fpp.setServer('cn');
fpp.setVersion('2');

fpp.setApiKey('333ca2f63f20b272f49c5551d2bf6f6e');
fpp.setApiSecret('hu9dk11LEH-Bf6Xgw21hrTWRs_aFDT84');


/* async test
    window.setTimeout(function(){
      var r = Math.random();
      console.log("timedout 1000 " + r );
      if (r <= 0.5) {
        states.emit('error',i);
      } else {
        states.emit('success',i);
      }
    },1000)
*/


exports.detect = function (img_path,callback) {

  var states = new EventEmitter();

  var iterator = 0;

  states.on('start',function(i){

    var this_path = img_path[i]
    console.log('detecting: ' + this_path);

    var parameters = {
      attribute: 'gender,age',
      img : {
        value : fs.readFileSync(this_path),
        meta : {filename:this_path}
      }
    }

    fpp.post('detection/detect',parameters,function(err,res) {

      if (err) {
        states.emit('error',this_path,err)
      }

      if (!err) {
        states.emit('success',this_path,res)
      }

    })

  })

  states.on('error',function(this_path,err){

    console.log('detect error: ',this_path,err);

    states.emit('detect_err',this_path,err);

    states.emit('next');

  })

  states.on('success',function(this_path,res){

    console.log('detect success',this_path,res);

    states.emit('save_detected',this_path,res);

    states.emit('next');

  })

  states.on('next',function(){

    iterator += 1;

    console.log('got to next: ', iterator, img_path.length);

    if (iterator < img_path.length) {

      states.emit('start',iterator);

    } else {

      states.emit('done');

    }

  })

  states.on('save_detected',function(this_path,detection){

    //insertDetected(this_path,detection);

    thisdb.insertDetection(this_path,detection);

  })

  states.on('detect_err',function(this_path,err) {

    //insertError(this_path,err);

    thisdb.insertDetectionError(this_path,err)

  })

  states.on('done',function(){

    console.log('this batch is done !!');

  })

  states.emit('start',iterator);

}

exports.createFaceset = function(faceset_name,tag) {

  var states = new EventEmitter();

  var parameters = {
    faceset_name: faceset_name,
    tag: tag
  }

  fpp.get('faceset/create',parameters,function(err,res){

    console.log('createing faceset: ', faceset_name, tag);

    if (err) states.emit('error',err);

    if (!err) states.emit('success',res);

  })

  states.on('error',function(err){
    console.log('createFaceset error: ',err);
  })

  states.on('success',function(res){
    console.log('createFaceset success: ',res);
  })

}

exports.getFaceset = function() {

  var states = new EventEmitter();

  var parameters = {
  }

  fpp.get('info/get_faceset_list',parameters,function(err,res){

    console.log('getFaceset: ');

    if (err) states.emit('error',err);

    if (!err) states.emit('success',res);

  })

  states.on('error',function(err){
    console.log('get Faceset err: ',err);
  })

  states.on('success',function(res){
    console.log('get Faceset success: ',res);
  })

}


exports.addToFaceset = function (face_ids,faceset_name) {

  var states = new EventEmitter();

  var iterator = 0;

  states.on('start',function(i){

    var parameters = {
      faceset_name:'tml2015',
      face_id: face_ids[i]
    }

    fpp.get('faceset/add_face',parameters,function(err,res) {

      if (err) states.emit('error',i,err);

      if (!err) states.emit('success',i,res);

    })

  })

  states.on('error',function(i,err){

    console.log('add to faceset error',face_ids[i],err);

    thisdb.updateFace(face_ids[i],'NULL')

    states.emit('next')

  })

  states.on('success',function(i,res){

    console.log('add to faceset success',face_ids[i],res);

    thisdb.updateFace(face_ids[i],faceset_name)

    states.emit('next')

  })

  states.on('next',function(){

    iterator += 1;

    console.log('got to next: ', iterator, face_ids.length);

    if (iterator < face_ids.length) {

      states.emit('start',iterator);

    } else {

      console.log('addToFaceset done');
      states.emit('done');

    }

  })

  states.emit('start',iterator);

}

exports.groupFaceset = function(faceset_name) {

  console.log('groupFaceset: ',faceset_name);

  var parameters = {
    faceset_name:faceset_name
  }

  fpp.get('grouping/grouping',parameters,function(err,res) {

    if (err) console.log('groupFaceset: ', err);
    if (!err) thisdb.logSession(res.session_id,'/grouping/grouping',parameters);

  })

}

exports.getSession = function (session_id){

  console.log('getSession: ',session_id);

  var parameters = {
    session_id:session_id
  }

  fpp.get('info/get_session',parameters,function(err,res) {
    if (err) console.log('getSession err: ', err);
    if (!err) console.log('getSeesion res: ',res);
  })

}

exports.checkSession = function (session_id) {

  console.log('checkSession: ', session_id);

  function checkStatus(res){

    if (res.status == "SUCC") thisdb.updateSession(session_id,res);

  }

  var parameters = {
    session_id:session_id
  }

  fpp.get('info/get_session',parameters,function(err,res) {

    if (err) console.log('getSession err: ', err)
    if (!err) checkStatus(res)

  })

}
