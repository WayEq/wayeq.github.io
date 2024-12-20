#!/opt/homebrew/bin/python3

import os
import json
import xml.etree.ElementTree as ET
from datetime import datetime

# Base directory containing all project repositories
TEST_REPO = '/Users/aaron.shoal/dev/glide-test'
GLIDE_REPO = '/Users/aaron.shoal/dev/gll/glide'
WORKING_DIR = '/Users/aaron.shoal/dev/wayeq.github.io'

# List of projects to process
PROJECTS = [
    'snc-idr-test',
    'glide-idr-di-test',
    'idr-test',
    'idr-di-test',
    'idr-di-test-frontend',
    'idr-test-frontend',
    'idr-di-dct-test'
]

# Output directory for JSON files
OUTPUT_DIR = os.path.join(WORKING_DIR, 'test_results')

# Ensure the output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Path to the execution metadata JSON file
EXECUTION_METADATA_JSON = '/tmp/zen/execution_metadata.json'

# Index file to keep track of test runs
INDEX_FILE = os.path.join(OUTPUT_DIR, 'test_results_index.json')

def parse_failsafe_xml(xml_file, project_name):
    """
    Parses a Failsafe XML report and extracts test results.
    Includes system_out and system_err only for failed or errored test cases.
    Also includes the execution time for each test case.

    Args:
        xml_file (str): Path to the Failsafe XML file.
        project_name (str): Name of the project the XML belongs to.

    Returns:
        dict: A dictionary containing suite-level information and a list of test cases.
    """
    try:
        tree = ET.parse(xml_file)
        root = tree.getroot()
    except ET.ParseError as e:
        print(f"Error parsing XML file {xml_file}: {e}")
        return {}
    except Exception as e:
        print(f"Unexpected error parsing XML file {xml_file}: {e}")
        return {}

    test_results = []

    # Iterate over each <testcase> element in the XML
    for testcase in root.findall('testcase'):
        class_name = testcase.attrib.get('classname', 'Unknown Class')
        test_name = testcase.attrib.get('name', 'Unknown Test')
        time = testcase.attrib.get('time', '0')  # Extracting the 'time' attribute

        # Split classname into package and class name
        if '.' in class_name:
            package, class_name_only = class_name.rsplit('.', 1)
        else:
            package = ''
            class_name_only = class_name

        # Determine the result and get stack trace if available
        result = 'passed'
        stack_trace = ''
        failure_elem = testcase.find('failure')
        error_elem = testcase.find('error')
        skipped_elem = testcase.find('skipped')

        if failure_elem is not None:
            result = 'failed'
            stack_trace = failure_elem.text or ''
        elif error_elem is not None:
            result = 'error'
            stack_trace = error_elem.text or ''
        elif skipped_elem is not None:
            result = 'skipped'

        # Initialize the test case dictionary
        test_case_dict = {
            'project_name': project_name,
            'xml_file': xml_file,
            'package': package,
            'class_name': class_name_only,
            'test_name': test_name,
            'result': result,
            'stack_trace': stack_trace.strip(),
            'time': float(time)  # Convert time to float for numerical analysis
        }

        # Include system_out and system_err only if the test case failed or errored
        if result in ['failed', 'error']:
            case_system_out_elem = testcase.find('system-out')
            case_system_err_elem = testcase.find('system-err')

            case_system_out = case_system_out_elem.text.strip() if case_system_out_elem is not None and case_system_out_elem.text else ''
            case_system_err = case_system_err_elem.text.strip() if case_system_err_elem is not None and case_system_err_elem.text else ''

            # Add the system outputs to the test case dictionary if they exist
            if case_system_out:
                test_case_dict['system_out'] = case_system_out
            if case_system_err:
                test_case_dict['system_err'] = case_system_err

        test_results.append(test_case_dict)

    return {
        'project_name': project_name,
        'xml_file': xml_file,
        'test_cases': test_results
    }

def update_index_file(output_filename, execution_time, test_branch, counts):
    index_data = []
    if os.path.exists(INDEX_FILE):
        try:
            with open(INDEX_FILE, 'r') as f:
                index_data = json.load(f)
        except Exception as e:
            print(f"Error reading index file {INDEX_FILE}: {e}")

    # Add the new entry to the index
    index_data.append({
        "filename": output_filename,
        "execution_time": execution_time,
        "test_branch": test_branch,
        "counts": counts  # Include counts in the index
    })

    # Save the updated index
    try:
        with open(INDEX_FILE, 'w') as f:
            json.dump(index_data, f, indent=4)
        print(f"Index file {INDEX_FILE} updated.")
    except Exception as e:
        print(f"Error writing to index file {INDEX_FILE}: {e}")

from datetime import datetime

