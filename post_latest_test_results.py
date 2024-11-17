#!/usr/bin/env python3

import json
import datetime
import sys
import os
import urllib.request
import subprocess

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
            deltas[category] = "(±0)"
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
    commit_hash = commit['commit'][:7]  # Shorten the hash for display
    author = commit['author']
    date = commit['date']
    message = commit['message']
    return f"- {commit_hash} by {author} on {date}\n  {message}"

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

    for category in categories:
        count = latest_result['counts'].get(category, 0)
        # Capitalize the category name for display
        category_display = category.capitalize()
        if deltas and category in deltas:
            message += f"- {category_display}: {count} {deltas[category]}\n"
        else:
            message += f"- {category_display}: {count}\n"

    # Include commit information if available
    if commit_deltas_entry:
        glide_commits = commit_deltas_entry.get('glide_commits', [])
        glide_test_commits = commit_deltas_entry.get('glide_test_commits', [])
        total_commits = len(glide_commits) + len(glide_test_commits)

        if total_commits > 0:
            message += f"\n**Commits Between Test Runs ({total_commits}):**\n"
            # Limit the number of commits to avoid overly long messages
            MAX_COMMITS_TO_DISPLAY = 5
            commits_displayed = 0

            for commit in glide_commits:
                if commits_displayed >= MAX_COMMITS_TO_DISPLAY:
                    break
                formatted_commit = format_commit(commit)
                message += f"{formatted_commit}\n"
                commits_displayed += 1

            if commits_displayed < MAX_COMMITS_TO_DISPLAY:
                for commit in glide_test_commits:
                    if commits_displayed >= MAX_COMMITS_TO_DISPLAY:
                        break
                    formatted_commit = format_commit(commit)
                    message += f"{formatted_commit}\n"
                    commits_displayed += 1

            if total_commits > MAX_COMMITS_TO_DISPLAY:
                remaining = total_commits - MAX_COMMITS_TO_DISPLAY
                message += f"\n...and {remaining} more commits."

    message += "\n\n[View Detailed Results](https://wayeq.github.io/idr-test-velocity.html)"
    print(message)
    return message

def post_to_webhook(webhook_url, message):
    """
    Post the message to the specified webhook URL using urllib.
    """
    payload = json.dumps({"text": message}).encode('utf-8')
    headers = {'Content-Type': 'application/json'}
    print(f"Posting message to webhook: {webhook_url}")
    req = urllib.request.Request(webhook_url, data=payload, headers=headers, method='POST')

    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print("Message posted successfully.")
            else:
                print(f"Failed to post message. Status code: {response.status}")
                sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f"HTTP error occurred: {e.code} - {e.reason}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"URL error occurred: {e.reason}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)

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

def main():
    # Paths to the JSON files
    test_results_json_path = 'test_results/test_results_index.json'
    commit_deltas_json_path = 'commit_deltas.json'

    webhook_url = 'https://servicenow.cloud.mattermost.com/hooks/7ktimf6k8jdw7rr8e7ciziqzyo'

    # Load test results
    test_results = load_json_file(test_results_json_path)
    if not test_results:
        print("No test results found in the JSON file.")
        sys.exit(0)

    # Load commit deltas
    commit_deltas_data = load_json_file(commit_deltas_json_path)
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
        print(f"LATEST: {latest_result} PREVIOUS: {previous_result}")

        # Find the commit deltas entry corresponding to the latest test result
        latest_filename = latest_result.get('filename')
        if latest_filename:
            commit_deltas_entry = find_commit_deltas(commit_deltas_data, latest_filename)
    else:
        print("No previous test results found. Delta counts will not be displayed.")

    # Generate the message with deltas and commit information if available
    message = generate_message(latest_result, deltas, commit_deltas_entry)

    # Post the message to the webhook
    post_via_curl(webhook_url, message)

if __name__ == "__main__":
    main()
