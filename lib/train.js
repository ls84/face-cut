var remote = require('remote');
var dialog = remote.require('dialog');

var sqlite3 = require('./lib/sqlite3_.js');
var fpp = require('./lib/facepp.js');

var fs = require('fs');

var database;

var imageloader;

var current_group_id = 0;

function loadTrainingData() {

  var dialog_options = {
    defaultPath:'/Users/liushuo/Desktop/',
    properties: [ 'openDirectory' ]
  }

  dialog.showOpenDialog(dialog_options,function(paths) {

    var path = paths[0]

    var footage_name = path.split('/').pop()

    //heading row
    $('.container-fluid:nth-child(2) .row:first-child div').append('<span id="dir_name">' + footage_name + '</span>')
    $('.container-fluid:nth-child(2) .row:first-child div').append('<span id="dir_path">' + path + '</span>')

    //content row initializing frames
    //this part is hard to read,maybe it can be moved to html file
    var images_tab = $('<li role="presentation" class="active"></li>').append('<a href="#images" role="tab" data-toggle="tab">images</a>')
    var person_tab = $('<li role="presentation"></li>').append('<a href="#person" role="tab" data-toggle="tab">person</a>')

    var tab_nav = $('<ul class="nav nav-tabs nav-justified" role="tablist"></ul>')
    .append(images_tab,person_tab)

    var images_div = $('<div role="tabpanel" class="tab-pane active" id="images"></div>')
    var person_div = $('<div role="tabpanel" class="tab-pane" id="person"></div>')

    var tab_content = $('<div class="tab-content"></div>')
    .append(images_div,person_div)

    var person_col = $('<div class="col-xs-2 col-sm-2 col-md-2 col-lg-2" id="person_col"></div>')

    var image_col = $('<div class="col-xs-10 col-sm-10 col-md-10 col-lg-10" id="image_col"></div>')
    .append(tab_nav,tab_content)

    var row = $('<div class="row"></div>').append(person_col,image_col)

    $('.container-fluid:nth-child(2)').append(row)

    $('li a[href="#images"]').on('show.bs.tab',function(){updateImages()})

    $('li a[href="#person"]').on('show.bs.tab',function(){/*updatePerson()*/})

    //data part
    database = sqlite3.connect(path)

    updateImages();

    updateRemotePerson();

  })


}

function loadImgSeq_() {

  var dialog_options = {
    defaultPath:'/Users/liushuo/Desktop/',
    properties: [ 'openDirectory' ]
  }

  dialog.showOpenDialog(dialog_options,function(imgseq_path){

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

        database = {footage_name:footage_name,total_imgs:total_imgs,path:path,db:sqlite3.connect(path)}

        console.log(footage_name," exists");

      }

      if (!exists) {

        sqlite3.init(path)

        console.log('new database initialized at', path);

        var db = sqlite3.connect(path)

        //db.insertFootageName(footage_name);

        //db.insertImageCount(total_imgs);

        //console.log('metadata inserted: ',footage_name,total_imgs);

        databases = {footage_name:footage_name,total_imgs:total_imgs,path:path,db:db}

      }

    })

    //append list
    var list_group = $('<ul class="list-group"></ul>');

    databases.forEach(function(d){

      //var footage_check = $('<input type="checkbox"/>');
      var glyphicon = $('<span class="glyphicon glyphicon-chevron-down"></span>')
      var footage_name = $('<span class="footage_name">' + d.footage_name + '</span>')
      var badge = $('<span class="badge">'+ d.db.getUndetctedImgs().length + '/' + d.total_imgs + '</span>')
      var hidden_path = $('<span class="hidden_path" style="visibility:hidden"></span>').append(d.path)

      var list_item = $('<li class="list-group-item"></li>')
      .append(glyphicon,footage_name,badge,hidden_path);

      list_group.append(list_item);

    })

    var reload_button = $('<button class="btn btn-default" id="reload_button">Reload</button>');
    //var group_input
    //var group_button = $('<button class="btn btn-primary" id="detect_button">Detect</button>');

    var col = $('<div class="col-xs-12 col-sm-12 col-md-12 col-lg-12"></div>')
    .append(reload_button,list_group)

    var row = $('<div class="row"></div>')
    .append(col)

    $('.container-fluid:nth-child(2) .row:first-child').fadeOut(function(){

      $('.container-fluid:nth-child(2)').append(row);

      $(".container-fluid:nth-child(2) .row:nth-child(2)").on("click","li",function(){console.log(showInfo(this));})

    })

  })

}

