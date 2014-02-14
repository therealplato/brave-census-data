var BRAVE = {
  state: {
    i: null,
    q: null,
    w: null,
    h: null,
    first: true,
  },
  questions: {},
};

document.addEventListener('DOMContentLoaded', init);

function init(){
  // Bind event handlers
  bindGroups();
  bindControls();
  setSize();
  console.log($('#graph').height());
  $(window).resize(function(){
    setSize();
    renderQuestion(BRAVE.state.q)
  });

  // Parse and render initial question if provided, otherwise render first question
  var jsonQ = $('#initialQuestion').attr('data-question');
  var initialQ = JSON.parse(jsonQ);
  if(initialQ == null){
    getQuestion(0, function(err, question){
      if(err){
        alert('Sorry, a server error occured.');
        console.log(err);
      } else {
        renderQuestion(question);
      };
    });
  } else {
    // Save this initial question in local memory
    var question = binAnswers(initialQ);
    BRAVE.questions[question.short] = question;
    BRAVE.state.q = question;
    renderQuestion(question);
  };

};

function bindGroups(){
  // Skip to the first question of a question group
  $('.group').click(function(e){
    e.preventDefault(); // don't actually go to the link
    var $this=$(this);
    var i = $this.attr('data-short');
    getQuestion(i, function(err, question){
      if(err){
        alert('Sorry, a server error occured.');
        console.log(err);
      } else {
        renderQuestion(question);
      };
    });
  });
};

function bindControls(){
  $('#prevQ').click(function(){
    loadPrev();
  });
  $('#nextQ').click(function(){
    loadNext();
  });
  $(document).on('keypress', function(e){
    console.log(e.which);
    if(e.which == 74 || e.which == 106){         // j
      loadNext();
    } else if(e.which == 75 || e.which == 107){  // k
      loadPrev();
    };
  });
};

function loadPrev(){
  if(BRAVE.state.i <= 0){ // on first question
    return false;
  };
  getQuestion(BRAVE.state.i-1, function(err, question){
    if(err){
      alert('Sorry, a server error occured.');
      console.log(err);
    } else {
      //renderQuestion(question);
      slideNew(question, "prev");
    };
  });
};

function loadNext(){
  if(BRAVE.state.i >= 90){ // on last question
    return false;
  };
  getQuestion(BRAVE.state.i+1, function(err, question){
    if(err){
      alert('Sorry, a server error occured.');
      console.log(err);
    } else {
      //renderQuestion(question);
      slideNew(question, "next");
    };
  });
};

function slideNew(question, dir){
  var newQAll = $('#question').clone();
  // Rename old elements so d3 doesn't change them when we render new Q
  $('#question, #prompt, #hint, #graph, #raw').each(function(){
    $(this).attr('id', $(this).attr('id')+'_old');
  });
  var newQ = $('#question');
  var oldQ = $('#question_old');
  newQAll.insertAfter($('#question_old'));
  // Set initial position and queue animation
  if(dir == 'prev'){
    newQ.css({"left": "-85%"});
    newQ.animate({"left": "5%"}, 
      {duration: 300, 
       easing: "swing", 
       queue: false,
    });
    oldQ.animate({"left": "95%"}, 
      {duration: 200, 
       easing: "swing", 
       queue: false,
       complete: clearOld,
    });
  } else if(dir == 'next'){
    newQ.css({"left": "95%"});
    newQ.animate({"left": "5%"}, 
      {duration: 300, 
       easing: "swing", 
       queue: false,
    });
    oldQ.animate({"left": "-85%"}, 
      {duration: 200, 
       easing: "swing", 
       queue: false,
       complete: clearOld,
    });
  };
  // Render question into newly cloned #question div
  renderQuestion(question);

};
function clearOld(){
  $('#question_old').remove();
}

function renderQuestion(question){
  console.log('Rendering',question.short);
  BRAVE.state.i = +question.index;
  BRAVE.state.q = question;

  // Set window url and title
  var t = "BRAVE Census: "+question.question
  window.history.pushState({}, t, question.short);
  document.title = t;

  // Pre-load nearby questions one by one into BRAVE.questions,
  // but otherwise ignore errors and results
  getQuestion(BRAVE.state.i+1, function(){
    getQuestion(BRAVE.state.i-1, function(){
      getQuestion(BRAVE.state.i+2, function(){
        getQuestion(BRAVE.state.i-2, function(){
        }); }); }); });

// Slide next element in
  $('#prompt, #hint, #graph, #raw').empty();
  $('#prompt').text(question.question);
  $('#hint').text(question.subtext || "");

  if((question.type == 'choice')
  || (question.type == 'dropdown')){
    renderPiechart(question);
  } else {
   $('#graph').text('Whoops! We haven\'t yet implemented a graphic for questions of type "'+question.type+'". Try again soon!');
   $('#raw').text(JSON.stringify(question.binned, null, 2));
   $('#raw').css({"font-family": "monospace",
                  "white-space": "pre"});
  };
};

