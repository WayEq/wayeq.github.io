// test-results.js

import { createTestResultsPieChart, renderTestExecutionResultTrendChart } from './chart-handling.js';
import { getOrdinalSuffix, groupBy } from './utils.js';
import { loadExecutionData } from './data-fetching.js'; // Import loadExecutionData to fetch previous execution data

// Global variables to store current and previous test results
let currentTestResults = [];
let previousTestResults = [];

export async function displayTestResultsForExecution(executionFileName, comparedExecutionFileName, executionIndexData, executionData) {
    try {
        // Extract metadata
        const executionTime = executionData.execution_time;
        const testBranch = executionData.test_branch;
        const glideCommit = executionData.glide_commit_hash;
        const executionResults = executionData.test_results; // The array of test results

        // Store current test results globally
        currentTestResults = executionResults;

        // Load previous test results if available
        if (comparedExecutionFileName !== null) {
            const previousExecutionData = await loadExecutionData(comparedExecutionFileName);
            previousTestResults = previousExecutionData.test_results;
        } else {
            previousTestResults = []; // Empty array if no previous data
        }

        displayTestMetadata(executionTime, testBranch, glideCommit);

        renderTestResultsCardsAndPieChart(executionFileName, comparedExecutionFileName, executionIndexData);

        // By default, show only failed and errored tests
        const defaultFilteredData = executionResults.filter(test => test.result === 'failed' || test.result === 'error');

        // Populate the test results table with filtered data
        populateTestResultsTable(defaultFilteredData, executionFileName);

        // Populate the project filter options
        populateTestResultsFilters(executionResults);

        // Prepare data for the trend chart
        const labels = [];
        const failedData = [];
        const errorData = [];
        const skippedData = [];

        // Sort the testRuns by execution_time
        executionIndexData.sort((a, b) => new Date(a.execution_time) - new Date(b.execution_time));

        const selectedExecutionTime = executionIndexData.filter(e => e.filename === executionFileName)[0].execution_time;
        executionIndexData = executionIndexData.filter(e => new Date(e.execution_time) <= new Date(selectedExecutionTime));

        executionIndexData.forEach(run => {
            const date = new Date(run.execution_time);
            const month = date.toLocaleString('default', { month: 'short' }); // e.g., 'Nov'
            const day = date.getDate();
            const ordinal = getOrdinalSuffix(day);
            const hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'pm' : 'am';
            const formattedHours = hours % 12 || 12; // Convert to 12-hour format
            const formattedDate = `${month} ${day}${ordinal}, ${formattedHours}:${minutes}${ampm}`;
            labels.push(formattedDate);
            failedData.push(run.counts.failed);
            errorData.push(run.counts.error);
            skippedData.push(run.counts.skipped);
        });

        await renderTestExecutionResultTrendChart(failedData, errorData, skippedData, labels);

    } catch (error) {
        console.error('Error fetching test results:', error);
        displayError(`Failed to fetch test results: ${error.message}`);
    }
}

export async function populateTestExecutionDropdown(executionFileName, executionIndexData) {
    const testExecutionDropdown = document.getElementById('testRunSelect');
    testExecutionDropdown.innerHTML = ''; // Clear existing options

    // Create an option for each test run
    executionIndexData.forEach((executionIndexItem) => {
        const option = document.createElement('option');
        option.value = executionIndexItem.filename;
        option.textContent = `${executionIndexItem.execution_time} (${executionIndexItem.test_branch})`;
        testExecutionDropdown.appendChild(option);
    });

    const desiredOption = Array.from(testExecutionDropdown.options).find(option => option.value === executionFileName);
    if (desiredOption) {
        testExecutionDropdown.value = executionFileName;
    } else {
        console.warn(`Desired execution "${executionFileName}" not found. Loading the latest test run instead.`);
        if (executionIndexData.length > 0) {
            const latestExecutionIndexItem = executionIndexData[executionIndexData.length - 1];
            testExecutionDropdown.value = latestExecutionIndexItem.filename;
        }
    }
}

