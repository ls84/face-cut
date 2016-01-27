var assert = require('assert');
var sqlite3 = require('./lib/sqlite3_.js');

var fs = require('fs')

var fpp = require('./lib/facepp.js');
var fpp_ = require('fpp');
var credential = {
  access_key:'333ca2f63f20b272f49c5551d2bf6f6e',
  access_secret:'hu9dk11LEH-Bf6Xgw21hrTWRs_aFDT84'
}

fpp_.setup(credential)

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

        var database = {imgseq_path:path,footage_name:footage_name,total_imgs:total_imgs,database:sqlite3.connect(path)}

      }

      if (!exists) {

        sqlite3.init(path)

        console.log('database initialized');

        var database = {imgseq_path:path,footage_name:footage_name,total_imgs:total_imgs,database:sqlite3.connect(path)}

      }

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

    })

  })

}

function identify() {

  var group_name = $('#identify_group').val()

  var overwrite = $('#overwrite').prop('checked')

  console.log('identify group:',group_name,'overwrite:',overwrite);

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

    var iterator_img = 0;

    var states_img = new EventEmitter();

    var imgs;

    if (overwrite) imgs = selected_databases[iterator_db].database.getAllImages();

    if (!overwrite) imgs = selected_databases[iterator_db].database.getUndetctedImgs();

    states_img.on("identify",function(){

      var img_path = selected_databases[iterator_db].imgseq_path + '/' + imgs[iterator_img];

      console.log('identify:',img_path,group_name);

      fpp_.identify(img_path,group_name)
      .then(function(res){

        states_img.emit('save',res)

      })
      .catch(function(err){

        if (err === "ETIMEDOUT" || err === "RTIMEDOUT") {

          console.log(err,'tryagain');
          states_img.emit('identify')

        } else {

          console.log(err);

        }

      })

    })

    states_img.on("save",function(res){

      console.log("save:",res);

      selected_databases[iterator_db].database.saveDetection(imgs[iterator_img],res);

      var faces = res.face;

      if ( faces.length > 0 ) {

        faces.forEach(function(f){

          if (faces.candidate) {

            var candidate = faces.candidate[0].person_name

            var confidence = faces.candidate[0].confidence

            selected_databases[iterator_db].database.saveIdentifiedFace(f.face_id,candidate,confidence)

          }

        })

      }

      iterator_img += 1;

      if (iterator_img < imgs.length) states_img.emit("identify");

      if (iterator_img == imgs.length) states_img.emit("done_db");

    })

    states_img.emit("done_db",function(){

      iterator_db += 1;

      if (iterator_db < selected_databases.length) states_db.emit('start')

      if (iterator_db == selected_databases.length) states_db.emit('done')

    })

    states_img.emit("identify");


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

      line += "," + timecode

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

}
