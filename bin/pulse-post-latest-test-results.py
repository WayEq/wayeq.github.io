#!/usr/bin/env python3

import json
import datetime
import sys
import os
import subprocess
import argparse

WORKING_DIR = '/Users/aaron.shoal/dev/wayeq.github.io'
TEST_RESULTS_DIR = os.path.join(WORKING_DIR, 'test_results')
TEST_RESULTS_FILE = os.path.join(TEST_RESULTS_DIR, 'test_results_index.json')
COMMIT_DELTAS_FILE = os.path.join(WORKING_DIR, 'commit_deltas.json')

def load_json_file(json_path):
    """
    Load and parse a JSON file.
    """
    if not os.path.exists(json_path):
        print(f"Error: JSON file '{json_path}' does not exist.")
        return None

    try:
        with open(json_path, 'r') as file:
            data = json.load(file)
            return data
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON file '{json_path}': {e}")
        return None
    except Exception as e:
        print(f"Unexpected error while reading '{json_path}': {e}")
        return None

def sort_test_results(test_results):
    """
    Sort the test results based on 'execution_time' in ascending order.
    """
    try:
        sorted_results = sorted(
            test_results,
            key=lambda x: datetime.datetime.strptime(x['execution_time'], '%Y-%m-%d %H:%M:%S')
        )

        return sorted_results
    except KeyError as e:
        print(f"Missing expected key in test result: {e}")
        sys.exit(1)
    except ValueError as e:
        print(f"Error parsing 'execution_time': {e}")
        sys.exit(1)

def calculate_deltas(latest, previous):
    """
    Calculate the delta counts between the latest and previous test results.
    """
    deltas = {}
    categories = ['passed', 'failed', 'error', 'skipped']
    for category in categories:
        latest_count = latest['counts'].get(category, 0)
        previous_count = previous['counts'].get(category, 0)
        delta = latest_count - previous_count
        if delta > 0:
            deltas[category] = f"(+{delta})"
        elif delta < 0:
            deltas[category] = f"({delta})"
        else:
            deltas[category] = ""
    return deltas

def find_commit_deltas(commit_deltas_data, latest_filename):
    """
    Find the commit deltas entry corresponding to the latest test result.
    """
    for entry in commit_deltas_data:
        if entry['to_filename'] == latest_filename:
            return entry
    return None

def format_commit(commit):
    """
    Format a single commit entry for display.
    """
    repo = commit.get('repo', '')
    commit_hash_full = commit['commit']
    commit_hash_short = commit_hash_full[:7]  # Shorten the hash for display
    author = commit['author']
    date = commit['date']
    message = commit['message']
    # Get the first line of the commit message as the short description
    short_description = message.split('\n')[0]
    # Construct the commit URL
    base_urls = {
        'glide': 'https://code.devsnc.com/dev/glide',
        'glide-test': 'https://code.devsnc.com/dev/glide-test'
    }
    repo_url = base_urls.get(repo, '')
    if repo_url:
        commit_url = f"{repo_url}/commit/{commit_hash_full}"
        # Format the commit hash as a markdown link
        commit_link = f"\"[{short_description}]({commit_url})\""
    else:
        # If no base URL is known for the repo, just display the short hash
        commit_link = commit_hash_short
    return f"**[{repo}]** {commit_link} by {author} on {date}"

