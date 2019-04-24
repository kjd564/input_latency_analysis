const LABEL_INDICES = {
  'all': 0,
  'queue': 1,
  'handle': 2,
};

// Generated from http://tools.medialab.sciences-po.fr/iwanthue/
const COLORS = ["#db4277",
		"#9f4953",
		"#df7f81",
		"#cf3b4c",
		"#d34a29",
		"#e57e5f",
		"#a05227",
		"#df8730",
		"#cf9766",
		"#8a6925",
		"#cba738",
		"#baaf64",
		"#78783c",
		"#7d8b26",
		"#9dbb36",
		"#4d651f",
		"#8eb56d",
		"#449131",
		"#61c350",
		"#428a4e",
		"#4dc381",
		"#2d7a59",
		"#58bea1",
		"#3abbcc",
		"#659cd9",
		"#5568ac",
		"#5e6fdb",
		"#ba93da",
		"#904ec6",
		"#8a569e",
		"#ca74de",
		"#b1348d",
		"#e357b3",
		"#dc82b0",
		"#9f456f"];

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

  const queue = await fetch("data/" + input_event + "_queue.csv");
  const queue_text = await queue.text();
  var queue_parsed = parseCSVdata(queue_text);
  addDataPerEvent(queue_parsed, raw, LABEL_INDICES.queue);
  addDataPerEvent(normalize(queue_parsed), normalized, LABEL_INDICES.queue);

  const handle = await fetch("data/" + input_event + "_handle.csv");
  const handle_text = await handle.text();
  var handle_parsed = parseCSVdata(handle_text);
  addDataPerEvent(handle_parsed, raw, LABEL_INDICES.handle);
  addDataPerEvent(normalize(handle_parsed), normalized, LABEL_INDICES.handle);

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
    chart.config.options.scales.xAxes[0].ticks.max = 1400
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
	    max: 1400,
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
