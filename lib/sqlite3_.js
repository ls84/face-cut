var assert = require('assert');
var child_process = require('child_process');

var fs = require('fs');

var sqlite_dir = __dirname.replace(/lib$/,'bin');

exports.checkDB = function(database_path){

  var args = []

  var options = {
    cwd:database_path,
    encoding:'utf8'
  }

  var ls = child_process.spawnSync('ls',args,options);

  assert.equal(ls.status,0,'ls child_process err');

  if (ls.stdout.split('\n').indexOf('data.sqlite') == -1) return false

  if (ls.stdout.split('\n').indexOf('data.sqlite') != -1) return true

}

exports.init = function(database_path) {

  function checkDB() {

    var args = []

    var options = {
      cwd:database_path,
      encoding:'utf8'
    }

    var ls = child_process.spawnSync('ls',args,options);

    assert.equal(ls.status,0,'ls child_process err');

    if (ls.stdout.split('\n').indexOf('data.sqlite') == -1) return false

    if (ls.stdout.split('\n').indexOf('data.sqlite') != -1) return true

  }

  //make sure data.sqlite doesn't exists
  assert.equal(checkDB(),false,"database at " + database_path + " already exists");


  function executeSQL(command_string) {

    var args = [
      database_path + '/data.sqlite',
      command_string
    ]

    var options = {
      cwd:sqlite_dir,
      encoding:'utf8'
    }

    var r = child_process.spawnSync('./sqlite3',args,options);
    assert.equal(r.status,0,command_string);

    var stdout = r.stdout.split('\n')
    stdout.pop()

    return stdout

  }

  console.log('initializing ...');
  //create all tables
  executeSQL('CREATE TABLE meta (key PRIMARY KEY,value BOLB)');

  executeSQL('CREATE TABLE detection (img PRIMARY KEY,detection BLOB)');

  executeSQL('CREATE TABLE faces (face_id PRIMARY KEY,img NOT NULL,position NOT NULL,candidate,confidence)')

  //insert metadata
  //name
  executeSQL('INSERT INTO meta (key,value) VALUES ("footage_name", "' + database_path.split('/').pop() + '")')

  //insert empty image slot
  //imgs
  fs.readdirSync(database_path).filter(function(v){

    return v.match(/\.jpeg$/)

  })
  .forEach(function(i){

    executeSQL('INSERT INTO detection (img) VALUES ("'+ i +'")')

  })

  return true

}