function updateImages() {

  console.log('update Images');

  $("#images").children().remove()

  var status = database.getImageTrainingStatus();

  if (!status.person) {

    database.initPerson()

  }

  var all_person_faces = database.getAllPersonFaces();

  if (status.groups) {

    var groups = status.groups.map(function(g){

      var face_ids = g.face_ids.filter(function(f){

        var exists = all_person_faces.some(function(a){

          return a == f

        })

        return !exists

      })

      return {face_ids:face_ids}

    })
    .filter(function(g){

      if (g.face_ids.length > 0) return true

      return false

    })

    //console.log(groups);

    var col = $('<div class="col-xs-12 col-sm-12 col-md-12 col-lg-12"></div>')

    groups.forEach(function(g,i){

      var block = $('<div></div>')
      .addClass('group_control_block')
      .prop('id',i)
      .css('width',(g.face_ids.length/(status.faces_count - all_person_faces.length) * 100).toString()+'%')
      .css('height',"20px")
      .css('float','left')
      .css('cursor','pointer')

      col.append(block)

    })

    var row = $('<div class="row" id=""></div>').append(col)

    $('#images').append(row)

    $("#images").append('<div class="row" id="group_images"></div>')

    imageloader = imageLoader(groups)

    imageloader.show(current_group_id,$("#group_images"))

    $("#" + current_group_id.toString()).addClass("selected_group")

    var add_all_button = $('<button class="btn btn-primary center-block" id="addAllToPerson">Add All</button>')
    .css('margin-top','20px')

    var group_button_col = $('<div class="col-xs-12 col-sm-12 col-md-12 col-lg-12"></div>')
    .append(add_all_button)

    var group_button_row = $('<div class="row"></div>')
    .append(group_button_col)

    $("#group_images").after(group_button_row)


  }

  if (!status.groups) {

    //control for group initializing
    var group_button = $('<button class="btn btn-primary" id="groupDetected">Group Detected</button>')

    var input = $('<input type="text"/>')
    .css("margin-right","10px")
    .css("width","300px")

    var control_div = $('<div></div>')
    .append('<span class="alert alert-info" id="nodata">'+ status.faces_count + '/' + status.images_count + '</span>',input,group_button)
    .css("float","right")

    var col = $('<div class="col-xs-12 col-sm-12 col-md-12 col-lg-12"></div>')
    .append(control_div);

    var row =$('<div class="row" id="groups_control"></div>').append(col)

    $("#images").append(row)

    $('#groupDetected').on('click',function(){groupDetected()})

  }

}

function groupDetected(){

  var input = $('#groups_control input').val();

  if (input) {

    fpp.getSession(input)
    .then(function(res){

      console.log(res);

      //assert res.success

      if(res.status == "SUCC") {

        var group_id = 0;

        database.initGroup();

        res.result.group.forEach(function(g){

          database.saveGroup(group_id,g)

          group_id += 1;

        })

        database.saveGroup('ungrouped',res.result.ungrouped)

      } else {

        console.log("groupDetected session result: ",res);

      }

      updateImages();


    })
    .catch(function(err){

      console.log(err);

    })

  }

  if (!input){

    var face_ids = database.getAllFaces();

    fpp.createFaceset()
    .then(function(res){

      var faceset_name = res.faceset_name

      fpp.addToFaceset(face_ids,faceset_name,function(response){

        console.log(response);

      },function(){

        fpp.groupFaceset(faceset_name)
        .then(function(res){

          var options = {
            buttons:['Okay'],
            message:'remember this session:\n' + res.session_id
          }

          dialog.showMessageBox(options,function(b){

            console.log(res);

          })

        })
        .catch(function(err){

          console.log(err);

        })

      })

    })
    .catch(function(err){

      console.log(err);

    })

  }

}

function updateRemotePerson() {

  console.log("updateRemotePerson");

  fpp.getPersonList()
  .then(function(res){

    var group_list = $('<ul class="list-group"></ul>')

    res.person.forEach(function(p){

      var list_item = $('<li class="list-group-item">' + p.person_name + '</li>')
      .prop('id',p.person_name.replace(/\s/,'-'))
      .css('cursor','pointer')

      group_list.append(list_item)

    })

    $("#person_col").append(group_list)

    //$("#person_col").append("<hr>")

    //updateLocalPerson()

    //$('#person_col li').on('click',function(){selectPerson(this)})

  })
  .catch(function(err){

    console.log(err);

  })

}