function renderPiechart(q){
  var w2 = Math.floor(BRAVE.state.w*0.5);
  var h2 = Math.floor(BRAVE.state.h*0.5);
  //console.log('w2',w2,'h2',h2);
  var smallSide = Math.min(BRAVE.state.w, BRAVE.state.h);
  // A section through the short middle will be: 
  // 10% blank; 30% donut; 20% blank middle; 30% donut; 10% blank
  var arcR1 = Math.floor(smallSide * 0.4); // outer arc radius
  var arcR0 = Math.floor(smallSide * 0.1); // inner arc radius

  // Create d3 function that scales answer counts into radians
  // var count2rad = d3.scale.linear().domain(0, q.count).range([0, 2*Math.PI]);

  // d3 convenience method to set colors
  var colors = d3.scale.category20()

  // d3 convenience method to turn answer counts into radians
  var pie = d3.layout.pie()
    .value(function(d){ // this will take binned[i]
      return d[1]       // the count of this answer
    });

  // Create d3 function that makes an arc. 
  var arc = d3.svg.arc()
    .innerRadius(arcR0)
    .outerRadius(arcR1)

  // Insert SVG graph container into DOM; set size; save reference as graph
  var graph = d3.select('#graph').append('svg:svg')
    .attr("width", BRAVE.state.w)
    .attr("height", BRAVE.state.h)

  // Select or create an svg group with class arc for each datum
  var slices = graph.selectAll('.arc')
    .data(pie(q.binned))
    .enter()
      .append('g')
      .attr('class', 'arc')
      .attr('transform', ('translate('+w2+','+h2+')'));

  // Append a path element to each .arc group
  slices.append('path')
    .attr('d', arc)
    .style('fill', function(d, i){ return colors(i) });

  // Append a label to each .arc group
  slices.append('text')
    .attr("transform", function(d){
      return ('translate('+arc.centroid(d) + ')');
    })
    .style('text-anchor', 'middle')
    .text(function(d){ return d.data[0] });

};

function binAnswers(question){
  console.log('Binning');
  console.log(question);
  if(question.binned !== undefined){ // already binned
    return question;
  }
  // Get counts for each unique answer
  var bins = [];
  var nBlank = 0;
  for(var j=0; j<question.answers.length; j++){
    var answer = question.answers[j];
    // Skip blank answers
    if(answer == ""){
      nBlank += 1;
      continue;
    }
    var unique = true;
    // see if answer is unique
    for(var i=0; i<bins.length; i++){
      // check bins[i] to see if it holds answer
      if(bins[i][0] === answer){  // already had this answer
        bins[i][1] = bins[i][1]+1;
        unique = false;
      };
    };
    if(unique){ bins.push([answer, 1]); }
  };

  // Sort by decreasing answer count:
  bins.sort(function(a,b){
    return a[1]<b[1];
  });
  question.binned = bins;
  question.count = question.answers.length;
  question.nBlank = nBlank;
  return question;
};

function getQuestion(i, callback){
  // Create default callback in case none exists (for when we preload)
  if(typeof arguments[1] !== 'function'){
    var callback = function(err, data){ 
      if(err){
        var msg = 'Problem loading '+i;
      } else {
        var msg = 'Loaded '+data.short+' into local memory';
      };
      console.log(msg);
    };
  };

  // Test if we have this question in browser memory yet:
  var question = questionByShortOrIndex(i);
  if(question === false){ // haven't seen it yet. fetch json
    $.ajax('/json/question/'+i
    , {
      type: 'GET',
      dataType: 'json',
      success: function(data){
        // Save to local memory:
        data = binAnswers(data);
        BRAVE.questions[data.short] = data;
        callback(null, data);
      },
      error: function(xhr, status, error){
        callback(error);
      },
    });
  } else { //already had it
    callback(null, question);
  }
};

function questionByShortOrIndex(i){
  if(!isNaN(i)){ // i is number
    // iterate across keys in byQuestion until question.index matches
    for (short in BRAVE.questions){
      var question = BRAVE.questions[short];
      if(i == question.index){
        return question;
      };
    };
    return false;
  } else { // i is not number
    var question = BRAVE.questions[i];
    if(question == undefined){
      return false;
    } else {
      return question;
    };
  }
};

function setSize(){
  BRAVE.state.w = $('#graph').width();
  BRAVE.state.h = $('#graph').height();
};
