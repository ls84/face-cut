var assert = require('assert');
var child_process = require('child_process');

var sqlite_dir = __dirname.replace(/lib$/,'bin');

module.exports = function(database_path){

  //console.log(database_path);

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

  var prepared = checkDB();

  if (!prepared) return false

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

  if (prepared) return {

    getAllfaces:function(){

      console.log('getAllfaces');

      return executeSQL('select face_id from faces');

    }

  }

}