function updateLocalPerson() {

  console.log('updateLocalPerson');

  var person = database.getAllPerson()

  if (!person) {

    database.initPerson()

    //add person control
    var input = $('<input type="text"/>')
    .css('width','70%')
    var button =$('<button id="newPerson">New</button>')
    .css('float','right')
    var div = $('<div></div>').append(input,button)
    $("#person_col hr").after(div)

  }

  if (person) {

    //controls
    var input = $('<input type="text"/>')
    .css('width','70%')
    var button =$('<button id="newPerson">New</button>')
    .css('float','right')
    var div = $('<div></div>').append(input,button)
    $("#person_col hr").after(div)

    var group_list = $('<ul class="list-group"></ul>')

    person.forEach(function(p){

      var list_item = $('<li class="list-group-item">' + p.split('|')[0] + '</li>')
      .css('cursor','pointer')
      .prop('id',p.split('|')[0])

      group_list.append(list_item)

    })

    $("#person_col hr").after(group_list)

  }



}

function selectPerson(this_element){

  $(".selected_person").removeClass('selected_person')
  $(this_element).addClass('selected_person')

  var person_name = $(this_element).html()

  console.log("selectPerson: ",person_name);

  //$("#person").children().remove();

  try {

    database.addPerson(person_name)
    $('#person').append('<div class="row"  id="person_images"></div>')

  } catch (e) {

    //person exists in local database

    var face_ids = database.getPersonFaces(person_name)

    var image_row = $('<div class="row"  id="person_images"></div>')
    .css("margin-top","20px")

    if (face_ids) {

      makeImgRow(face_ids).forEach(function(r){

        image_row.append(r)

      })

    }

    $('#person').append(image_row)

  }

  //control buttons
  var commit_button = $('<button class="btn btn-success" id="personCommit">Commit</button>')
  .css('float','right')

  var save_button = $('<button class="btn btn-primary" id="personSave">Save</button>')
  .css('margin-right','7px')
  .css('float','right')

  var control_col = $('<div class="col-xs-12 col-sm-12 col-md-12 col-lg-12"></div>')
  .append(commit_button,save_button)

  var control_row = $('<div class="row" id="person_buttons"></div>')
  .append(control_col)
  .css("margin-top","10px")

  $('#person').append(control_row)


}

function addNewPerson(button_element){

  var person_name = $(button_element).prev().val()

  database.addPerson(person_name)

}

function addToPerson(image_div){

  var face_to_add = $(image_div).children('img').prop('id')

  //remove it from images div
  $(image_div).remove()

  var face_ids = [];
  $("#group_images").children(".row").children(".filmstrip").children("img").each(function(i,e){
    face_ids.push($(e).prop('id'))
  })

  $("#group_images").children().remove()

  makeImgRow(face_ids).forEach(function(r){

    $("#group_images").append(r)

  })

  face_ids.forEach(function(f){
    highlight(f);
  })

  //add to this person
  var person_name = $(".selected_person").prop('id').replace(/-/,' ')

  console.log("addToPerson:",person_name,face_to_add);

  var face_ids = []

  $("#person_images").children(".row").children(".filmstrip").children("img").each(function(i,e){

    face_ids.push($(e).prop('id'))

  })

  face_ids.push(face_to_add)

  $("#person_images").children().remove()

  makeImgRow(face_ids).forEach(function(r){

    $("#person_images").append(r)

  })

}

function addAllToPerson(){

  var face_ids = [];
  $("#group_images").children(".row").children(".filmstrip").children("img").each(function(i,e){
    face_ids.push($(e).prop('id'))
  })

  $("#group_images").children().remove()

  var existing_ids = []
  $("#person_images").children(".row").children(".filmstrip").children("img").each(function(i,e){
    existing_ids.push($(e).prop('id'))
  })

  var combined_ids = face_ids.concat(existing_ids)

  $("#person_images").children().remove()

  makeImgRow(combined_ids).forEach(function(r){

    $("#person_images").append(r)

  })

}

