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

def get_latest_result(test_results):
    """
    Identify the latest test result based on 'execution_time'.
    """
    try:
        latest = max(
            test_results,
            key=lambda x: datetime.datetime.strptime(x['execution_time'], '%Y-%m-%d %H:%M:%S')
        )
        return latest
    except KeyError as e:
        print(f"Missing expected key in test result: {e}")
        sys.exit(1)
    except ValueError as e:
        print(f"Error parsing 'execution_time': {e}")
        sys.exit(1)

def generate_message(latest_result):
    """
    Generate a formatted message string from the latest test result.
    """
    message = (
        f"**Latest Test Results**\n"
        f"**Branch:** {latest_result['test_branch']}\n"
        f"**Execution Time:** {latest_result['execution_time']}\n\n"
        f"**Test Counts:**\n"
        f"- Passed: {latest_result['counts']['passed']}\n"
        f"- Failed: {latest_result['counts']['failed']}\n"
        f"- Error: {latest_result['counts']['error']}\n"
        f"- Skipped: {latest_result['counts']['skipped']}\n\n"
        f"[View Detailed Results](https://wayeq.github.io/idr-test-velocity.html)"
    )
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

    # Get the latest test result
    latest_result = get_latest_result(test_results)

    # Generate the message
    message = generate_message(latest_result)

    # Post the message to the webhook
    post_via_curl(webhook_url, message)

if __name__ == "__main__":
    main()

