import os
import json
import xml.etree.ElementTree as ET

# Base directory containing all project repositories
TEST_REPO = '/Users/aaron.shoal/dev/glide-test'

# List of projects to process
PROJECTS = [
    'snc-idr-test',
    'glide-idr-di-test',
    'idr-test',
    'idr-di-test',
    'idr-di-test-frontend',
    'idr-test-frontend'
]

# Output JSON file path
OUTPUT_JSON = 'test_results.json'

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
            case_system_err_elem = testcase.find('system-err')  # Corrected element name

            case_system_out = case_system_out_elem.text.strip() if case_system_out_elem is not None and case_system_out_elem.text else ''
            case_system_err = case_system_err_elem.text.strip() if case_system_err_elem is not None and case_system_err_elem.text else ''

            # Add the system outputs to the test case dictionary if they exist
            if case_system_out:
                test_case_dict['system_out'] = case_system_out
            if case_system_err:
                test_case_dict['system_err'] = case_system_err

        test_results.append(test_case_dict)

    # Optionally, extract test suite metadata
    suite_metadata = {
        'tests': root.attrib.get('tests', '0'),
        'failures': root.attrib.get('failures', '0'),
        'errors': root.attrib.get('errors', '0'),
        'skipped': root.attrib.get('skipped', '0'),
        'time': root.attrib.get('time', '0')
    }

    return {
        'project_name': project_name,
        'xml_file': xml_file,
        'suite_metadata': suite_metadata,
        'test_cases': test_results
    }

def main():
    """
    Main function to process multiple projects and aggregate test results.
    """
    all_test_results = []

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
                    all_test_results.append(parsed_result)

    if not all_test_results:
        print("No test results found. Please check the project directories and XML files.")
        return

    # Write the aggregated test results to the JSON file
    try:
        with open(OUTPUT_JSON, 'w') as f:
            json.dump(all_test_results, f, indent=4)
        print(f"Test results have been written to {OUTPUT_JSON}")
    except Exception as e:
        print(f"Error writing to JSON file {OUTPUT_JSON}: {e}")

if __name__ == '__main__':
    main()
