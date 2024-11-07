import os
import subprocess
import re
import json
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from datetime import datetime, timedelta

# Define the root directories containing all the projects
integration_test_root_dir = "~/dev/glide-test"  # Existing integration test root directory
unit_test_root_dir = "~/dev/"  # New unit test root directory

# List of integration test projects to analyze
integration_projects = [
    # "idr-test",
    # "idr-di-test",
    # "idr-test-frontend",
    # "idr-di-test-frontend",
    # "glide-idr-di-test",
    # "snc-idr-test"
]

synonyms = {
    "Anil Enukollu": "Anil Kumar Enukollu",
    "Dave Lo": "David Lo"
}

# List of unit test projects to analyze
unit_projects = [
    "mobilesky-android-app",
    "nowsdk-android",
    "snowchat-android"
]

# Regex pattern to extract date and author from git blame output
blame_pattern = re.compile(r"\((.*?) (\d{4}-\d{2}-\d{2}) .*?\)")

# Regex patterns to extract method name from method declarations
# Separate patterns for Java and Kotlin
java_method_pattern = re.compile(r'''
    ^\s*                                  # Start of line, optional whitespace
    (public|protected|private|static|\s)* # Optional modifiers
    \s*
    (<[^>]+>\s+)?                         # Optional generics (e.g., <T>)
    ([\w\[\]]+\s+)+                       # Return type (e.g., int, String, int[])
    (\w+)                                 # Method name (captured group 4)
    \s*
    \([^)]*\)                             # Parameter list in parentheses
    (\s*throws\s+[\w\s,]+)?               # Optional throws clause
    \s*\{                                 # Opening brace
''', re.VERBOSE)

kotlin_method_pattern = re.compile(r'''
    ^\s*          # Start of line, optional whitespace
    fun\s+        # 'fun' keyword followed by whitespace
    (\w+)\s*      # Method name (captured group 1)
    \(\s*\)       # Empty parameter list '()' with optional whitespace
''', re.VERBOSE | re.MULTILINE)

# Regex pattern to extract package name from Java file
package_pattern = re.compile(r"^\s*package\s+([\w.]+);")

# Dictionary to store test counts by author
author_test_count = defaultdict(int)

root_test_metadata = []
monthly_aggregation_data = defaultdict(lambda: {"integration": 0, "unit": 0})

# Dictionary to store test counts and details by month
month_test_map = defaultdict(lambda: {"integration": 0, "unit": 0})
month_test_details = defaultdict(lambda: {"integration": [], "unit": []})
map_lock = Lock()

# Path to the execution metadata JSON file
EXECUTION_METADATA_JSON = '/tmp/zen/execution_metadata.json'

# Function to normalize author names consistently
def normalize_author_name(author):
    # Handle duplicates and formatting
    author = author.replace('.', ' ')
    author_parts = author.split()
    author_parts = [part.capitalize() for part in author_parts]
    author = ' '.join(author_parts)
    author = synonyms.get(author, author)
    return author

# Function to process a single file
def process_file(repo_dir, file, project_name, test_type):
    file = os.path.expanduser(file)
    print(f"Processing file: {file}")
    if not os.path.exists(file):
        return

    # Determine file type based on extension
    file_extension = os.path.splitext(file)[1].lower()
    is_java = file_extension == '.java'
    is_kotlin = file_extension == '.kt'

    # Run grep to find all @Test or @InjectedTest annotations in the file
    result = subprocess.run(['grep', '-nE', '@Test|@InjectedTest', file], capture_output=True, text=True)
    if result.returncode != 0:
        return

    # Extract the package name from the file
    package_name = None
    with open(file, 'r') as f:
        lines = f.readlines()
        for line in lines:
            match = package_pattern.match(line)
            if match:
                package_name = match.group(1).replace('.', '/')
                break

    for line in result.stdout.splitlines():
        try:
            line_number, _ = line.split(':', 1)
        except ValueError:
            continue

        if not line_number.isdigit():
            continue

        # Run git blame to get the author and date for this line
        blame_output = subprocess.run(['git', '-C', repo_dir, 'blame', '-L', f"{line_number},{line_number}", '--', file], capture_output=True, text=True)

        if blame_output.returncode != 0:
            continue

        blame_output_text = blame_output.stdout.strip()

        # Use regex to extract the author and date from the blame output
        match = blame_pattern.search(blame_output_text)
        if not match:
            continue

        author = match.group(1).strip()
        # Normalize author name to avoid duplicates like 'Jennifer Lee' and 'jennifer.lee'
        author = normalize_author_name(author)
        date_str = match.group(2)  # Extract the date in YYYY-MM-DD format
        month_year = date_str[:7]  # Get YYYY-MM

        # Extract the method name (look for the next non-empty line after @Test or @InjectedTest)
        try:
            test_name = "UnnamedTest"
            test_line_index = int(line_number)  # The @Test or @InjectedTest annotation line

            # Initialize variables for line traversal
            max_lines = len(lines)
            found_method = False

            # Start searching from the line after the annotation
            for i in range(test_line_index, max_lines):
                method_declaration = lines[i].strip()

                # Skip annotations or empty lines
                if method_declaration.startswith('@') or not method_declaration:
                    continue

                if is_java:
                    method_match = java_method_pattern.match(method_declaration)
                    if method_match:
                        test_name = method_match.group(4)  # Extracted method name
                        print(f"Found Java method: {test_name}")
                        found_method = True
                        break
                elif is_kotlin:
                    method_match = kotlin_method_pattern.match(method_declaration)
                    if method_match:
                        test_name = method_match.group(1)  # Extracted method name
                        print(f"Found Kotlin method: {test_name}")
                        found_method = True
                        break

                # Optional: Limit search to next 10 lines to avoid long searches
                if i - test_line_index > 10:
                    break

            if not found_method:
                # Handle the case where the method declaration was not found
                continue

            # Extract class name without path or extension
            class_name = os.path.basename(file).replace('.java', '').replace('.kt', '')

            # Add the test to the dictionary with a lock to prevent race conditions
            author_test_count[author] += 1
            with map_lock:
                monthly_aggregation_data[month_year][test_type] += 1
                root_test_metadata.append({
                    "project": project_name,
                    "package": package_name if package_name else "unknown/package",
                    "class": class_name,
                    "test": test_name,
                    "test_type": test_type,
                    "author": author,
                    "timestamp": date_str
                })
        except Exception as e:
            print(f"Error processing line {line_number} in file {file}: {e}")
            continue