function personSave(){

  var person_name = $(".selected_person").prop("id").replace('-'," ")

  var face_ids = []
  $("#person_images").children(".row").children(".filmstrip").children("img").each(function(i,e){

    face_ids.push($(e).prop('id').replace(/"/,""))

  })

  console.log("personSave:",person_name,face_ids.length);

  database.updatePersonFaces(person_name,face_ids)

}

function personCommit() {

  var person_name = $(".selected_person").prop("id").replace('-'," ")

  var face_ids = []
  $("#person_images").children(".row").children(".filmstrip").children("img").each(function(i,e){

    face_ids.push($(e).prop('id').replace(/"/,""))

  })

  console.log("personCommit: ",person_name,face_ids.length);

  fpp.addFaceToPerson(person_name,face_ids,function(res){

    console.log("added: ",res);

  },function(res){

    console.log("done");

  })


}

function removeFromPerson(image_div){

  console.log("removeFromPerson: ", $(image_div).children("img").prop("id"))

  $(image_div).remove()

  var face_ids = []

  $("#person_images").children(".row").children(".filmstrip").children("img").each(function(i,e){

    face_ids.push($(e).prop('id'))

  })

  $("#person_images").children().remove()

  makeImgRow(face_ids).forEach(function(r) {

    $("#person_images").append(r)

  })

  console.log(face_ids);

}

//the complication of visualizing these images
function makeImgRow(face_ids){
  //face_ids & img_paths are paired in order
  var dir_path = $('span#dir_path').html()

  var rows = [];

  var counter = 0;

  face_ids.forEach(function(f,i){

    if (counter%12 == 0) rows.push($('<div class="row"></div>'))

    var src = dir_path + '/' + database.faceMapToImage(f)

    var image = $('<img>')
    .prop('src',src)
    .prop('id',f)

    var col = $('<div class="col-xs-1 col-sm-1 col-md-1 filmstrip"></div>')
    .append(image);

    rows[rows.length - 1].append(col)

    counter += 1

  })

  return rows

}

function imageLoader(groups) {

  var dir_path = $('span#dir_path').html()

  //var iterator = 0;

  function makeRows(face_ids) {

    var rows = [];

    var counter = 0;

    face_ids.forEach(function(f,i){

      if (counter%12 == 0) rows.push($('<div class="row"></div>'))

      var src = dir_path + '/' + database.faceMapToImage(f)

      var image = $('<img>')
      .prop('src',src)
      .prop('id',f)

      var col = $('<div class="col-xs-1 col-sm-1 col-md-1 filmstrip"></div>')
      .append(image)

      rows[rows.length - 1].append(col)

      counter += 1

    })

    return rows

  }

  return {

    show:function(iterator,display_div) {

      var face_ids = groups[iterator].face_ids

      rows = makeRows(face_ids)

      rows.forEach(function(r){
        $(display_div).append(r)
      })

      face_ids.forEach(function(f){

        highlight(f);

      })

    }

  }

}

function selectThisGroup(control_element) {

  $(".selected_group").removeClass("selected_group")

  $(control_element).addClass('selected_group')

  current_group_id = Number($(control_element).prop("id"))

  $("#group_images").children().remove()

  imageloader.show(current_group_id,$("#group_images"))

}

function spot_face(face_img) {

  if ( $(face_img).css('position') != 'absolute' ) {

    console.log('spot_face on');

    var d = {
      width:720,
      height:405
    }

    var face_id = $(face_img).prop('id');

    var p = database.getFacePosition(face_id);

    var height = $('.filmstrip').css('height');

    $(face_img).parent().css('height',height);

    $(face_img).parent().css('overflow','hidden');

    var offset_left = -1 * (d.width * p.x * 0.01 - (d.width * p.width * 0.01) / 2)
    var offset_top = -1 * (d.height * p.y * 0.01 - (d.height * p.height * 0.01) / 2)

    $(face_img).css('position','absolute');
    $(face_img).css('width',d.width.toString() + 'px');
    $(face_img).css('height',d.height.toString() + 'px');
    $(face_img).css('margin-left', offset_left.toString() + 'px' );
    $(face_img).css('margin-top', offset_top.toString() + 'px' );

    $(face_img).siblings('.highlight').css('display','none');

  } else {

    console.log('spot_face off');

    $(face_img).parent().css('height','');

    $(face_img).parent().css('overflow','');
    $(face_img).css('position','');
    $(face_img).css('width','');
    $(face_img).css('height','');
    $(face_img).css('margin-left','');
    $(face_img).css('margin-top', '');

    $(face_img).siblings('.highlight').css('display','block');

  }

}

function highlight(face_id) {

  var D = {
    width:720,
    height:405
  }

  var P = database.getFacePosition(face_id);

  var S = Number($( '#' + face_id ).parent( ).css( 'width' ).replace( /px$/,'' ) / D.width );

  var width = P.width * D.width * 0.01 * S;
  var height = P.height * D.height * 0.01 * S;
  var top = P.y * D.height * 0.01 * S - height / 2;
  var left = P.x * D.width * 0.01 * S - width / 2;

  console.log(width,height,top,left);

  var highlight = $('<div class="highlight"></div>')
  .css('width',width)
  .css('height',height)
  .css('top',top)
  .css('left',left)

  $('#' + face_id).parent().append(highlight);

}