def generate_message(latest_result, deltas=None, commit_deltas_entry=None):
    """
    Generate a formatted message string from the latest test result,
    including delta counts and commit information if provided.
    """
    message = (
        f"**Integration Test Results** (*{latest_result['test_branch']}*)\n"
        f"**Execution Time:** {latest_result['execution_time']}\n\n"
    )

    # Define the categories to display
    categories = ['passed', 'failed', 'error', 'skipped']

    # Start the markdown table
    message += "| Result | Count (delta) |\n"
    message += "|----------|-------|\n"
    for category in categories:
        count = latest_result['counts'].get(category, 0)
        category_display = category.capitalize()
        delta_str = ''
        if deltas and category in deltas:
            delta_str = f" {deltas[category]}"
        message += f"| {category_display} | {count}{delta_str} |\n"

    # Include commit information if available
    if commit_deltas_entry:
        glide_commits = commit_deltas_entry.get('glide_commits', [])
        glide_test_commits = commit_deltas_entry.get('glide_test_commits', [])
        total_commits = len(glide_commits) + len(glide_test_commits)

        if total_commits > 0:
            message += f"\n**Delta Commits ({total_commits}):**\n\n"
            # Combine commits and add 'repo' field
            all_commits = [{'repo': 'glide', **commit} for commit in glide_commits] + \
                          [{'repo': 'glide-test', **commit} for commit in glide_test_commits]
            # Limit the number of commits to avoid overly long messages
            MAX_COMMITS_TO_DISPLAY = 5

            for idx, commit in enumerate(all_commits, start=1):
                if idx > MAX_COMMITS_TO_DISPLAY:
                    break
                formatted_commit = format_commit(commit)
                message += f"{idx}. {formatted_commit}\n"

            if total_commits > MAX_COMMITS_TO_DISPLAY:
                remaining = total_commits - MAX_COMMITS_TO_DISPLAY
                message += f"\n...and {remaining} more commits."

    message += "\n\n\n[View Detailed Results](https://wayeq.github.io/idr-test-velocity.html)"
    print(message)
    return message

def post_via_curl(webhook_url, message):
    """
    Post the message to the webhook using curl via subprocess.
    """
    payload = json.dumps({"text": message})
    command = [
        'curl', '-i', '-X', 'POST',
        '-H', 'Content-Type: application/json',
        '-d', payload,
        webhook_url
    ]

    try:
        result = subprocess.run(command, capture_output=True, text=True, check=True)
        print("Message posted successfully via curl.")
    except subprocess.CalledProcessError as e:
        print(f"Error posting message via curl: {e.stderr}")
        sys.exit(1)

def parse_arguments():
    """
    Parse command-line arguments.
    """
    parser = argparse.ArgumentParser(description="Post test results to a webhook.")
    parser.add_argument(
        '--post', '-p',
        action='store_true',
        help='Post the message to the webhook if this flag is set.'
    )
    return parser.parse_args()

def main():
    # Parse command-line arguments
    args = parse_arguments()
    webhook_url = 'https://servicenow.cloud.mattermost.com/hooks/7ktimf6k8jdw7rr8e7ciziqzyo'

    # Load test results
    test_results = load_json_file(TEST_RESULTS_FILE)
    if not test_results:
        print("No test results found in the JSON file.")
        sys.exit(0)

    # Load commit deltas
    commit_deltas_data = load_json_file(COMMIT_DELTAS_FILE)
    if not commit_deltas_data:
        print("No commit deltas found in the JSON file.")
        commit_deltas_data = []

    # Sort test results by execution_time
    sorted_results = sort_test_results(test_results)

    # Get the latest test result
    latest_result = sorted_results[-1]

    # Initialize deltas and commit_deltas_entry
    deltas = None
    commit_deltas_entry = None

    # Check if there is a previous test result to compare with
    if len(sorted_results) >= 2:
        previous_result = sorted_results[-2]
        deltas = calculate_deltas(latest_result, previous_result)

        # Find the commit deltas entry corresponding to the latest test result
        latest_filename = latest_result.get('filename')
        if latest_filename:
            commit_deltas_entry = find_commit_deltas(commit_deltas_data, latest_filename)
    else:
        print("No previous test results found. Delta counts will not be displayed.")

    # Generate the message with deltas and commit information if available
    message = generate_message(latest_result, deltas, commit_deltas_entry)

    # Post the message to the webhook only if the --post flag is set
    if args.post:
        post_via_curl(webhook_url, message)
    else:
        print("Post flag not set. Message will not be sent to the webhook.")

if __name__ == "__main__":
    main()
