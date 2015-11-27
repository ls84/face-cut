
var remote = require('remote')

function goToInfo() {

  remote.getCurrentWindow().loadUrl('file://' + __dirname + '/info.html')

}

function goToDataPrepare() {



}

function goToRecognize() {

  remote.getCurrentWindow().loadUrl('file://' + __dirname + '/recognize.html')

}
