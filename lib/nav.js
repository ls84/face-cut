
var remote = require('remote')

function goToInfo() {

  remote.getCurrentWindow().loadUrl('file://' + __dirname + '/info.html')

}

function goToDataPrepare() {


}

function goToRecognize() {

  //console.log('jump' + 'file://' + __dirname + '/recognize.html');

  remote.getCurrentWindow().loadUrl('file://' + __dirname + '/recognize.html')

}
