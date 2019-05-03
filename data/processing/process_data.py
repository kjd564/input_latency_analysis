import copy
import csv
import json
import numpy as np
import sys
import argparse

def loadJSONfile(filename):
  traces = [];
  for line in open(filename, 'r'):
    trace = {}
    try:
      trace = json.loads(line)
    except:
      print("Failed to load trace.")
      continue

    # Toss out traces with no latency data
    if (len(trace['failures']) == 0 and len(trace['pairs']['Latencies']) > 0):
        traces.append(trace)

  return traces

# Take a set of traces and get all of the latency information out of them
def getLatencyEvents(traces):
  latencies = []
  for trace in traces:
    for latency in trace['pairs']['Latencies']:
      latencies.append(latency)
  return latencies

# Get all of the event names across all of the latency events
def getAllEventNames(latencies, queue='Queue Events Bottom-Up', handle='Handling Events Bottom-Up'):
  events = {'queue':[], 'handle':[]}
  for latency in latencies:
    for event_title in latency[queue].keys():
      if event_title not in events['queue']:
        events['queue'].append(event_title)
    for event_title in latency[handle].keys():
      if event_title not in events['handle']:
        events['handle'].append(event_title)
  events['all'] = list(set(events['queue']) | set(events['handle']))
  return events


# Creates a dictionary of events and their durations for every latency event
# This dictionary has an entry for each event with a list of the durations for 
# that event across all of the latency events being analyzed. 
def createEventDicts(latencies, queue='Queue Events Bottom-Up', handle='Handling Events Bottom-Up'):
  names = getAllEventNames(latencies, queue=queue, handle=handle)

  # Sort Queue event durations into the queuing dictionary
  queue_events = {}
  for name in names['queue']:
    queue_events[name] = []

  for name in queue_events.keys():
    for latency in latencies:
      if name in latency[queue].keys() and latency[queue][name] != None:
        queue_events[name].append(latency[queue][name])

  # Sort Handle event durations into the handling dictionary
  handle_events = {}
  for name in names['handle']:
    handle_events[name] = []

  for name in handle_events.keys():
    for latency in latencies:
      if name in latency[handle].keys() and latency[handle][name] != None:
        handle_events[name].append(latency[handle][name])

  all_events = {}
  for name in names['all']:
    all_events[name] = []

  for name in all_events.keys():
    summed = 0
    for latency in latencies:
      # For all, if the event is in the queue and handle portions, we want
      # the sum of those two for each latency.
      if name in latency[handle].keys() and latency[handle][name] != None:
        summed += latency[handle][name]
      if name in latency[queue].keys() and latency[queue][name] != None:
        summed += latency[queue][name]
      if name in latency[queue].keys() or name in latency[handle].keys():
        all_events[name].append(summed)

  return queue_events, handle_events, all_events

def computeEventStatistics(event_dict, num_latencies):
  event_stats = {}
  total_occurences = 0
  for event in event_dict.keys():
    event_stats[event] = {}
    total_occurences += len(event_dict[event])

    # To get the mean event duration across all the latencies
    # fill in a list with 0's for the latency events that do not
    # contain the given event.
    zeros = [0] * (num_latencies - len(event_dict[event]))
    zeroed = event_dict[event] + zeros

    event_stats[event]['zerod_mean'] = np.mean(zeroed)
    event_stats[event]['occurences'] = len(event_dict[event])
    event_stats[event]['mean'] = np.mean(event_dict[event])
    event_stats[event]['median'] = np.median(event_dict[event])
    event_stats[event]['25th'] = np.percentile(event_dict[event], 25)
    event_stats[event]['75th'] = np.percentile(event_dict[event], 75)
    event_stats[event]['90th'] = np.percentile(event_dict[event], 90)
    event_stats[event]['99th'] = np.percentile(event_dict[event], 99)

  return event_stats

def writeDataAsCSV(dictionary, filename):
  with open(filename, 'w') as csv_file:
    writer = csv.writer(csv_file)
    writer.writerow(['Name', 'Mean Across All Latencies', 'Mean', 'Median',
                     '25th Percentile', '75th Percentile', '90th Percentile',
                     '99th Percentile', 'Occurences'])
    
    # Get the top 19 events by longest average duration, the 20th will be an other category
    sorted_keys = sorted(dictionary.keys(), key=lambda x: dictionary[x]['zerod_mean'], reverse=True)
    for count, event in enumerate(sorted_keys):
      if count == 19:
        other_sum = sum(dictionary[item]['zerod_mean'] for item in sorted_keys[20:])
        writer.writerow(['other', other_sum])
        writer.writerow([])
        writer.writerow(['other:'])

      writer.writerow([event, dictionary[event]['zerod_mean'], dictionary[event]['mean'],
                       dictionary[event]['median'], dictionary[event]['25th'],
                       dictionary[event]['75th'], dictionary[event]['90th'],
                       dictionary[event]['99th'], dictionary[event]['occurences']])

def main():
  parser = argparse.ArgumentParser()
  parser.add_argument("--input_file", help="path to the datafile to process")
  args = parser.parse_args()

  traces = loadJSONfile(args.input_file)
  latencies = getLatencyEvents(traces)

  # Bottom-Up approach
  q, h, a = createEventDicts(latencies)
  writeDataAsCSV(computeEventStatistics(q, len(latencies)), args.input_file[:-5] + "_queue_averages.csv")
  writeDataAsCSV(computeEventStatistics(h, len(latencies)), args.input_file[:-5] + "_handle_averages.csv")
  writeDataAsCSV(computeEventStatistics(a, len(latencies)), args.input_file[:-5] + "_all_averages.csv")

  # Top-Down approach
  q, h, a = createEventDicts(latencies, queue='Queue Events Top-Down',
                             handle='Handling Events Top-Down')
  writeDataAsCSV(computeEventStatistics(q, len(latencies)), args.input_file[:-5] + "_queue_averages_top_down.csv")
  writeDataAsCSV(computeEventStatistics(h, len(latencies)), args.input_file[:-5] + "_handle_averages_top_down.csv")
  writeDataAsCSV(computeEventStatistics(a, len(latencies)), args.input_file[:-5] + "_all_averages_top_down.csv")

if __name__ == "__main__":
  main()
