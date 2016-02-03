//var assert = require('assert')
var remote = require('remote');
var dialog = remote.require('dialog');

var sqlite3 = require('./lib/sqlite3_.js');
var fpp = require('./lib/facepp.js');

var fs = require('fs');

var EventEmitter = require('events');

var databases = [];

function loadImgSeq() {

  var dialog_options = {
    defaultPath:'/Users/liushuo/Desktop/',
    properties: [ 'openDirectory','multiSelections' ]
  }

  dialog.showOpenDialog(dialog_options,function(imgseq_paths){

    //initialize first
    imgseq_paths.forEach(function(path){

      console.log(path);

      var footage_name = path.split('/').pop()

      var total_imgs = fs.readdirSync(path).filter(function(v){

        return v.match(/\.jpeg$/)

      }).length

      var exists = sqlite3.checkDB(path)

      if (exists) {

        //TODO: run integrity test

        var db = sqlite3.connect(path)

        databases.push({footage_name:footage_name,total_imgs:total_imgs,path:path,db:sqlite3.connect(path)})

        console.log(footage_name," exists");

      }

      if (!exists) {

        sqlite3.init(path)

        console.log('new database initialized at', path);

        var db = sqlite3.connect(path)

        //db.insertFootageName(footage_name);

        //db.insertImageCount(total_imgs);

        //console.log('metadata inserted: ',footage_name,total_imgs);

        databases.push({footage_name:footage_name,total_imgs:total_imgs,path:path,db:db})

      }

    })

    //append list
    var list_group = $('<ul class="list-group"></ul>');

    databases.forEach(function(d){

      var footage_check = $('<input type="checkbox"/>');
      var footage_name = $('<span class="footage_name">' + d.footage_name + '</span>')
      var badge = $('<span class="badge">'+ d.db.getUndetctedImgs().length + '/' + d.total_imgs + '</span>')
      var hidden_path = $('<span class="hidden_path" style="visibility:hidden"></span>').append(d.path)

      var list_item = $('<li class="list-group-item"></li>')
      .append(footage_check,footage_name,badge,hidden_path);

      list_group.append(list_item);

    })

    var reload_button = $('<button class="btn btn-default" id="reload_button">Reload</button>');
    var detect_button = $('<button class="btn btn-primary" id="detect_button">Detect</button>')

    var col = $('<div class="col-xs-12 col-sm-12 col-md-12 col-lg-12"></div>')
    .append(reload_button,list_group,detect_button)

    var row = $('<div class="row"></div>')
    .append(col)

      $('.container-fluid:nth-child(2)').append(row);



  })

}

function detectSelectedImgSeq() {

  var fpp_ = require('fpp')

  var credential = {
    access_key:'333ca2f63f20b272f49c5551d2bf6f6e',
    access_secret:'hu9dk11LEH-Bf6Xgw21hrTWRs_aFDT84'
  }

  fpp_.setup(credential)

  var selected_imgseq_paths = [];

  $("input:checked").each(function(i,e){

    var path = $(e).siblings(".hidden_path").html();

    selected_imgseq_paths.push(path)

  })

  var selected_imgseq = selected_imgseq_paths.map(function(p){

    return databases.find(function(d){
      //return d.path
      return d.path == p

    }).db

  })


  var state0 = new EventEmitter();

  var iterator0 = 0;

  state0.on('detectBatch',function(path,db){

    var imgs = db.getUndetctedImgs();

    var state1 = new EventEmitter();

    var iterator1 = 0;

    //state1.on("detectImg",function(img_paths))
    state1.on("detectImg",function(img){

      var img_path = path + '/' + img

      console.log("detectImg:",img_path);

      fpp_.detect(img_path)
      .then(function(res){

        if ( JSON.parse(res).error === "SERVER_TOO_BUSY" ) {

          console.log('SERVER_TOO_BUSY');

          state1.emit('tryagain',img);

        } else {

          state1.emit('detectSucc',img,res)

        }

      })
      .catch(function(err){

        if (err === "ETIMEDOUT" || err === "RTIMEDOUT") {

          console.log(err,'tryagain');
          state1.emit('tryagain',img)

        } else {

          console.log(err);
          state1.emit('detectErr',img,err)

        }

      })

    })

    state1.on('tryagain',function(img){

      state1.emit('detectImg',img)

    })

    state1.on('detectErr',function(img,r){

      console.log('detectErr: ', img ,r);

      //save detection as NULL

    })

    state1.on('detectSucc',function(img,r){

      db.saveDetection(img,JSON.parse(r))

      iterator1 += 1

      if (iterator1 < imgs.length) state1.emit('detectImg',imgs[iterator1])

      if (iterator1 >= imgs.length) {

        iterator0 += 1;

        if (iterator0 < selected_imgseq_paths.length) {

          state0.emit('detectBatch',selected_imgseq_paths[iterator0],selected_imgseq[iterator0])

        } else {

          state0.emit('batchDone')

        }

      }

    })

    state1.emit('detectImg',imgs[iterator1])

  })

  state0.on('batchDone',function(){

    console.log('all batch are detected');

  })

  state0.emit('detectBatch',selected_imgseq_paths[iterator0],selected_imgseq[iterator0])


}
