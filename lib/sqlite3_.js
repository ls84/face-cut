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

      executeSQL("UPDATE detection SET detection = '" + JSON.stringify(res) + "' WHERE img = '" + img + "'"  )

      //save detected faces
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

  }
  //return

}
