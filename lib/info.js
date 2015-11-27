var assert = require('assert');
var fpp = require('./lib/facepp.js');
//var EventEmitter = require('events');

function updatePersonList() {

  var p = new Promise(function(res,rej){

    fpp.getPersonList(function(v){

      if (typeof(v) == 'object') res(v)

      if (typeof(v) == 'string') rej(v)

    })

  })

  p.then(function(v){

    var list = ""

    v.person.forEach(function(vv){

      list += '<div>'
      list += '<input type="checkbox" value="'
      list += vv.person_name
      list += '" />'
      list += '<span>' + vv.person_name + '</span>'
      list += '</div>'
      //list += "</li>"

    })

    $('#person_list').prepend(list)

  })

  .catch(function(v){

    console.log('catch',v);

  })

}

function updateGroupList() {

  var p = new Promise(function(res,rej){

    fpp.getGroupList(function(v){

      if (typeof(v) == 'object') res(v)

      if (typeof(v) == 'string') rej(v)

    })

  })

  p.then(function(v){

    v.group.forEach(function(g){

      var n = $('<div></div>')
      $(n).addClass('group')
      $(n).prop('id',g.group_name)
      $(n).append('<div class="group_label">' + g.group_name + '</div>')
      .append('<button onclick="trainThisGroup(this)">train this group</button>')

      $('#group_list').prepend(n)

    })

  })

  .catch(function(v){

    console.log(v);

  })

}

function trainSelectedPerson(){

  var person_names = []

  $('#person_list :checked').each(function(i,e){
    //var n = $(e).prop('value')
    person_names.push($(e).prop('value'))

  })

  console.log('trainSelectedPerson: ',person_names);

  person_names.forEach(function(v){

    var p = new Promise(function(res,rej){

      fpp.trainThisPerson(v,function(r){

        if (typeof(r) == 'string') rej(r)

        if (typeof(r) == 'object') res(r)

      })

    });

    p.then(function(r){

      console.log(v,r);

      var html = 'training person: ' + v + ' ' + r.session_id

      $("#training_list").append('<div>' + html + '</div>')

    })

    .catch(function(r){

      console.log(v);

      var html = 'training person: ' + v + ' ' + r

      $("#training_list").append('<div>' + html + '</div>')

    })

    window.setTimeout(function(){console.log('prevent CONCURRENCY_LIMIT_EXCEEDED');},1000)

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

function addSelectedPersonToGroup() {

  var person_to_add = []

  $('#person_list :checked').each(function(i,e){
    //var n = $(e).prop('value')
    person_to_add.push($(e).prop('value'))

  })

  var group_name = $('.group_person').parent().prop('id');
  assert.notEqual(group_name,undefined);

  console.log('addSelectedPersonToGroup: ',person_to_add,group_name);

  var p = new Promise (function(res,rej){

    fpp.addPersonToGroup(person_to_add,group_name,function(r){

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

function trainThisGroup(this_group) {

  var group_name = $(this_group).parent().prop('id');

  console.log('trainThisGroup: ',group_name);

  var p = new Promise(function(res,rej){

    fpp.trainThisGroup(group_name,function(v){

      if (typeof(r) == 'string') rej(v)

      if (typeof(r) == 'object') res(v)

    })

  })

  p.then(function(v){

    var html = 'training group: ' + v + ' ' + r.session_id

    $("#training_list").append('<div>' + html + '</div>')

  })

  .catch(function(v){

    var html = 'training person: ' + v

    $("#training_list").append('<div>' + html + '</div>')

  })


}
