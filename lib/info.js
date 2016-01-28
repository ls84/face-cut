var assert = require('assert');
var fpp = require('./lib/facepp.js');
//var EventEmitter = require('events');
var fpp_ = require('fpp');
var credential = {
  access_key:'333ca2f63f20b272f49c5551d2bf6f6e',
  access_secret:'hu9dk11LEH-Bf6Xgw21hrTWRs_aFDT84'
}

fpp_.setup(credential)

function updateFacesetList() {

  console.log("updateFacesetList");

  fpp.getFaceset()
  .then(function(res){

    //remove previous
    $('#faceset_list ul.list-group li').remove();

    res.faceset.forEach(function(f){

      var remove_button = $('<button class="badge removeFaceset">remove</button>')

      var item = $('<li class="list-group-item">' + '<span class="faceset_name">' + f.faceset_name + '</span>'+ '</li>').append(remove_button)

      $('#faceset_list ul').append(item)

    })

    //console.log(res);

  })
  .catch(function(rej){

    console.log(rej);

  })

}

function updatePersonList() {

  console.log("updatePersonList");

  fpp.getPersonList()
  .then(function(res){

    $('#person_list ul.list-group li').remove();

    res.person.forEach(function(p){

      var remove_button = $('<button class="badge removePerson">remove</button>')
      var train_button = $('<button class="badge trainPerson">train</button>')

      var item = $('<li class="list-group-item">' + '<input type="checkbox" style="margin-right:7px"/>' + '<span class="person_name">' + p.person_name + '</span>' + '</li>').append(remove_button,train_button)


      $('#person_list ul').append(item)

      fpp.getPersonInfo(p.person_name)
      .then(function(res){

        var faces_count = res.face.length
        $(".person_name:contains("+ res.person_name +")").parent().append('<span class="badge">'+ faces_count +'</span>')

      })
      .catch(function(err){
        console.log(err);
      })



    })

  })
  .catch(function(rej){

    console.log("updatePersonList err:",rej);

  })

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

function trainThisPerson(button){

  var person_name = $(button).siblings("span.person_name").html()

  console.log("trainThisPerson: ",person_name);

  var session_id = "bed3cbaebe9042faa4f463d4d8c4984b"

  var session = $("<span>"+session_id+"</span>").addClass("session")

  $(button).siblings("span.person_name").after(session)

}

function newGroup(){

  console.log("newGroup");

  var group_name = $('input#newGroupName').val()
  assert.notEqual(group_name,'','group name empty')

  fpp.createGroup(group_name)
  .then(function(res){

    updateGroupList()

  })
  .catch(function(err){

    console.log("newGroup err:",err);

  })

}

function createGroup() {


  var group_name = $('#createGroup input').val()
  assert.notEqual(group_name,'','group name empty')

  var p = new Promise(function(res,rej){

    fpp.createGroup(group_name,function(r){

      if (typeof(r) == 'string') rej(r)

      if (typeof(r) == 'object') res(r)

    })

  })

  p.then(function(v){

    console.log(v);

  })

  .catch(function(v){

    console.log(v);

  })

}

function getGroupInfo(this_group) {

  var group_name = $(this_group).parent().prop('id')

  console.log('getGroupInfo: ',group_name);

  $('.group .group_person').remove();

  var p = new Promise(function(res,rej){

    fpp.getGroupInfo(group_name,function(r){

      if (typeof(r) == 'string') rej(r)

      if (typeof(r) == 'object') res(r)

    })

  })


  p.then(function(v){

    console.log(v);

    var n = $('<div class="group_person"><div>')

    v.person.forEach(function(v){

      $(n).append('<div>' + v.person_name + '</div>')

    })

    $(this_group).after(n)

  })

  .catch(function(v){

    console.log(v);

  })

}

function addSelectedPersonToGroup(button) {

  var person_to_add = []

  $('#person_list :checked').each(function(i,e){

    var person_name = $(e).siblings(".person_name").html()

    person_to_add.push(person_name)

  })

  var group_name = $(button).siblings("span.group_name").html()

  console.log("addSelectedPersonToGroup: ",person_to_add,',',group_name);

  fpp.addPersonToGroup(person_to_add,group_name)
  .then(function(res){

    console.log(res);

  })
  .catch(function(err){

    console.log(err);

  })

}

function trainThisGroup(button) {

  console.log("trainThisGroup");

  var group_name = $(button).siblings("span.group_name").html()

  fpp.trainGroup(group_name)
  .then(function(res){

    var session_id = res.session_id

    var session = $('<span>' + session_id + '</span>').addClass("session")

    $(button).siblings("span.group_name").after(session)

  })
  .catch(function(err){
    console.log(err);
  })

}

function deleteFaceset(remove_button) {

  var faceset_name = $(remove_button).siblings('span.faceset_name').html()

  fpp.deleteFaceset(faceset_name)
  .then(function(res){

    updateFacesetList()

  })
  .catch(function(err){
    console.log(err);
  })

}

function newPerson() {

  var person_name = $("#newPersonName").val()
  assert.notEqual(person_name,'','person name empty')

  fpp.createPerson(person_name)
  .then(function(res){

    updatePersonList()

  })
  .catch(function(err){

    console.log(err);

  })

}

function checkSession(session_span) {

  var session_id = $(session_span).html()

  fpp.checkSession(session_id)
  .then(function(res){

    if (res.status == "SUCC") $(session_span).remove()

  })
  .catch(function(err){

    console.log(err);

  })

}

function removeThisPerson(button) {

  var person_name = $(button).siblings("span.person_name").html()

  console.log("removeThisPerson: ",person_name);

  var fpp_ = require("fpp")

  var credential = {
    access_key:'333ca2f63f20b272f49c5551d2bf6f6e',
    access_secret:'hu9dk11LEH-Bf6Xgw21hrTWRs_aFDT84'
  }

  fpp_.setup(credential)

  fpp_.deletePerson(person_name)

  .then(function(res){

    updatePersonList()

  })

  .catch(function(err){

    console.log(err);

  })

}

function removeGroup(button) {

  var group_name = $(button).siblings("span.group_name").html()

  fpp_.deleteGroup(group_name)
  .then(function(res){

    updateGroupList();

  })
  .catch(function(err){

    console.log(err);
    
  })

}
