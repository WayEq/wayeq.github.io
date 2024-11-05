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
unit_test_root_dir = "~/dev/gll/glide"  # New unit test root directory

# List of integration test projects to analyze
integration_projects = [
   "idr-test",
   "idr-di-test",
   "idr-test-frontend",
   "idr-di-test-frontend",
   "glide-idr-di-test",
   "snc-idr-test"
]

synonyms = {
        "Anil Enukollu": "Anil Kumar Enukollu",
        "Dave Lo": "David Lo"
}

# List of unit test projects to analyze
unit_projects = [
    "glide-idr"
]

# Regex pattern to extract date and author from git blame output
blame_pattern = re.compile(r"\((.*?) (\d{4}-\d{2}-\d{2}) .*?\)")

# Regex pattern to extract method name from method declaration
method_pattern = re.compile(r"^\s*public\s+void\s+(\w+)\s*\(")

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

# Function to normalize author names consistently
def normalize_author_name(author):
    # Handle dups
    # Replace '.' with space, then capitalize each part to ensure consistency
    author = author.replace('.', ' ')
    author_parts = author.split()
    author_parts = [part.capitalize() for part in author_parts]
    author = ' '.join(author_parts)
    author = synonyms.get(author, author)
    return author

# Function to process a single file
def process_file(repo_dir, file, project_name, test_type):
    file = os.path.expanduser(file)

    if not os.path.exists(file):
        return

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
        author = normalize_author_name(author)  # Extract the author name
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
            for i in range(test_line_index + 1, max_lines):
                method_declaration = lines[i].strip()
                method_match = method_pattern.match(method_declaration)
                if method_match:
                    test_name = method_match.group(1)
                    found_method = True
                    break  # Exit loop once method is found
                # Optionally, you can add a line limit to avoid long searches
                # if i - test_line_index > 10:
                #     break

            if not found_method:
                # Handle the case where the method declaration was not found
                continue

            class_name = os.path.basename(file).replace('.java', '')  # Extract class name without path or extension
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
            continue

# Function to process all test files in a specific project
def process_project(project_name, root_dir, test_type):
    project_dir = os.path.join(root_dir, project_name)
    project_dir = os.path.expanduser(project_dir)

    # Debugging output to verify project directory
    print(f"Processing project: {project_name}, directory: {project_dir}, test type: {test_type}")

    # Find all Java test files (adjust paths to accommodate different structures for unit tests)
    possible_test_paths = ['src/test', 'tests', 'src/main/test']
    for test_path in possible_test_paths:
        full_test_path = os.path.join(project_dir, test_path)
        if os.path.exists(full_test_path):
            for root, _, files in os.walk(full_test_path):
                for file in files:
                    if file.endswith(".java"):
                        process_file(project_dir, os.path.join(root, file), project_name, test_type)

# Process all specified projects with concurrency
def process_all_projects():
    with ThreadPoolExecutor() as executor:
        # Process integration test projects
        for project in integration_projects:
            executor.submit(process_project, project, integration_test_root_dir, "integration")
        # Process unit test projects
        for project in unit_projects:
            executor.submit(process_project, project, unit_test_root_dir, "unit")

# Run the analysis for all projects
process_all_projects()

# Generate a complete list of months from the earliest to the latest date in the data
def generate_months(start_date, end_date):
    current = start_date
    while current <= end_date:
        yield current.strftime("%Y-%m")
        current += timedelta(days=32)
        current = current.replace(day=1)

# Determine the range of months to display
if month_test_map:
    start_month = min(month_test_map.keys())
    end_month = max(month_test_map.keys())
    start_date = datetime.strptime(start_month, "%Y-%m")
    end_date = datetime.strptime(end_month, "%Y-%m")
else:
    start_date = end_date = datetime.now()

# Prepare the results to be saved to JSON
# Sort author_test_count by the number of tests in descending order
author_test_count_sorted = dict(sorted(author_test_count.items(), key=lambda item: item[1], reverse=True))

# Save the results to a JSON file

sorted_monthly_aggregates = sorted(
    [{"month": month, "integration_count": counts["integration"], "unit_count": counts["unit"]}
     for month, counts in monthly_aggregation_data.items()],
    key=lambda x: datetime.strptime(x["month"], "%Y-%m")  # Sorts by year-month as a date
)

# Correct JSON output generation
output_data = {
    "test_metadata": root_test_metadata,  # Root-level metadata for each test with project, author, timestamp, etc.
    "monthly_aggregates":sorted_monthly_aggregates,
    "author_test_count": author_test_count_sorted
}

output_file = "test_analysis_results.json"
with open(output_file, 'w') as f:
    json.dump(output_data, f, indent=4)

print(f"Results saved to {output_file}")