# Function to process all test files in a specific project
def process_project(project_name, root_dir, test_type):
    project_dir = os.path.join(root_dir, project_name)
    project_dir = os.path.expanduser(project_dir)

    # Debugging output to verify project directory
    print(f"Processing project: {project_name}, directory: {project_dir}, test type: {test_type}")

    # Find all Java and Kotlin test files (adjust paths to accommodate different structures for unit tests)
    possible_test_paths = [
        'servicenow-sdk/src/test', 'chat/src/test', 'web/src/test', 'push/src/test',
        'nowsdk/src/test', 'data/src/test', 'analytics/src/test', 'app/src/test',
        'src/test', 'tests', 'src/main/test'
    ]
    for test_path in possible_test_paths:
        full_test_path = os.path.join(project_dir, test_path)
        if os.path.exists(full_test_path):
            for root, _, files in os.walk(full_test_path):
                for file in files:
                    if file.endswith(".java") or file.endswith(".kt"):
                        process_file(project_dir, os.path.join(root, file), project_name, test_type)

# Function to process all projects with concurrency
def process_all_projects():
    with ThreadPoolExecutor() as executor:
        # Process integration test projects
        for project in integration_projects:
            executor.submit(process_project, project, integration_test_root_dir, "integration")
        # Process unit test projects
        for project in unit_projects:
            executor.submit(process_project, project, unit_test_root_dir, "unit")

# Function to read execution metadata
def read_execution_metadata():
    try:
        with open(EXECUTION_METADATA_JSON, 'r') as f:
            execution_metadata = json.load(f)
    except Exception as e:
        print(f"Error reading execution metadata: {e}")
        execution_metadata = {
            'execution_time': '',
            'test_branch': ''
        }

    # Format execution_time if present
    execution_time_str = ''
    if 'execution_end_time' in execution_metadata:
        try:
            # Parse ISO 8601 format
            execution_time_dt = datetime.strptime(execution_metadata['execution_end_time'], '%Y-%m-%dT%H:%M:%SZ')
            # Format to desired string format
            execution_time_str = execution_time_dt.strftime('%Y-%m-%d %H:%M:%S')
        except ValueError as e:
            print(f"Error parsing execution_end_time: {e}")
            execution_time_str = execution_metadata['execution_end_time']  # Use as is
    else:
        execution_time_str = ''

    test_branch = execution_metadata.get('test_branch', '')

    return execution_time_str, test_branch

# Run the analysis for all projects
process_all_projects()

# Read execution metadata
execution_time, test_branch = read_execution_metadata()

# Prepare the results to be saved to JSON
# Sort author_test_count by the number of tests in descending order
author_test_count_sorted = dict(sorted(author_test_count.items(), key=lambda item: item[1], reverse=True))

# Sort monthly aggregates by date
sorted_monthly_aggregates = sorted(
    [{"month": month, "integration_count": counts["integration"], "unit_count": counts["unit"]}
     for month, counts in monthly_aggregation_data.items()],
    key=lambda x: datetime.strptime(x["month"], "%Y-%m")  # Sorts by year-month as a date
)

# Prepare the final output JSON structure with execution metadata
output_data = {
    "execution_time": execution_time,      # New: Execution Time
    "test_branch": test_branch,            # New: Test Branch
    "test_metadata": root_test_metadata,   # Existing: Detailed test metadata
    "monthly_aggregates": sorted_monthly_aggregates,  # Existing: Aggregated counts by month
    "author_test_count": author_test_count_sorted      # Existing: Test counts by author
}

output_file = "mobile_test_analysis_results.json"
try:
    with open(output_file, 'w') as f:
        json.dump(output_data, f, indent=4)
    print(f"Results saved to {output_file}")
except Exception as e:
    print(f"Error writing to JSON file {output_file}: {e}")
