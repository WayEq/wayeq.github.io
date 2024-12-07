#!/usr/bin/env python3

import os
import requests
import json

# SonarQube configuration
SONAR_URL = "https://metrics.devsnc.com"
PROJECT_KEY = "com.snc:sonar-glide-idr"
API_KEY = os.getenv('SONAR_API_KEY')

if not API_KEY:
    print("Please set the SONAR_API_KEY environment variable.")
    exit(1)

# Function to get coverage data
def get_coverage(project_key):
    url = f"{SONAR_URL}/api/measures/component"
    params = {
        'component': project_key,
        'metricKeys': 'ncloc'
    }
    response = requests.get(url, params=params, auth=(API_KEY, ''))
    response.raise_for_status()
    data = response.json()
    measures = data.get('component', {}).get('measures', [])
    if measures:
        coverage_value = measures[0].get('value')
        return float(coverage_value)
    else:
        return None

# Function to get issues count by severity
def get_issues_count(project_key, severity):
    url = f"{SONAR_URL}/api/issues/search"
    params = {
        'componentKeys': project_key,
        'severities': severity,
        'ps': 1  # Page size of 1 to minimize data transfer
    }
    response = requests.get(url, params=params, auth=(API_KEY, ''))
    response.raise_for_status()
    data = response.json()
    total_issues = data.get('total', 0)
    return total_issues

# Fetch data
coverage = get_coverage(PROJECT_KEY)
blocker_issues = get_issues_count(PROJECT_KEY, 'BLOCKER')
critical_issues = get_issues_count(PROJECT_KEY, 'CRITICAL')

# Prepare output
output = {
    'project_key': PROJECT_KEY,
    'coverage': coverage,
    'blocker_issues': blocker_issues,
    'critical_issues': critical_issues
}

# Output the result as JSON
print(json.dumps(output, indent=4))