function renderTestResultsCardsAndPieChart(executionFileName, comparedExecutionFileName, executionIndexData) {
    // Calculate counts for current test run
    const currentCounts = executionIndexData.filter(e => e.filename === executionFileName)[0].counts;

    // Calculate counts for previous test run (if available)
    let previousCounts = null;
    if (comparedExecutionFileName !== null && executionIndexData && executionIndexData.length > 0) {
        const previousExecution = executionIndexData.filter(e => e.filename === comparedExecutionFileName)[0];
        if (previousExecution) {
            previousCounts = previousExecution.counts;
        }
    }

    // Update the test results summary with counts and deltas
    // Update counts
    document.getElementById('passedCount').innerHTML = formatCountWithDelta('passedCount', 'passedDelta', currentCounts.passed, previousCounts ? previousCounts.passed : null);
    document.getElementById('failedCount').innerHTML = formatCountWithDelta('failedCount', 'failedDelta', currentCounts.failed, previousCounts ? previousCounts.failed : null);
    document.getElementById('errorCount').innerHTML = formatCountWithDelta('errorCount', 'errorDelta', currentCounts.error, previousCounts ? previousCounts.error : null);
    document.getElementById('skippedCount').innerHTML = formatCountWithDelta('skippedCount', 'skippedDelta', currentCounts.skipped, previousCounts ? previousCounts.skipped : null);

    // Create or update the pie chart
    createTestResultsPieChart(currentCounts.passed, currentCounts.failed, currentCounts.error, currentCounts.skipped);
}

export function calculateTestCounts(testData) {
    return {
        passed: testData.filter(test => test.result === 'passed').length,
        failed: testData.filter(test => test.result === 'failed').length,
        error: testData.filter(test => test.result === 'error').length,
        skipped: testData.filter(test => test.result === 'skipped').length
    };
}

export function formatCountWithDelta(metricType, spanId, currentCount, previousCount) {
    if (previousCount === null) {
        // No previous data, just display the current count
        return `${currentCount}`;
    }

    const delta = currentCount - previousCount;
    let deltaSymbol = '';
    let deltaClass = '';

    if (delta > 0) {
        deltaSymbol = `<i class="fas fa-arrow-up"></i> ${delta} 
    <i class="fas fa-search info-icon"></i>`;
        metricType === 'passedCount' ? deltaClass = 'delta-up' : deltaClass = 'delta-down';
    } else if (delta < 0) {
        deltaSymbol = `<i class="fas fa-arrow-down"></i> ${Math.abs(delta)} 
    <i class="fas fa-search info-icon"></i>`;
        metricType === 'passedCount' ? deltaClass = 'delta-down' : deltaClass = 'delta-up';
    } else {
        return `${currentCount}`;
    }

    return `${currentCount} <span id=${spanId} class="delta ${deltaClass}">${deltaSymbol}</span>`;
}

