
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var csv = require('csv');
var app = express();

// Set up objects that will hold response data in memory
var byQuestion = {}; // store data sorted by question
var byResponse = []; // store data as an array of response objects

loadCSV(function(err){
  if(err){ throw err };
  console.log(byQuestion['pvp0']);
  // all environments
  app.set('port', process.env.PORT || 3000);
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.methodOverride());
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(app.router);

  // development only
  if ('development' == app.get('env')) {
    app.use(express.errorHandler());
  }

  app.all('*', function(req, res, next){
    res.locals.responseCount = byResponse.length;
    res.locals.groups = ['basic','habits','income','solo','groups','whatdo',
    'industry','pvp','comms','edu','hr','asset','cnm','it','final'];
    next();
  });

  app.get('/:shortOrIndex', function(req, res){
    res.locals.responseCount = byResponse.length;
    var i = req.params.shortOrIndex;
    var question = questionByShortOrIndex(i);
    if(question === false){
      res.redirect('/');
    } else {
      res.locals.initialQuestion = question;
      res.render('index');
    };
  });

  app.get('/', function(req, res){
    res.render('index');
  });

  app.get('/json/question/:shortOrIndex', function(req, res){
    var i = req.params.shortOrIndex;
    var question = questionByShortOrIndex(i);
    if(question == false){
      res.json(404, null);
    } else {
      res.json(200, question);
    };
  });

  app.get('/json/response/:resIndex', function(req, res){
    var i = +req.params.resIndex;
    if(isNaN(i)){
      res.json(404, null);
    }
    var response = byResponse[i];
    if(question == undefined){
      res.json(404, null);
    } else {
      res.json(200, response);
    };
  });

  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });
});

function loadCSV(callback){
  var errorHappened = false; // flag to avoid calling back twice

  // Load census metadata:
  var metadata = require('./lib/censusMetadata.js');

  // Get the short column names for object properties. see csv.from()
  var columnsShort = metadata.map(function(meta){ return meta.short });

  console.log('Got',columnsShort.length,'columns');

  // map short names to questions:  byQuestion[short] = question
  for(var i=0; i<metadata.length; i++){
    var temp = metadata[i];
    temp.answers = [];
    temp.index = i;
    byQuestion[temp.short] = temp;
  };
  // Attempt to load the given file as csv
  // Run `node preprocess.js filename.csv` first to remove first line and opsec
  var fileArg = process.argv[2];
  if(fileArg === undefined){ 
    throw new Error('Pass a csv filename as a command line parameter.');
  }

  //use fileArg if already absolute path; else assume filename is relative to .
  var filePath = path.resolve(fileArg); 

  //Load the CSV. Process per-line to add answers into byQuestion object; save
  //byResponse array at end of input.
  csv()
  .from(filePath, {columns: columnsShort})
  .to.array(function(data, count){
    console.log(data.length+' records loaded');
    byResponse = data;
  })
  .transform(function(row, index){
    // copy each answer in this response into the appropriate collection
    for (var shortName in row) {
      if(row.hasOwnProperty(shortName)){
        byQuestion[shortName].answers.push(row[shortName]);
      };
    };
    return row;
  })
  .on('error', function(err){
    errorHappened = true;
    return callback(err);
  })
  .on('end', function(count){
    if(!errorHappened){
      return callback(null);
    };
  });
}

// Find and return a question where i matches index, then i matches short
function questionByShortOrIndex(i){
  if(!isNaN(i)){ // i was number
    // iterate across keys in byQuestion until question.index matches
    for (short in byQuestion){
      var question = byQuestion[short];
      if(i == question.index){
        return question;
      };
    };
    return false;
  } else { // i was not number
    var question = byQuestion[i];
    if(question == undefined){
      return false;
    } else {
      return question;
    };
  }
};
