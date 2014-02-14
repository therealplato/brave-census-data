var questions = require('./censusColumns.js');
var short = require('./censusHeaders.js');

var metadata = [];
questions.forEach(function(question){
  metadata.push({
    question: question,
    subtext: "",
    type: "text",
  });
});
for(var i=0; i<short.length; i++){
  var meta = metadata[i];
  meta.short = short[i];
  meta.group = short[i].replace(/[0-9]+$/,'');
  metadata[i] = meta;
};

console.log(JSON.stringify(metadata, null, 2));
