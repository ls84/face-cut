var assert = require('assert');
var sqlite3 = require('./lib/sqlite3_.js');

var fs = require('fs')

var fpp = require('./lib/facepp.js');

var remote = require('remote');
var dialog = remote.require('dialog');

var EventEmitter = require('events');

var databases = [];

function loadImgSeq () {

  var dialog_options = {
    defaultPath:'/Users/liushuo/Desktop/',
    properties: [ 'openDirectory','multiSelections' ]
  }

  dialog.showOpenDialog(dialog_options,function(imgseq_paths){

    imgseq_paths.forEach(function(path){

      console.log(path);

      var footage_name = path.split('/').pop()

      var total_imgs = fs.readdirSync(path).filter(function(v){

        return v.match(/\.jpeg$/)

      }).length

      var exists = sqlite3.checkDB(path)

      if (exists) {

        var database = {footage_name:footage_name,total_imgs:total_imgs,database:sqlite3.connect(path)}

        databases.push(database)

        var checkbox = $('<input class="selected_imgseq" type="checkbox"/>')
        .css('float','left')
        .css('margin-right','5px')

        var name = $('<span></span>')
        .html(footage_name)
        .addClass("footage_name")

        var detect_badge = $('<span></span>')
        .html(database.database.getUndetctedImgs().length + '/' + database.total_imgs)
        .addClass("badge")

        var face_badge = $('<span></span>')
        .html(database.database.getUnknownFaces().length + '/' + database.database.getAllFaces().length)
        .addClass("badge")

        var list_item = $('<li></li>')
        .append(checkbox,name,detect_badge,face_badge)
        .addClass("list-group-item")

        $("#imgseq_list").append(list_item)

      }

      if (!exists) {

        var name = $('<span></span>')
        .html(footage_name)
        .addClass("footage_name")

        var nah_badge = $('<span></span>')
        .html("nah")
        .addClass("badge")

        var list_item = $("<li></li>")
        .append(name,nah_badge)
        .addClass("list-group-item")

        $("#imgseq_list").append(list_item)

      }

    })

  })

}


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

  var group_name = $('#identify_group').val()

  var overwrite = $('#overwrite').prop('checked')

  console.log(group_name,overwrite);

  var selected_footage = [];

  $(".selected_imgseq:checked").each(function(i,e){

    var footage_name = $(e).siblings(".footage_name").html()

    selected_footage.push(footage_name)

  })

  var selected_databases = selected_footage.map(function(f){

    return databases.find(function(d){

      return d.footage_name == f

    })

  })

  var iterator_db = 0;

  var states_db = new EventEmitter()

  states_db.on("start",function(){

    //console.log("iterating:",selected_databases[iterator_db].footage_name);

    var iterator_face = 0;

    var states_face = new EventEmitter();

    var face_ids;

    if (overwrite) face_ids = selected_databases[iterator_db].database.getAllFaces();

    if (!overwrite) face_ids = selected_databases[iterator_db].database.getUnknownFaces();

    states_face.on("identify",function(){

      var face_id = face_ids[iterator_face]

      console.log("identifying face_id: ",face_id);

      fpp.identify(face_id,group_name)
      .then(function(res){

        console.log(res);
        states_face.emit("save",res)

      })
      .catch(function(err){

        console.log("identify err:",err);

      })

    })

    states_face.on("save",function(res){

      //console.log(res);

      var candidate = res.face[0].candidate[0].person_name
      var confidence = res.face[0].candidate[0].confidence

      selected_databases[iterator_db].database.saveIdentifiedFace(face_ids[iterator_face],candidate,confidence)

      iterator_face += 1

      if (iterator_face < face_ids.length) states_face.emit("identify")

      if (iterator_face == face_ids.length) states_face.emit("done_db")

    })

    states_face.emit("done_db",function(){

      iterator_db += 1;

      if (iterator_db < selected_databases.length) states_db.emit('start')

      if (iterator_db == selected_databases.length) states_db.emit('done')

    })

    states_face.emit("identify")


  })

  states_db.on("done",function(){

    console.log("done");

  })

  states_db.emit("start")

}

function dataPipTo(path) {

  var selected_footage = [];

  $(".selected_imgseq:checked").each(function(i,e){

    var footage_name = $(e).siblings(".footage_name").html()

    selected_footage.push(footage_name)

  })

  var selected_databases = selected_footage.map(function(f){

    return databases.find(function(d){

      return d.footage_name == f

    })

  })

  var all_person = selected_databases.reduce(function(p,c){

    var person = c.database.getKnownPerson()

    return p.concat(person)

  },[])
  .reduce(function(p,c){

    var exists = p.some(function(v){
      return v == c
    })

    if (exists) return p
    if (!exists) return p.concat(c)

  },[])

  var output = all_person.reduce(function(p,c){

    return p + ',' + c

  },"Footage,Time")

  output += '\n'

  selected_databases.forEach(function(database){

    var known_faces = database.database.getKnownFaces()

    var imgs = database.database.getAllImages()
    .sort(function(a,b){
      return Number(a.replace(/\.jpeg$/,'')) - Number(b.replace(/\.jpeg$/,''))
    })
    .forEach(function(img){

      var line = database.footage_name

      var seconds = Number(img.replace(/\.jpeg$/,''))

      var minutes = (seconds - seconds%60)/60

      var hours = (minutes - minutes%60)/60

      var timecode = ("0" + hours.toString()).substr(-2,2) + ":" + ("0" + minutes.toString()).substr(-2,2) + ":" + ("0" + (seconds%60).toString()).substr(-2,2)

      line += database.footage_name + "," + timecode

      var candidates = known_faces.filter(function(f){

        return (f.img == img)

      })

      all_person.forEach(function(person){

        //assumes this person does not look into mirror or has a twin
        var candidate = candidates.filter(function(c){

          return (c.candidate == person)

        }).sort(function(a,b){

          return b.confidence - a.confidence

        })[0]

        if (candidate) line += ',' + candidate.confidence
        if (!candidate) line += ','

      })

      output += line + '\n'

    })

  })

  var options = {
    defaultPath:'/Users/liushuo/Desktop/'
  }

  dialog.showSaveDialog(options,function(path){

    fs.writeFile(path,output,function(){
      console.log('done');
    })

  })

  //console.log(all_person);

  /*

  var db = selected_databases[0];

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
  */

}

function updateGroupList() {

  console.log("updateGroupList");

  fpp.getGroupList()
  .then(function(res){

    $('#group_list ul.list-group li').remove();

    res.group.forEach(function(g){

      var remove_button = $('<button class="badge removeGroup">remove</button>')
      var train_button = $('<button class="badge trainGroup">train</button>')
      var add_button = $('<button class="badge addToGroup">add</button>')

      var item = $('<li class="list-group-item">' + '<span class="group_name">' + g.group_name + '</span>' + '</li>')
      .append(remove_button,train_button,add_button)
      $("#group_list ul").append(item)

    })

  })
  .catch(function(err){
    //console.log(err);
    console.log("updateGroupList err: ",err);

  })

}
