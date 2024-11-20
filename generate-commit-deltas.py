#!/opt/homebrew/bin/python3

import os
import json
import subprocess
from datetime import datetime

# Paths to your repositories
TEST_REPO = '/Users/aaron.shoal/dev/glide-test'
GLIDE_REPO = '/Users/aaron.shoal/dev/gll/glide'

# Path to the test results directory
TEST_RESULTS_DIR = 'test_results'

# Output file
OUTPUT_FILE = 'commit_deltas.json'

def load_test_results_index():
    index_file = os.path.join(TEST_RESULTS_DIR, 'test_results_index.json')
    with open(index_file, 'r') as f:
        index_data = json.load(f)
    return index_data

def load_test_result(filename):
    file_path = os.path.join(TEST_RESULTS_DIR, filename)
    with open(file_path, 'r') as f:
        test_result = json.load(f)
    return test_result

def get_commit_info(repo_path, old_hash, new_hash):
    """
    Get commits between old_hash and new_hash in the specified repository.
    Returns a list of dictionaries with 'commit', 'author', 'date', and 'message'.
    """
    # Ensure the repository is up to date
    subprocess.run(['git', '-C', repo_path, 'fetch'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    if old_hash == new_hash:
        return []  # No new commits

    cmd = [
        'git', '-C', repo_path, 'log',
        '--pretty=format:%H|%an|%ad|%s',
        '--date=iso',
        f'{old_hash}..{new_hash}'
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        print(f"Error running git log in {repo_path}: {result.stderr}")
        return []

    commits = []
    for line in result.stdout.strip().split('\n'):
        if line:
            parts = line.split('|', 3)
            if len(parts) == 4:
                commit_hash, author, date, message = parts
                commits.append({
                    'commit': commit_hash,
                    'author': author,
                    'date': date,
                    'message': message
                })
            else:
                print(f"Unexpected git log format: {line}")
    return commits

def load_existing_deltas():
    if not os.path.exists(OUTPUT_FILE):
        return {}
    with open(OUTPUT_FILE, 'r') as f:
        try:
            existing_deltas = json.load(f)
            # Create a dict with keys as (from_execution_time, to_execution_time)
            delta_dict = {
                (delta['from_execution_time'], delta['to_execution_time']): delta
                for delta in existing_deltas
            }
            return delta_dict
        except json.JSONDecodeError:
            print(f"Warning: {OUTPUT_FILE} is not a valid JSON. Starting fresh.")
            return {}

def save_commit_deltas(commit_deltas):
    # Convert dict back to list for JSON serialization
    deltas_list = list(commit_deltas.values())
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(deltas_list, f, indent=4)
    print(f"Commit deltas saved to {OUTPUT_FILE}")

def main():
    index_data = load_test_results_index()
    # Sort the index data based on execution_time
    index_data.sort(key=lambda x: datetime.strptime(x['execution_time'], '%Y-%m-%d %H:%M:%S'))

    existing_deltas = load_existing_deltas()

    # We'll update existing_deltas with new entries
    new_entries = 0

    for i in range(1, len(index_data)):
        current_entry = index_data[i]
        previous_entry = index_data[i - 1]

        key = (previous_entry['execution_time'], current_entry['execution_time'])
        if key in existing_deltas:
            print(f"Delta already exists for {key}. Skipping.")
            continue

        print(f"Processing {previous_entry['execution_time']} to {current_entry['execution_time']}")

        current_result = load_test_result(current_entry['filename'])
        previous_result = load_test_result(previous_entry['filename'])

        # Get commit hashes
        current_glide_hash = current_result.get('glide_commit_hash')
        current_glide_test_hash = current_result.get('glide_test_commit_hash')

        previous_glide_hash = previous_result.get('glide_commit_hash')
        previous_glide_test_hash = previous_result.get('glide_test_commit_hash')

        # Get commits between hashes
        glide_commits = get_commit_info(GLIDE_REPO, previous_glide_hash, current_glide_hash)
        glide_test_commits = get_commit_info(TEST_REPO, previous_glide_test_hash, current_glide_test_hash)

        delta_entry = {
            'from_execution_time': previous_entry['execution_time'],
            'to_execution_time': current_entry['execution_time'],
            'from_filename': previous_entry['filename'],
            'to_filename': current_entry['filename'],
            'glide_commits': glide_commits,
            'glide_test_commits': glide_test_commits
        }

        existing_deltas[key] = delta_entry
        new_entries += 1

    if new_entries > 0:
        save_commit_deltas(existing_deltas)
    else:
        print("No new commit deltas to add.")

if __name__ == '__main__':
    main()
