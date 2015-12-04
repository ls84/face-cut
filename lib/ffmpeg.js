var child_process = require('child_process');
var assert = require('assert');

//TODO: initialization should not be here
var cwd = '/Users/liushuo/projects/video-slice/ffmpeg';

exports.openFile = function (path) {

  //TODO: assert path is correct
  //console.log(path);

  var arg = [
    '-i',
    path,
    '-show_entries',
    'format=duration',
    '-loglevel',
    '8'
  ]

  var options = {
    cwd:cwd,
    encoding:'utf8'
  }

  //TODO:assert prob successful
  var prob = child_process.spawnSync('./ffprobe',arg,options)

  var filename = path.split('/').pop();
  var duration = prob.stdout.replace(/[^0-9.]/g,'').split('.')[0];


  return {
    path:path,
    filename:filename,
    duration:duration
  }

}

exports.sliceFile = function(path,duration,interval,savedir,sliced_cb,done_cb) {

  var arg = [
    '-ss',
    '0',
    '-i',
    path,
    '-f',
    'image2',
    '-frames',
    '1',
    savedir + '',
    '-loglevel',
    '8'
  ]

  var options = {
    cwd:cwd,
    encoding:'utf8'
  }

  var s = 0

  while (s <= duration) {

    //TODO:filename + seconds as save name
    arg[1] = s
    arg[8] = savedir + '/' + s.toString() + '.jpeg';

    var r = child_process.spawnSync('./ffmpeg',arg,options)
    //TODO: assert no error is raised
    assert.equal(r.status,0,"ffmpeg.sliceFile error")

    //callback when sliced one frame
    sliced_cb(s)

    s += interval;

  }

  //callback when its done
  done_cb();

}
