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

exports.detect_ = function (img_path,callback) {

  console.log('fpp.detect: ', img_path);

  var parameters = {
    img : {
      value : fs.readFileSync(img_path),
      meta : {filename:img_path}
    }
  }

  fpp.post('detection/detect',parameters,function(err,res) {

    if (err) callback(err)

    if (!err) callback(res)

  })

}

exports.groupDetected = function(face_ids,callback) {

  //create a faceset

  var p = new Promise(function(resolve,reject){

    var parameters = {
    }

    fpp.get('faceset/create',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

  p.then(function(res){

    console.log(res);
    //res.faceset_id
    //res.faceset_name

  })
  .catch(function(err){



  })
  .then(function(d){

    console.log(d);

  })



}

exports.deleteFaceset = function(faceset_name) {

  return new Promise(function(resolve,reject){

    var parameters = {
      faceset_name:faceset_name
    }

    fpp.get('faceset/delete',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

}

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

exports._createFaceset = function(faceset_name,tag) {

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

//new
exports.createFaceset = function(){

  return new Promise(function(resolve,reject){

    var parameters = {
    }

    fpp.get('faceset/create',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

}

exports.getFaceset = function() {

  var p = new Promise(function(resolve,reject){

    var parameters = {
    }

    fpp.get('info/get_faceset_list',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

    console.log('fpp.getFaceset: ');

  })

  return p

}

exports.addToFaceset = function(face_ids,faceset_name,cb_added,cb_done) {

  var state = new EventEmitter();

  var start = 0;

  state.on('addFace',function(start){

    var face_id = face_ids.slice(start,start + 49).reduce(function(p,c){

      return p + ',' + c

    })

    var parameters = {
      faceset_name:faceset_name,
      face_id: face_id
    }

    fpp.get('faceset/add_face',parameters,function(err,res) {

      if (err) state.emit("err",err);

      if (!err) state.emit("next",res)

    })

  })

  state.on('err',function(err){

    console.log('fpp.addToFaceset error: ', err);

  })

  state.on('next',function(res){

    cb_added(res)

    start += 49

    if (face_ids.slice(start,start + 49).length > 0) state.emit('addFace',start)

    if (face_ids.slice(start,start + 49).length == 0) state.emit('done',start)

  })

  state.on('done',function(start){

    console.log('done',start);
    cb_done()

  })

  state.emit('addFace',start)

}

exports._addToFaceset = function (face_ids,faceset_name) {

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

  return new Promise(function(resolve,reject){

    var parameters = {
      faceset_name:faceset_name
    }

    fpp.get('grouping/grouping',parameters,function(err,res) {

      if (err) reject(err)
      if (!err) resolve(res)

    })

  })

}

exports.getSession = function (session_id){

  console.log('getSession: ',session_id);

  return new Promise(function(resolve,reject){

    var parameters = {
      session_id:session_id
    }

    fpp.get('info/get_session',parameters,function(err,res) {

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

}

exports.checkSession = function (session_id) {

  console.log("fpp.checkSession:",session_id);

  return new Promise(function(resolve, reject) {

    var parameters = {
      session_id:session_id
    }

    fpp.get('info/get_session',parameters,function(err,res) {

      if (err) reject(err)

      if (!err) resolve(res)

    })

  });

}

exports.getPersonInfo = function (person_name) {

  console.log('fpp.getPersonInfo: ', person_name);

  return new Promise(function(resolve,reject){

    var parameters = {
      person_name:person_name
    }

    fpp.get('person/get_info',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

}

exports.createPerson = function(person_name) {

  console.log('fpp.createPerson: ',person_name);

  return new Promise(function(resolve,reject){

    var parameters = {
      person_name:person_name
    }

    fpp.get('/person/create',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

}

exports.addFaceToPerson_ = function(person_name,faces_to_add,callback){

  //TODO:assert @faces_to_add is not empty

  console.log('fpp.addFaceToPerson: ',person_name);

  var face_ids = faces_to_add.reduce(function(p,c){

    return p + ',' + c

  })

  var parameters = {
    person_name:person_name,
    face_id:face_ids
  }

  fpp.get('person/add_face',parameters,function(err,res){

    if (err) callback(err)

    if (!err) callback(res)

  })

}

exports.removeFaceFromPerson = function(person_name,faces_to_remove,callback){

  //TODO:assert @faces_to_remove is not empty

  console.log('fpp.addFaceToPerson: ',person_name);

  var face_ids = faces_to_remove.reduce(function(p,c){

    return p + ',' + c

  })

  var parameters = {
    person_name:person_name,
    face_id:face_ids
  }

  fpp.get('person/add_face',parameters,function(err,res){

    if (err) callback(err)

    if (!err) callback(res)

  })


}

exports.getPersonList = function() {

  console.log("fpp.getPersonList");

  return new Promise(function(resolve,reject){

    var parameters = {
    }

    fpp.get('info/get_person_list',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

}

exports.addFaceToPerson = function(person_name,face_ids,cb_added,cb_done){

    var state = new EventEmitter();

    var start = 0;

    state.on('addFace',function(start){

      var face_id = face_ids.slice(start,start + 50).reduce(function(p,c){

        return p + ',' + c

      })

      var parameters = {
        person_name:person_name,
        face_id: face_id
      }

      fpp.get('person/add_face',parameters,function(err,res) {

        if (err) state.emit("err",err);

        if (!err) state.emit("next",res)

      })

    })

    state.on('err',function(err){

      console.log('fpp.addFaceToPerson error: ', err);

    })

    state.on('next',function(res){

      cb_added(res)

      start += 50

      if (face_ids.slice(start,start + 50).length > 0) state.emit('addFace',start)

      if (face_ids.slice(start,start + 50).length == 0) state.emit('done',start)

    })

    state.on('done',function(start){

      //console.log('done',start);
      cb_done()

    })

    state.emit('addFace',start)


}

exports.createGroup = function(group_name) {

  console.log('fpp.createGroup: ',group_name);

  return new Promise(function(resolve,reject) {

    var parameters = {
      group_name:group_name
    }

    fpp.get('group/create',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

}

exports.getGroupList = function(callback){

  console.log('fpp.getGroupList: ');

  return new Promise(function(resolve,reject){

    var parameters = {
    }

    fpp.get('info/get_group_list',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

}

exports.getGroupInfo = function(group_name,callback){

  var parameters = {
    group_name:group_name
  }

  fpp.get('group/get_info',parameters,function(err,res){

    if (err) callback(err)

    if (!err) callback(res)

  })



}

exports.addPersonToGroup = function(person_to_add,group_name) {

  var person_names = person_to_add.reduce(function(p,c){

    return p + ',' + c

  })

  return new Promise(function(resolve,reject){

    var parameters = {
      person_name:person_names,
      group_name:group_name
    }

    fpp.get('group/add_person',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

}

exports.trainGroup = function(group_name) {

  console.log('fpp.trainThisGroup: ',group_name);

  return new Promise(function(resolve,reject){

    var parameters = {
      group_name:group_name
    }

    fpp.get('train/identify',parameters,function(err,res){

      if (err) reject(err)

      if (!err) resolve(res)

    })

  })

}

exports.trainThisPerson = function(person_name){
  //don't need this right now
};

exports.identify = function(key_face_id,group_name) {


  return new Promise(function(resolve, reject) {

    var parameters = {
      group_name:group_name,
      key_face_id:key_face_id
    }

    fpp.get('recognition/identify',parameters,function(err,res) {

      if (err) reject(err)

      if (!err) resolve(res)

    })

  });

  /*
  var parameters = {
    group_name:group_name,
    key_face_id:key_face_id
  }

  //console.log(parameters);

  fpp.get('recognition/identify',parameters,function(err,res) {

    if (err) callback(err)

    if (!err) callback(res)

  })
  */

}