exports.connect = function(database_path) {

  function executeSQL(command_string) {

    var args = [
      database_path + '/data.sqlite',
      command_string
    ]

    var options = {
      cwd:sqlite_dir,
      encoding:'utf8'
    }

    var r = child_process.spawnSync('./sqlite3',args,options);
    //console.log(r);
    assert.equal(r.status,0,command_string);

    var stdout = r.stdout.split('\n')
    stdout.pop()

    return stdout

  }

  return {
    getUndetctedImgs:function(){

      return executeSQL('SELECT img FROM detection where detection IS NULL');

    }
    ,
    saveDetection:function(img,res){

      console.log("sqlite3.saveDetection: ",img,res);

      executeSQL("UPDATE detection SET detection = '" + JSON.stringify(res) + "' WHERE img = '" + img + "'"  )

      if (res.face.length > 0) {

        res.face.forEach(function(f){

          var position = {
            x:f.position.center.x,
            y:f.position.center.y,
            height:f.position.height,
            width:f.position.width
          }

          executeSQL("INSERT INTO faces (face_id,img,position) VALUES('" + f.face_id + "'" + "," + "'" + img + "'" + "," + "'" + JSON.stringify(position) + "'" + ")")

        })

      }

    }
    ,
    getImageTrainingStatus:function(){

      var status = {}

      status.images_count = executeSQL('SELECT * FROM detection').length;
      status.faces_count = executeSQL('SELECT * FROM faces').length;

      try {

        status.groups = executeSQL("SELECT group_id,face_ids FROM groups").map(function(g){

          var group_id = g.split('|')[0]
          var face_ids = JSON.parse(g.split('|')[1])

          return {
            group_id:group_id,
            face_ids:face_ids
          }

        });


      } catch (e) {

        status.groups = undefined

      }

      try {

        status.person = executeSQL("SELECT person_name face_ids FROM person")

      } catch (e) {

        status.person = undefined

      }

      return status

    }
    ,
    getAllFaces:function(){

      console.log("sqlite3.getAllFaces");

      return executeSQL('SELECT face_id FROM faces')

    }
    ,
    initGroup:function(){

      executeSQL('CREATE TABLE groups (group_id PRIMARY KEY,face_ids)')

    }
    ,
    saveGroup:function(id,group){

      console.log('sqlite.saveGroup: ',id,group);

      var face_ids = group.map(function(f){
        return f.face_id
      })

      //console.log(face_ids);
      executeSQL("INSERT INTO groups (group_id,face_ids) VALUES ('" + id + "'," + "'" + JSON.stringify(face_ids) + "'" + ")")

    }
    ,
    faceMapToImage:function(face_id){

      return executeSQL("SELECT img FROM faces WHERE face_id='" + face_id +"'")

    }
    ,
    getAllPerson:function(){

      try {
        return executeSQL("SELECT person_name from person");

      } catch (e) {

        return undefined

      }

    }
    ,
    initPerson:function(){

      console.log("sqlite3.initPerson");

      executeSQL("CREATE TABLE person (person_name PRIMARY KEY,person_id,face_ids)")

    }
    ,
    addPerson:function(person_name){

      console.log("sqlite3.addPerson: ",person_name)

      executeSQL("INSERT INTO person (person_name) VALUES ('" + person_name +"')")

    }
    ,
    getPersonFaces(person_name) {

      console.log('sqlite3.getPersonFaces: ',person_name);

      var face_ids = executeSQL("SELECT face_ids FROM person WHERE person_name='" + person_name + "'" + " AND face_ids IS NOT NULL")

      //console.log(face_ids);

      return (face_ids[0])?JSON.parse(face_ids[0]):undefined

    }
    ,
    getAllPersonFaces:function(){

      var person_faces = executeSQL("SELECT face_ids FROM person WHERE face_ids IS NOT NULL")

      var all_person_faces = []

      person_faces.forEach(function(p){

        JSON.parse(p).forEach(function(f){

          all_person_faces.push(f)

        })

      })

      return all_person_faces

    }
    ,
    getUnknownFaces:function(){

      console.log("sqlite3.getUnknownFaces");

      return executeSQL("SELECT face_id FROM faces WHERE candidate IS NULL")

    }
    ,
    updatePersonFaces:function(person_name,face_ids) {

      console.log("sqlite3.updatePersonFaces:",person_name,face_ids.length);

      executeSQL("UPDATE person SET face_ids='" + JSON.stringify(face_ids) + "' WHERE person_name ='" + person_name + "'")

    }
    ,
    saveIdentifiedFace:function(face_id,candidate,confidence) {

      console.log("sqlite.saveIdentifiedFace: ",candidate,confidence);

      executeSQL("UPDATE faces SET candidate=" + "'" + candidate + "'" + "," + " confidence=" + confidence + " WHERE face_id='" + face_id + "'")

    }
    ,
    getKnownPerson:function(){

      console.log("sqlite.getKnownPerson");

      return executeSQL("SELECT DISTINCT candidate FROM faces");

    }
    ,
    getAllImages:function(){

      console.log("sqlite.getAllImages");

      return executeSQL("SELECT img FROM detection")

    }
    ,
    getKnownFaces:function(){

      var faces = executeSQL("SELECT img, candidate, confidence FROM faces")

      return faces.map(function(f){

        var line = f.split('|');

        return {
          img:line[0],
          candidate:line[1],
          confidence:line[2]
        }

      })

    }



  }


}
