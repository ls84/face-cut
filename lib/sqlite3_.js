var assert = require('assert');
var child_process = require('child_process');

var sqlite_dir = __dirname.replace(/lib$/,'bin');

module.exports = function(database_path){


  function checkDB() {

    var args = []

    var options = {
      cwd:database_path,
      encoding:'utf8'
    }

    var ls = child_process.spawnSync('ls',args,options);

    assert.equal(ls.status,0,'ls child_process err');

    if (ls.stdout.split('\n').indexOf('recognition.sqlite') == -1) return false

    if (ls.stdout.split('\n').indexOf('recognition.sqlite') != -1) return true

  }


  var exists = checkDB()

  if (exists) return null
  //if database exists throw error

  function executeSQL(command_string) {

    var args = [
      database_path + '/recognition.sqlite',
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

  function init() {

    executeSQL('CREATE TABLE recognition (face_id PRIMARY KEY,img_path NOT NULL,candidate)')

  }

  init()

  return {

    insertRecognition:function(face_id,img_path,candidate){

      

    }

  }

}
