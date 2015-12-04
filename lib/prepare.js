var remote = require('remote');
var dialog = remote.require('dialog');

var ffmpeg = require('./lib/ffmpeg.js');

var fs = require('fs');

function loadFootage() {

  var dialog_options = {
    defaultPath:'/Users/liushuo/Desktop/',
    properties: [ 'openFile','multiSelections' ]
  }

  dialog.showOpenDialog(dialog_options,function(footage_paths){

    //assert footage_path is not undefined
    $('.container-fluid:nth-child(2) .row:first-child').fadeOut(function(){

      //make list-group
      var list_group = $('<ul class="list-group"></ul>')

      footage_paths.forEach(function(f){

        console.log(f);

        var file = ffmpeg.openFile(f);

        var sec = file.duration % 60

        var min = (file.duration - sec) / 60

        var hour = (file.duration - min*60 - sec ) / 3600

        //make list-group-item
        var footage_check = $('<input type="checkbox"/>')
        var filename = $('<span class="footage_name">' + file.filename + '</span>')
        var badge = $('<span class="badge">'+ hour + ':' + min + ':' + sec + '</span>')
        var hidden_path = $('<span class="hidden_path" style="visibility:hidden"></span>').append(f)
        var hidden_duration = $('<span class="hidden_duration" style="visibility:hidden"></span>').append(file.duration)

        var list_item = $('<li class="list-group-item"></li>')
        .append(footage_check,filename,badge,hidden_path,hidden_duration);

        list_group.append(list_item);

      })

      var refreshButton =$('<button class="btn btn-default" id="refresh_button">Reload</button>');
      var detectButton = $('<button class="btn btn-primary load_buttons" id="detect_button">Detect</button>')

      var col = $('<div class="col-xs-12 col-sm-12 col-md-12 col-lg-12"></div>')
      .append(refreshButton,list_group,detectButton)

      var row = $('<div class="row"></div>')
      .append(col)

      $('.container-fluid:nth-child(2)').append(row)

      //$(".container-fluid:nth-child(2) .row:nth-child(3)").fadeIn(4)

      $(".container-fluid:nth-child(2) .row:nth-child(2)").on("click","#detect_button",function(){detectSelectedFootage()})

    });

  })

}

function detectSelectedFootage() {

  //remove previews added log
  $('.container-fluid:nth-child(2) .row:nth-child(3)').remove();

  //append log "window"
  var log_div = $('<div class="well" id="log_window"></div>')

  var col = $('<div class="col-xs-12 col-sm-12 col-md-12 col-lg-12"></div>')
  .append(log_div);

  var row = $('<div class="row" style="display:none"></div>')
  .append('<hr>', col);

  $('.container-fluid:nth-child(2)').append(row)
  $('.container-fluid:nth-child(2) .row:nth-child(3)').fadeIn()


  var selected_footage = [];

  $(':checked').each(function(i,e){
    var name = $(e).siblings('.footage_name').html()
    var path = $(e).siblings('.hidden_path').html()
    var duration = $(e).siblings('.hidden_duration').html()
    var directory = path.replace(/[^/]{1,}$/,'');
    selected_footage.push({name:name,path:path,duration:duration,directory:directory})
  })


  selected_footage.forEach(function(footage){

    //create directory at previous level
    var savedir = footage.directory + footage.name.replace(/\..{1,}$/,"")

    try {
      fs.mkdirSync(savedir)
      console.log("directory: ", footage.name.replace(/\..{1,}$/,"")," created");
    } catch (e) {
      console.log("directory: ", footage.name.replace(/\..{1,}$/,""), " exists");
    }

    ffmpeg.sliceFile(footage.path,footage.duration,3,savedir,function(second){

      var message = 'slicing: ' + footage.name + ' at ' + second

      console.log(message);
      //appendLog(message)

    },function(){

      console.log('slicing',footage.name,'is done');

    })

  })


}

function appendLog(message) {

  var message_limit = 20;

  var current_messages = $('#log_window').children().length;

  if (current_messages >= message_limit) $('#log_window :last-child').remove();

  var log_window = $('#log_window').append(message);

}