def get_execution_duration(execution_start_time, execution_end_time):

    # Parse the input strings into datetime objects
    start_time = datetime.strptime(execution_start_time, "%Y-%m-%dT%H:%M:%SZ")
    end_time = datetime.strptime(execution_end_time, "%Y-%m-%dT%H:%M:%SZ")

    # Calculate the duration
    duration = end_time - start_time

    # Format the duration as a string
    hours, remainder = divmod(duration.seconds, 3600)
    minutes, seconds = divmod(remainder, 60)

    duration_string = f"{hours}h {minutes}m {seconds}s"
    return duration_string


import subprocess
import os
def parse_and_format_time(timestamp, default_now=True):
    """Parse an ISO 8601 timestamp and format it to '%Y-%m-%d %H:%M:%S'.
    If parsing fails or timestamp is empty, return the current time or the original string."""
    if timestamp:
        try:
            # Parse and format the timestamp
            parsed_time = datetime.strptime(timestamp, '%Y-%m-%dT%H:%M:%SZ')
            return parsed_time.strftime('%Y-%m-%d %H:%M:%S')
        except ValueError as e:
            print(f"Error parsing timestamp: {e}")
            return timestamp  # Use the original string as fallback
    elif default_now:
        # Use current time if no timestamp is provided
        return datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return None

def main():
    # Collect all test cases directly
    all_test_cases = []

    for project in PROJECTS:
        # Construct the path to the Failsafe XML reports for the current project
        xml_dir = os.path.join(TEST_REPO, project, 'target', 'failsafe-reports')

        if not os.path.isdir(xml_dir):
            print(f"XML directory does not exist for project '{project}': {xml_dir}")
            continue

        # Iterate over all XML files in the directory
        for filename in os.listdir(xml_dir):
            if filename.startswith('TEST-') and filename.endswith('.xml'):
                xml_file = os.path.join(xml_dir, filename)

                # Parse the XML file and get test results
                parsed_result = parse_failsafe_xml(xml_file, project)
                if parsed_result:
                    # Collect test cases
                    all_test_cases.extend(parsed_result['test_cases'])

    if not all_test_cases:
        print("No test results found. Please check the project directories and XML files.")
        return

    # Read execution metadata from EXECUTION_METADATA_JSON
    try:
        with open(EXECUTION_METADATA_JSON, 'r') as f:
            execution_metadata = json.load(f)
    except Exception as e:
        print(f"Error reading execution metadata: {e}")
        execution_metadata = {
            'execution_end_time': '',
            'test_branch': ''
        }

    execution_start_time = execution_metadata.get('execution_start_time', '')
    execution_end_time = execution_metadata.get('execution_end_time', '')

    execution_start_time_str = parse_and_format_time(execution_start_time)
    execution_end_time_str = parse_and_format_time(execution_end_time)

    duration = get_execution_duration(execution_start_time, execution_end_time)

    test_branch = execution_metadata.get('test_branch', '')
    test_project_metrics = execution_metadata.get('projects')
    # Get the commit hash
    glide_hash = execution_metadata.get('glide_commit', '')
    glide_test_hash = execution_metadata.get('test_commit', '')

    # Prepare the final output JSON structure
    output_data = {
        'execution_start_time': execution_start_time_str,
        'execution_end_time': execution_end_time_str,
        'execution_duration': duration,
        'test_branch': test_branch,
        'glide_commit_hash': glide_hash,
        'glide_test_commit_hash': glide_test_hash,
        'test_project_metrics': test_project_metrics,
        'test_results': all_test_cases
    }

    # Calculate counts
    counts = {
        'passed': sum(1 for test in all_test_cases if test['result'] == 'passed'),
        'failed': sum(1 for test in all_test_cases if test['result'] == 'failed'),
        'error': sum(1 for test in all_test_cases if test['result'] == 'error'),
        'skipped': sum(1 for test in all_test_cases if test['result'] == 'skipped')
    }

    # Generate timestamped filename
    try:
        execution_time_dt = datetime.strptime(execution_end_time, '%Y-%m-%dT%H:%M:%SZ')
        timestamp = execution_time_dt.strftime('%Y%m%d_%H%M%S')
    except ValueError as e:
        print(f"Error parsing execution_end_time: {e}")
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

    output_filename = f"test_results_{timestamp}.json"
    output_filepath = os.path.join(OUTPUT_DIR, output_filename)

    # Write the aggregated test results to the JSON file
    try:
        with open(output_filepath, 'w') as f:
            json.dump(output_data, f, indent=4)
        print(f"Test results have been written to {output_filepath}")
    except Exception as e:
        print(f"Error writing to JSON file {output_filepath}: {e}")

    # Update the index file with counts
    update_index_file(output_filename, execution_start_time_str, test_branch, counts)

if __name__ == '__main__':
    main()
