#!/opt/homebrew/bin/python3

import os
import json
import re
PROJECTS = [
    'snc-idr-test',
    'glide-idr-di-test',
    'idr-test',
    'idr-di-test',
    'idr-di-test-frontend',
    'idr-test-frontend',
    'idr-di-dct-test'
]
def collect_test_metrics(test_projects_dir):
    project_metrics = []

    # Regex pattern to match annotations
    annotation_pattern = r'@\w+(?:\s*\([^)]*\))?'

    # Regex pattern to match method definitions
    method_pattern = re.compile(
        rf'(?P<annotations>(?:{annotation_pattern}\s*)+)'  # Capture one or more annotations
        r'(?:public\s+)?'                                  # Optional 'public'
        r'(?:[\w<>,\s]+\s+)?'                              # Return type and generics (e.g., 'void', 'List<String>')
        r'(?P<method_name>\w+)\s*'                         # Method name
        r'\(',                                             # Opening parenthesis of method parameters
        re.MULTILINE
    )


    for project_name in PROJECTS:
        project_path = os.path.join(test_projects_dir, project_name)
        if not os.path.isdir(project_path):
            continue

        total_classes = 0
        total_cases = 0
        total_ignored = 0
        test_cases = []
        ignored_tests = []

        for root, _, files in os.walk(project_path):
            for file in files:
                if file.endswith('.java'):  # Adjust for your language or file type
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()

                        # Check if the file contains a test class
                        if '@Test' in content or '@InjectedTest' in content:
                            total_classes += 1

                        # Find all methods with annotations
                        for match in method_pattern.finditer(content):
                            annotations_block = match.group('annotations')
                            method_name = match.group('method_name')

                            # Normalize annotations (remove line breaks and extra spaces)
                            annotations = re.findall(annotation_pattern, annotations_block.replace('\n', ' '))

                            # Check if the method is a test method
                            is_test_method = any(
                                re.match(r'@(?:Test|InjectedTest)(?:\s*\([^)]*\))?', ann)
                                for ann in annotations
                            )

                            if is_test_method:
                                total_cases += 1
                                test_case_info = {
                                    'class_name': file_path,
                                    'method_name': method_name,
                                    'ignored': False
                                }
                                test_cases.append(test_case_info)

                                # Check if the test method is ignored
                                is_ignored = any(
                                    re.match(r'@Ignore(?:\s*\([^)]*\))?', ann)
                                    for ann in annotations
                                )

                                if is_ignored:
                                    total_ignored += 1
                                    test_case_info['ignored'] = True
                                    ignored_tests.append(test_case_info)

        ignored_percentage = (total_ignored / total_cases * 100) if total_cases > 0 else 0

        project_metric = {
            'project_name': project_name,
            'total_classes': total_classes,
            'total_cases': total_cases,
            'total_ignored': total_ignored,
            'ignored_percentage': round(ignored_percentage, 2),
            'test_cases': test_cases,
            'ignored_tests': ignored_tests
        }

        project_metrics.append(project_metric)

    return project_metrics

def main():
    test_projects_dir = "~/dev/glide-test"
    resolved_path = os.path.expanduser(test_projects_dir)

    metrics = collect_test_metrics(resolved_path)
    output_file = 'test_project_metrics.json'

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(metrics, f, indent=4)

    print(f'Metrics written to {output_file}')

if __name__ == '__main__':
    main()

