#!/usr/bin/env python3

import json
import datetime
import sys
import os
import urllib.request
import subprocess

def load_test_results(json_path):
    """
    Load and parse the JSON file containing test results.
    """
    if not os.path.exists(json_path):
        print(f"Error: JSON file '{json_path}' does not exist.")
        sys.exit(1)

    try:
        with open(json_path, 'r') as file:
            data = json.load(file)
            if not isinstance(data, list):
                raise ValueError("JSON data is not an array.")
            return data
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON file: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}")
        sys.exit(1)

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
    categories = ['passed', 'failed', 'skipped']
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

def generate_message(latest_result, deltas=None):
    """
    Generate a formatted message string from the latest test result,
    including delta counts if provided.
    """
    message = (
        f"**Integration Test Results** (*{latest_result['test_branch']}*)\n"
        f"**Execution Time:** {latest_result['execution_time']}\n\n"
    )

    # Define the categories to display
    categories = ['passed', 'failed', 'skipped', 'error']

    for category in categories:
        count = latest_result['counts'].get(category, 0)
        # Capitalize the category name for display
        category_display = category.capitalize()
        if deltas and category in deltas:
            message += f"- {category_display}: {count} {deltas[category]}\n"
        else:
            message += f"- {category_display}: {count}\n"

    message += "\n[View Detailed Results](https://wayeq.github.io/idr-test-velocity.html)"
    print(message)
    return message

def post_to_webhook(webhook_url, message):
    """
    Post the message to the specified webhook URL using urllib.
    """
    payload = json.dumps({"text": message}).encode('utf-8')
    headers = {'Content-Type': 'application/json'}
    print(f"Posting message to webhook: {webhook_url}: {message} with headers: {headers}")
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
        print(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"Error posting message via curl: {e.stderr}")
        sys.exit(1)

def main():
    # Path to the JSON file
    json_path = 'test_results/test_results_index.json'

    # Webhook URL (replace with your actual webhook URL)
    webhook_url = 'https://servicenow.cloud.mattermost.com/hooks/7ktimf6k8jdw7rr8e7ciziqzyo'

    # Load test results
    test_results = load_test_results(json_path)

    if not test_results:
        print("No test results found in the JSON file.")
        sys.exit(0)

    # Sort test results by execution_time
    sorted_results = sort_test_results(test_results)

    # Get the latest test result
    latest_result = sorted_results[-1]

    # Initialize deltas
    deltas = None

    # Check if there is a previous test result to compare with
    if len(sorted_results) >= 2:
        previous_result = sorted_results[-2]
        deltas = calculate_deltas(latest_result, previous_result)
    else:
        print("No previous test results found. Delta counts will not be displayed.")

    # Generate the message with deltas if available
    message = generate_message(latest_result, deltas)

    # Post the message to the webhook
    post_via_curl(webhook_url, message)

if __name__ == "__main__":
    main()
