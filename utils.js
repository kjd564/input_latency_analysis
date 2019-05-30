const LABEL_INDICES = {
  'all': 0,
  'queue': 1,
  'handle': 2,
};

// Generated from http://tools.medialab.sciences-po.fr/iwanthue/
const COLORS = ["#db4371", "#a24556", "#da8080", "#ca3434",
		"#e46a5b", "#dc5c27", "#a1522a", "#dc986a",
		"#e08c31", "#a87a25", "#917038", "#d6ac3e",
		"#c29f2e", "#6b662d", "#e5de56", "#b5b26c",
		"#7e862b", "#596416", "#97c43f", "#4d662b",
		"#61a62d", "#4b882d", "#8cba75", "#669054",
		"#54c65d", "#327840", "#50bc7a", "#308266",
		"#53c2a3", "#649bd7", "#557de2", "#5f61a4",
		"#755bcd", "#b28adb", "#c05ecd", "#9b4c88",
		"#dd86b8", "#d0409c"];

var GRAPH_DATA = {};
var GRAPHS = {};

async function generateGraph(input_event, title) {
  var raw = {labels: ['all', 'queue', 'handle'], datasets:[]};
  var normalized = {labels: ['all', 'queue', 'handle'], datasets:[]};
  GRAPH_DATA[input_event] = {'raw':raw, 'normal':normalized};
    
  const all = await fetch("data/" + input_event + "_all.csv");
  const all_text = await all.text();
  var all_parsed = parseCSVdata(all_text);
  addDataPerEvent(all_parsed, raw, LABEL_INDICES.all);
  addDataPerEvent(normalize(all_parsed), normalized, LABEL_INDICES.all);

  var all_sum = Object.keys(all_parsed).reduce((sum,key)=>sum+parseFloat(all_parsed[key]||0),0);
      
  const queue = await fetch("data/" + input_event + "_queue.csv");
  const queue_text = await queue.text();
  var queue_parsed = parseCSVdata(queue_text);
  addDataPerEvent(queue_parsed, raw, LABEL_INDICES.queue);
  addDataPerEvent(normalize(queue_parsed), normalized, LABEL_INDICES.queue);

  var queue_sum = Object.keys(queue_parsed).reduce((sum,key)=>sum+parseFloat(queue_parsed[key]||0),0);
      
  const handle = await fetch("data/" + input_event + "_handle.csv");
  const handle_text = await handle.text();
  var handle_parsed = parseCSVdata(handle_text);
  addDataPerEvent(handle_parsed, raw, LABEL_INDICES.handle);
  addDataPerEvent(normalize(handle_parsed), normalized, LABEL_INDICES.handle);

  var handle_sum = Object.keys(handle_parsed).reduce((sum,key)=>sum+parseFloat(handle_parsed[key]||0),0);

  raw.labels = ['all: ' + all_sum.toFixed(3).toString(),
		'queue: ' + queue_sum.toFixed(3).toString(),
		'handle: ' + handle_sum.toFixed(3).toString()];
  normalized.labels = ['all: 100%',
		       'queue: ' + ((queue_sum / all_sum) * 100).toFixed(3).toString() + '%',
		       'handle: ' + ((handle_sum / all_sum) * 100).toFixed(3).toString() + '%'];
   
  createChart(input_event, title, raw);
}

function parseCSVdata(data) {
  var parsed = {};
  const splited = data.split('\n');
  for (const line of splited) {
     var s = line.split(',');
     parsed[s[0]] = parseFloat(s[1]);
  }
  return parsed;
}

// Normalized data returned by parseCSVdata
function normalize(events) {
  var sum = Object.keys(events).reduce((sum,key)=>sum+parseFloat(events[key]||0),0);
  var normalized = Object.assign({}, events);
  for (key in normalized) {
    normalized[key] = normalized[key] / sum;
  }
  return normalized;
}

// Adds parseCSVdata to a data object formatted for Chartjs
function addDataPerEvent(events, data, label_index) {
  for (event in events) {
    var index = eventInData(event, data.datasets);
    if (index === false) {
      var point = {label:event, data:[0,0,0]};
      data.datasets.push(point);
      index = data.datasets.length - 1;
    }
    data.datasets[index].data[label_index] = events[event];
    data.datasets[index].backgroundColor = COLORS[index];
    data.datasets[index].fontSize = 20;
  }
}

// Checks if an event is already in Chartjs data object
function eventInData(event, data) {
  for (var i = 0; i < data.length; i++) {
    if (data[i].label === event) {
      return i;
    }
  }
  return false;
}

function toggleLegend(chart) {
  if (chart.options.legend.display === true) {
    chart.options.legend.display = false;
  } else {
    chart.options.legend.display = true;
  }
  chart.update();
}

function toggleDataType(input_event, chart, normalize) {
  if (normalize) {
    chart.config.data = GRAPH_DATA[input_event].normal;
    chart.config.options.scales.xAxes[0].ticks.max = 1;
    chart.config.options.scales.xAxes[0].scaleLabel.labelString = 'duration (%)';
  } else {
    chart.config.data = GRAPH_DATA[input_event].raw;
    chart.config.options.scales.xAxes[0].ticks.max = 700
    chart.config.options.scales.xAxes[0].scaleLabel.labelString = 'duration (ms)';
  }
  chart.update();
}

function toggleLegendAll() {
    for (c in GRAPHS) {
	toggleLegend(GRAPHS[c]);
    }
}

function toggleDataTypeAll() {
    var button = document.getElementById("dataButton");
    var normalize;
    if (button.innerHTML === "Raw Values") {
	button.innerHTML = "Normalized Values";
	normalize = false;
    } else {
	console.log(button.innerHTML);
	button.innerHTML = "Raw Values";
	normalize = true;
    }

    for (c in GRAPHS) {
	toggleDataType(c, GRAPHS[c], normalize);
    }
}

// Creates div and adds a canvas with the cart to that div
// Also adds buttons for toggling the legend on and off and 
// switching between normalized and raw data.
function createChart(input_event, title, event_data) {
  var div = document.getElementById(input_event);

  var canvas = document.createElement("CANVAS");
  canvas.setAttribute("id", input_event + "_canvas");
  div.appendChild(canvas);
    
  var ctx = canvas.getContext("2d");
  var chart = new Chart(ctx, {
    type: 'horizontalBar',
    data: event_data,
    options: {
      title: {
        display: true,
	text: title,
	fontSize: 30,
      },
      legend: {
        display: false,
	position: 'bottom',
	labels: {
	  fontSize: 15,
	},
      },
      tooltips: {
        titleFontSize: 20,
	  bodyFontSize: 20,
	  callbacks: {
	    label: function(tooltipItem, data) {
	      return data.datasets[tooltipItem.datasetIndex].label;
	    },
	    afterLabel: function(tooltipItem, data) {
              var raw = GRAPH_DATA[input_event].raw.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
	      var normal = GRAPH_DATA[input_event].normal.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
	      return ['Raw: ' + raw.toFixed(3).toString(), 'Normal: ' + normal.toFixed(3).toString()];
	    }
	  }
      },
      scales: {
        yAxes: [{
	  stacked: true,
	  ticks: {
	    fontSize: 20,
	  },
	}],
	xAxes: [{
	  stacked: true,
	  ticks: {
	    max: 700,
	    fontSize: 20,
	  },
	  scaleLabel: {
	    display: true,
	    labelString: 'duration (ms)',
	    fontSize: 20,
	  }
	}],
      }
    },
  });
  GRAPHS[input_event] = chart;
}
