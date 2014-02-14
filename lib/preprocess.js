// Process a raw google docs csv file for the Brave Census to:
// Remove first line (long format headers)
// Strip PII and opsec (name and capital ships)

var path = require('path');
var csv = require('csv');

var fileArg = process.argv[2];
if(fileArg === undefined){ 
  throw new Error('Pass a csv filename as a command line parameter.')
}

var filePath = path.resolve(fileArg); 
//use fileArg if already absolute path; else assume filename is relative to .
var outputPath = filePath + '.clean.csv';

// Load census metadata:
var metadata = require('./censusMetadata.js');
// Load the list of short column names:
var columns = metadata.map(function(meta){ return meta.short });

csv()
.from(filePath, {columns: columns})
.to(outputPath)
.transform(function(row, index){
  if(index === 0){
    return null;  // skip the first line (headers)
  };
  row.final1 = "opsec";
  row.pvp8 = "opsec";
  return row;
})
.on('end', function(count){
  console.log('Wrote',count,'lines to',outputPath)
});
