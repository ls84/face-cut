var child_process = require('child_process');
var assert = require('assert')

module.exports = function (cwd,database_path) {

  function init() {

    var args = []

    var options = {
      cwd:database_path,
      encoding:'utf8'
    }

    var r = child_process.spawnSync('ls',args,options);

    assert.equal(r.status,0,'ls child_process err');

    if (r.stdout.split('\n').indexOf('data.sqlite') == -1) {

      //detection table

      var args = [
        database_path + '/data.sqlite',
        "create table detection (img_path PRIMARY KEY,success BLOB, error BLOB)"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      console.log('creating detection table: ', args, options);

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'create detection table error');

      //face table

      var args = [
        database_path,
        "CREATE TABLE faces (face_id PRIMARY KEY,img_path NOT NULL,faceset_name)"
      ]


      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      console.log('creating face table: ', args, options);

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'create face table error');

      // session table

      var args = [
        database_path,
        "CREATE TABLE sessions (session_id PRIMARY KEY,api NOT NULL, parameters NOT NULL, result)"
      ]


      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      console.log('creating session table',args,options);

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'create sesstion table error');

      //person table

      var args = [
        database_path,
        "CREATE TABLE person (person_name PRIMARY KEY,person_id,face_ids)"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      console.log('creating person table',args,options);

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'create person table error');

      //init() done
      console.log('data.sqlite initialized');


    } else {

      console.log('data.sqlite exists');

    }

    database_path += '/data.sqlite';

  }

  init();

  return {

    insertDetection:function(img_path,detection){
      //@img_path string
      //@detection JSON

      console.log('insertDetected: ', img_path);

      var d = JSON.stringify(detection)

      var args = [
        database_path,
        "insert into detection (img_path,success) values('" + img_path + "','" + d + "')"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);
      assert.equal(r.status,0,'insertDetected error')

      //console.log(r);

    }
    ,
    insertDetectionError:function(img_path,err) {
      //@img_path string
      //@detection JSON

      console.log('insertDetectError: ', img_path);

      var d = JSON.stringify(err)

      var args = [
        database_path,
        "insert into detection (img_path,error) values('" + img_path + "','" + d + "')"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);
      assert.equal(r.status,0,'insertDetectedError error')

      //console.log(r);

    }
    ,
    createFaceTable: function(){

      console.log('creating FaceTable');

      var args = [
        database_path,
        "CREATE TABLE faces (face_id PRIMARY KEY,img_path NOT NULL,faceset_name)"
      ]


      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'createFaceTable error');

    }
    ,
    buildFaceTable: function(){

      //assert "faces" exists
      //assert "faces" is empty

      function selectAll () {

        console.log('buildFaceTable.selectAll');

        var args = [
          database_path,
          "-separator",
          "\t",
          "select img_path, success FROM detection"
        ]

        var options = {
          cwd:cwd,
          encoding:'utf8'
        }

        var r = child_process.spawnSync('./bin/sqlite3',args,options);
        assert.equal(r.status,0,'buildFaceTable.selectAll error');

        return r.stdout

      }

      function parseResult (result) {

        console.log('buildFaceTable.parseResult');

        result = result.split('\n')
        result.pop();
        //console.log(result);
        var r = result.map(function(v){
          return {img_path:v.split('\t')[0],success:JSON.parse(v.split('\t')[1])}
        })

        return r

      }

      var result = [];

      parseResult(selectAll()).filter(function(v){
        if (v.success.detection.face.length > 0 ) return true
      }).forEach(function(v){
        v.success.detection.face.forEach(function(vv){
          result.push({face_id:vv.face_id,img_path:v.img_path})
        })
      })

      //console.log(result);

      result.forEach(function(v){

        console.log('buildFaceTable.insert into faces: ', v.face_id,v.img_path);

        var args = [
          database_path,
          "insert into faces (face_id,img_path) values ('" + v.face_id + "','" + v.img_path + "')"
        ]

        var options = {
          cwd:cwd,
          encoding:'utf8'
        }

        var r = child_process.spawnSync('./bin/sqlite3',args,options);
        assert.equal(r.status,0,'buildFaceTable insert result error');

      })


    }
    ,
    getAllfaces:function(){

      console.log('getAllfaces');

      var args = [
        database_path,
        "select face_id from faces"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);
      assert.equal(r.status,0,'getAllfaces error');

      r = r.stdout.split('\n')
      r.pop()

      return r

    }
    ,
    updateFace:function(face_id,faceset_name){

      console.log('updateFace: ', face_id,faceset_name);

      var args = [
        database_path,
        "UPDATE faces SET faceset_name = '" + faceset_name + "' WHERE face_id = '" + face_id + "'"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);
      assert.equal(r.status,0,'updateFace error');

    }
    ,
    createSessionTable:function(){

      var args = [
        database_path,
        "CREATE TABLE sessions (session_id PRIMARY KEY,api NOT NULL, parameters NOT NULL, result)"
      ]


      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      console.log('creating session table',args,options);

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'createSessionTable error');


    }
    ,
    logSession:function(session_id,api,parameters){

      console.log('logSeesion: ',session_id,api,parameters);

      var args = [
        database_path,
        "INSERT INTO sessions (session_id , api, parameters ) VALUES ('" + session_id + "','" + api + "','" + JSON.stringify(parameters) + "')"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);
      assert.equal(r.status,0,'logSession error');

    }
    ,
    updateSession:function(session_id,result){

      console.log('updateSession: ', session_id,result);

      var args =[
        database_path,
        "UPDATE sessions SET result = '" + JSON.stringify(result) + "' WHERE session_id = '" + session_id +"'"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);
      assert.equal(r.status,0,'updateSession error');

    }
    ,
    getSessionResult:function(session_id){

      console.log('getSessionResult: ', session_id);

      var args =[
        database_path,
        "SELECT result from sessions where session_id = '" + session_id + "'"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'getSessionResult sqlite error');

      return r.stdout;

    }
    ,
    faceMapImg:function(face_ids){

      console.log('faceMapImg: ',face_ids);

      return face_ids.map(function(v){

        var args =[
          database_path,
          "SELECT img_path from faces where face_id = '" + v + "'"
        ]

        var options = {
          cwd:cwd,
          encoding:'utf8'
        }

        var r = child_process.spawnSync('./bin/sqlite3',args,options);

        assert.equal(r.status,0,'faceMapImg sqlite error');

        return r.stdout.trim()

      })

    }
    ,
    getPerson:function(){

      console.log('getPerson: ');

      var args = [
        database_path,
        "select person_name from person"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'getPerson error');

      r = r.stdout.split('\n')
      r.pop()

      return r

    }
    ,
    addPerson:function(person_name){

      console.log('addPerson: ',person_name);

      var args = [
        database_path,
        "INSERT INTO person ('person_name') VALUES ('" + person_name + "')"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'getPerson error');

    }
    ,
    updatePerson:function(person_name,face_ids) {

      console.log('updatePerson: ', person_name);

      var f = JSON.stringify(face_ids);

      var args = [
        database_path,
        "UPDATE person SET face_ids='" + f + "' WHERE person_name = '" + person_name + "'"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'updatePerson error');

    }
    ,
    getPersonFaces:function(person_name){

      console.log('getPersonFaces: ', person_name);

      var args = [
        database_path,
        "SELECT face_ids FROM person WHERE person_name = '" + person_name + "'"
      ]

      var options = {
        cwd:cwd,
        encoding:'utf8'
      }

      var r = child_process.spawnSync('./bin/sqlite3',args,options);

      assert.equal(r.status,0,'updatePerson error');

      if (!r.stdout.trim()) return []

      if (r.stdout.trim()) return JSON.parse(r.stdout.trim())

    }
  }

}
