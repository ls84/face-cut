var assert = require('assert');
var sqlite3 = require('./lib/_sqlite3.js');
var fpp = require('./lib/facepp.js');

var remote = require('remote');
var dialog = remote.require('dialog');

function loadData () {

  var dialog_options = {
    defaultPath:'/Users/liushuo/Desktop/tml2015/img_seq/',
    properties: [ 'openDirectory','multiSelections' ]
  }

  dialog.showOpenDialog(dialog_options,function(img_dir){

    img_dir.forEach(function(v){

      //TODO: this should be done with at preparing stage
      var folder_name = v.match(/\/([a-zA-z0-9]{1,})$/)[1];

      console.log(folder_name);

      var n = $('<div></div>');

      $(n).addClass('col-xs-12 col-sm-12 col-md-12 col-lg-12')
      $(n).prop('id',folder_name);

      var db = sqlite3(v)

      if (!db) {

        var checkbox = $('<input>').prop('type','checkbox').prop('value',folder_name);
        $(n).append(checkbox);
        $(n).append('<div class="status_fn">' + folder_name + '</div>')
        $(n).append('<div class="status_s">' + ' DATA UNPREPARED' + '</div>')

      }

      if (db) {

        var checkbox = $('<input>').prop('type','checkbox').prop('value',folder_name);
        $(n).append(checkbox);
        $(n).append('<div class="status_fn">' + folder_name + '</div>')
        $(n).append('<div class="status_s">' + ' LOADED' + '</div>')

      }

      $('#recognition_status').append(n)


    })

  })


}
