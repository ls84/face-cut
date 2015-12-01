var assert = require('assert');
var sqlite3 = require('./lib/_sqlite3.js');

var fs = require('fs')

var fpp = require('./lib/facepp.js');

var remote = require('remote');
var dialog = remote.require('dialog');

var EventEmitter = require('events');

var databases = [];


function loadData () {

  var dialog_options = {
    defaultPath:'/Users/liushuo/Desktop/tml2015/',
    properties: [ 'openDirectory','multiSelections' ]
  }

  dialog.showOpenDialog(dialog_options,function(img_dir){

    img_dir.forEach(function(v){

      //TODO: this should be done at preparing stage
      var folder_name = v.match(/\/([a-zA-z0-9]{1,})$/)[1];

      var db = sqlite3(v);

      if (!db) {

        var checkbox = $('<input>').prop('type','checkbox').prop('value',folder_name);
        var fn = $('<div>'+ folder_name +'</div>').addClass('folder_name');
        var fi = $('<div>' + ' DATA UNPREPARED '+ '</div>').addClass('folder_info')

        var cloumn = $('<div></div>')
        .addClass('col-xs-12 col-sm-12 col-md-12 col-lg-12')
        .prop('id',folder_name)
        .append(checkbox,fn,fi)

        var row = $('<div></div>')
        .addClass('row')
        .append(cloumn)

        $('#data_inspect').append(row)

      }

      if (db) {

        var checkbox = $('<input>').prop('type','checkbox').prop('value',folder_name);
        var fn = $('<div>'+ folder_name +'</div>').addClass('folder_name');
        var fi = $('<div>'+ db.getUnknowFaces().length +'</div>').addClass('folder_info').append('<span class="glyphicon glyphicon-user"></span>')
        //var hidden_path = $('<span class="hidden_path" style="visibility:hidden">' + v + '</span>')


        var cloumn = $('<div></div>')
        .addClass('col-xs-12 col-sm-12 col-md-12 col-lg-12')
        .prop('id',folder_name)
        .append(checkbox,fn,fi)

        var row = $('<div></div>')
        .addClass('row')
        .append(cloumn)

        $('#data_inspect').append(row)

        databases.push(db)

      }

    })

  })

}

function identify() {

  var group_name = $('#group_name').val()

  databases.forEach(function(db){

    //var face_ids = db.getAllfaces();
    var face_ids = db.getUnknowFaces();

    var states = new EventEmitter();

    var iterator = 0;

    states.on('identify',function(){

      var face_id = face_ids[iterator]

      console.log('identify: ', face_id );

      fpp.identify(face_id,group_name,function(v){

        console.log(v);

        if (typeof(v) == 'string') states.emit('identify_err',face_id,v)

        if (typeof(v) == 'object') states.emit('saveRecognition',face_id,v)

      })

    })

    states.on('saveRecognition',function(face_id,recognition){

      console.log('saveRecognition: ', face_id);

      var candidate = recognition.face[0].candidate[0].person_name
      var confidence = recognition.face[0].candidate[0].confidence

      db.saveRecognition(face_id,candidate,confidence.toString())

      iterator += 1;

      if (iterator < face_ids.length) states.emit('identify')

      if (iterator == face_ids.length) states.emit('done')

    })

    states.on('identify_err',function(face_id,err){

      console.log(face_id,err);

    })

    states.on('done',function(){
      console.log('done');
    })

    states.emit('identify')

  })

}

function output() {
  /*

  var options = {
    defaultPath:'/Users/liushuo/Desktop/'
  }

  dialog.showSaveDialog(options,function(path){

    dataPipTo(path)

  })
  */

}


function dataPipTo(path) {

  var db = databases[0];

  var img_paths = db.getAllImages();

  var known_faces = db.getKnownFaces().map(function(v){

    var line = v.split('|');

    return {
      img_path:line[0],
      candidate:line[1],
      confidence:line[2]
    }

  });

  var person = [];

  known_faces.forEach(function(v){

    if (person.indexOf(v.candidate) == -1) person.push(v.candidate)

  })

  var output = person.reduce(function(p,c){

    return p + ',' + c

  },"Time")

  output += '\n'

  //console.log(output);

  img_paths.map(function(v){

    return v.match(/(\d{1,})\.jpeg$/)

  })
  .sort(function(a,b){

    return a[1] - b[1]

  })
  .forEach(function(v){

    console.log('dataPipTo: ',v[1]);

    var line = v[1]

    var candidate = known_faces.filter(function(f){

      var r = new RegExp('\/' + v[0] + '$')

      return f.img_path.match(r)

    })

    person.forEach(function(p){

      var this_person = candidate.filter(function(c){

        return c.candidate == p

      }).sort(function(a,b){

        return b.confidence - a.confidence

      })[0]

      if (this_person) line += ',' + this_person.confidence
      if (!this_person) line += ','

    })

    output += line + '\n'

  })

  //return output
  var options = {
    defaultPath:'/Users/liushuo/Desktop/'
  }

  dialog.showSaveDialog(options,function(path){

    fs.writeFile(path,output,function(){
      console.log('done');
    })


  })








/*
  known_faces.filter(function(v){


  }).sort(function(a,b){

  })
*/

  //console.log(known_faces);
/*
  var output = img_paths.map(function(v){

    var match = v.match(/(\d{1,})\.jpeg$/);
    var candidate = known_faces.filter(function(f){

      var r = new RegExp('\/' + match[0] + '$')

      return f.img_path.match(r)

    })

    var candidate_string = ""
    var confidence = 100;
    candidate.forEach(function(v,i,a){
      if(i == 0) candidate_string += v.candidate
      if(i > 0) candidate_string += ' & ' + v.candidate
      confidence = Math.min(confidence,v.confidence)
    })

    var line = match[1] + ',' + candidate_string + ',' + confidence + '\n'

    console.log(line);

  })
*/

}