export function populateTestResultsTable(testExecutionResultsData, executionFileName) {
    const tableBody = document.querySelector('#testResultsTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    // Group the data by project
    const projectGroups = groupBy(testExecutionResultsData, 'project_name');

    // Iterate over each project group
    for (const projectName in projectGroups) {
        const projectData = projectGroups[projectName];

        // Group the project data by class
        const classGroups = groupBy(projectData, 'class_name');

        const projectRowSpan = projectData.length; // Total number of tests in this project
        let isFirstProjectRow = true; // Flag to check if it's the first row for the project

        for (const className in classGroups) {
            const classData = classGroups[className];
            const classRowSpan = classData.length; // Number of tests in this class
            let isFirstClassRow = true; // Flag to check if it's the first row for the class

            classData.forEach((test) => {
                const row = document.createElement('tr');

                // Project Name cell
                if (isFirstProjectRow) {
                    const projectCell = document.createElement('td');
                    projectCell.textContent = projectName || '';
                    projectCell.rowSpan = projectRowSpan;
                    projectCell.style.verticalAlign = 'top';
                    row.appendChild(projectCell);
                    isFirstProjectRow = false;
                }

                // Class Name cell
                if (isFirstClassRow) {
                    const classCell = document.createElement('td');
                    classCell.textContent = className || '';
                    classCell.rowSpan = classRowSpan;
                    classCell.style.verticalAlign = 'top';
                    row.appendChild(classCell);
                    isFirstClassRow = false;
                }

                // Test Name
                const testNameCell = document.createElement('td');
                testNameCell.textContent = test.test_name || '';
                row.appendChild(testNameCell);

                // Result
                const resultCell = document.createElement('td');
                resultCell.textContent = test.result || '';
                resultCell.classList.add(test.result); // Add class for styling
                row.appendChild(resultCell);

                // Error Details
                const errorCell = document.createElement('td');
                if (test.stack_trace) {
                    const detailsButton = document.createElement('button');
                    detailsButton.textContent = 'Details';
                    detailsButton.onclick = () => {
                        window.open(
                            'test-result.html?project=' + encodeURIComponent(test.project_name) +
                            '&class=' + encodeURIComponent(test.class_name) +
                            '&test=' + encodeURIComponent(test.test_name) +
                            '&execution=' + encodeURIComponent(executionFileName),
                            '_blank'
                        );
                    };
                    errorCell.appendChild(detailsButton);
                } else {
                    errorCell.textContent = '';
                }
                row.appendChild(errorCell);

                tableBody.appendChild(row);
            });
        }
    }
}

export function populateTestResultsFilters(testResultsData) {
    const projectNameFilter = document.getElementById('projectNameFilter');
    const allProjects = new Set(testResultsData.map(test => test.project_name));

    // Clear existing options (except 'All Projects')
    projectNameFilter.innerHTML = '<option value="all">All Projects</option>';

    allProjects.forEach(project => {
        const option = document.createElement('option');
        option.value = project;
        option.textContent = project;
        projectNameFilter.appendChild(option);
    });
}

export function applyTestResultsFilters(executionResults, executionFileName) {
    const selectedResult = document.getElementById('resultFilter').value;
    const selectedProject = document.getElementById('projectNameFilter').value;

    let filteredData = executionResults.test_results;

    if (selectedResult !== 'all') {
        filteredData = filteredData.filter(test => test.result === 'failed' || test.result === 'error');
    }

    if (selectedProject !== 'all') {
        filteredData = filteredData.filter(test => test.project_name === selectedProject);
    }

    // Update the summary and table with the filtered data
    populateTestResultsTable(filteredData, executionFileName);
}

function displayTestMetadata(executionTime, testBranch, glideCommit) {
    const metadataContainer = document.getElementById('testMetadata');

    // Format the execution time
    const formattedExecutionTime = new Date(executionTime).toLocaleString();

    const commit = glideCommit ? ` (${glideCommit})` : '';
    // Update the content
    metadataContainer.innerHTML = `
        <p><strong><i class="far fa-clock"></i> Execution Time:</strong> ${formattedExecutionTime}</p>
        <p><strong><i class="fas fa-code-branch"></i> Branch:</strong> ${testBranch}${commit}</p>
    `;
}

// New function to show delta details
export function showDeltaDetails(resultType) {
    // Compute delta tests
    const deltaTests = getDeltaTests(resultType);
    // Display delta tests in the modal
    displayDeltaModal(resultType, deltaTests);
}

// Function to compute the delta tests
function getDeltaTests(resultType) {
    const deltaTests = [];

    // Create a map for previous test results
    const previousTestMap = new Map();
    previousTestResults.forEach(test => {
        const key = `${test.project_name}|${test.class_name}|${test.test_name}`;
        previousTestMap.set(key, test);
    });

    const currentTestMap = new Map();
    currentTestResults.forEach(test => {
        const key = `${test.project_name}|${test.class_name}|${test.test_name}`;
        currentTestMap.set(key, test);
    });

    currentTestResults.forEach(currentTest => {
        const key = `${currentTest.project_name}|${currentTest.class_name}|${currentTest.test_name}`;
        const previousTest = previousTestMap.get(key);

        if (previousTest) {
            if (currentTest.result !== previousTest.result && (currentTest.result === resultType || previousTest.result === resultType)) {
                deltaTests.push({
                    testName: currentTest.test_name,
                    className: currentTest.class_name,
                    projectName: currentTest.project_name,
                    previousResult: previousTest.result,
                    currentResult: currentTest.result
                });
            }
        } else {
            // New test added in current run
            if (currentTest.result === resultType) {
                deltaTests.push({
                    testName: currentTest.test_name,
                    className: currentTest.class_name,
                    projectName: currentTest.project_name,
                    previousResult: 'Not Present',
                    currentResult: currentTest.result
                });
            }
        }
    });

    previousTestResults.forEach(previousTest => {
        const key = `${previousTest.project_name}|${previousTest.class_name}|${previousTest.test_name}`;
        const currentTest = currentTestMap.get(key);

        if (!currentTest && previousTest.result === resultType) {
            deltaTests.push({
                testName: previousTest.test_name,
                className: previousTest.class_name,
                projectName: previousTest.project_name,
                previousResult: previousTest.result,
                currentResult: 'Not Present'
            });
        }
    });

    return deltaTests;
}

// Function to display the delta modal
function displayDeltaModal(resultType, deltaTests) {
    const modal = document.getElementById('deltaModal');
    const modalTitle = document.getElementById('deltaModalTitle');
    const modalBody = document.getElementById('deltaModalBody');
    const closeModal = document.getElementById('closeDeltaModal');

    // Set the title based on result type
    modalTitle.innerText = `Tests Contributing to ${capitalizeFirstLetter(resultType)} Delta`;

    // Clear previous content
    modalBody.innerHTML = '';

    if (deltaTests.length === 0) {
        modalBody.innerHTML = '<p>No changes in this category.</p>';
    } else {
        // Create a table to display the test details
        const table = document.createElement('table');
        table.classList.add('delta-table');
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Test Name</th>
                <th>Class Name</th>
                <th>Project</th>
                <th>Previous Result</th>
                <th>Current Result</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        deltaTests.forEach(test => {
            const row = document.createElement('tr');

            // Create table cells
            const testNameCell = document.createElement('td');
            testNameCell.classList.add('test-name');
            testNameCell.textContent = test.testName;
            testNameCell.title = test.testName;

            const classNameCell = document.createElement('td');
            classNameCell.textContent = test.className;

            const projectNameCell = document.createElement('td');
            projectNameCell.textContent = test.projectName;

            const previousResultCell = document.createElement('td');
            previousResultCell.textContent = test.previousResult;
            let statusClassForModalPreviousResult = getStatusClassForModal(test.previousResult);
            if (statusClassForModalPreviousResult !== '')
                previousResultCell.classList.add(statusClassForModalPreviousResult);

            const currentResultCell = document.createElement('td');
            currentResultCell.textContent = test.currentResult;
            let statusClassForModalCurrentResult = getStatusClassForModal(test.currentResult);
            if (statusClassForModalCurrentResult !== '')
                currentResultCell.classList.add(statusClassForModalCurrentResult);

            // Append cells to the row
            row.appendChild(testNameCell);
            row.appendChild(classNameCell);
            row.appendChild(projectNameCell);
            row.appendChild(previousResultCell);
            row.appendChild(currentResultCell);

            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        const tableContainer = document.createElement('div');
        tableContainer.classList.add('table-container');
        tableContainer.appendChild(table);
        modalBody.appendChild(tableContainer);
    }

    // Show the modal
    modal.style.display = 'block';

    // Close the modal when the user clicks the close button
    closeModal.onclick = () => {
        modal.style.display = 'none';
    };

    // Close the modal when the user clicks outside of the modal content
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    };
}

// Helper function to map result strings to CSS classes for the modal
function getStatusClassForModal(result) {
    switch(result.toLowerCase()) {
        case 'passed':
            return 'status-passed';
        case 'failed':
            return 'status-failed';
        case 'error':
            return 'status-error';
        case 'skipped':
            return 'status-skipped';
        default:
            return '';
    }
}

// Helper function to capitalize the first letter of a string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
