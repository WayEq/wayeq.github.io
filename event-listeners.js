// event-listeners.js

import {applyTestResultsFilters, displayTestResultsForExecution, populateSlowestTestsTable} from './test-results.js';
import { populateCommitDeltasTable } from './commit-deltas.js';
import { renderTestVelocityAndAuthorshipSection, resetAuthorshipDetailsTable } from "./test-authorship.js";
import { loadExecutionData } from "./data-fetching.js";
import { showDeltaDetails } from './test-results.js'; // Import the showDeltaDetails function


export function addSlowestTestsEventListeners(currentTestExecutionResultsData, executionFileName, testBranch) {
    // Event listener for the number of tests filter
    document.getElementById('slowestTestsCount').addEventListener('change', () => {
        // Call the function to repopulate the table when the filter changes
        populateSlowestTestsTable(currentTestExecutionResultsData, executionFileName, testBranch);
    });
    document.getElementById('filterSetupFixtures').addEventListener('change', () => {
        // Call the function to repopulate the table when the filter changes
        populateSlowestTestsTable(currentTestExecutionResultsData, executionFileName, testBranch);
    });
}

export function addTestExecutionResultEventListeners(executionIndexData, commitDeltaData) {
    const testRunSelect = document.getElementById('testRunSelect');

    // Add an event listener for when the user selects a different test run
    testRunSelect.addEventListener('change', (event) => {
        const selectElement = event.target;
        const currentSelectedIndex = selectElement.selectedIndex; // Get the index of the current selection
        const executionFileName = selectElement.value;

        // Get the previous option if it exists
        let previousFileName = null;
        if (currentSelectedIndex > 0) {
            previousFileName = selectElement.options[currentSelectedIndex - 1].value;
        }

        loadExecutionData(executionFileName).then(executionData => {
            displayTestResultsForExecution(executionFileName, previousFileName, executionIndexData, executionData).then(() => {
                // Update the commit deltas when the test run changes
                populateCommitDeltasTable(executionFileName, previousFileName, commitDeltaData).then(() => {
                    // After test results are displayed, add event listeners for the delta counts
                    addDeltaEventListeners();
                });
            });
        });
    });

    // Initial call to add event listeners when the page loads
    addDeltaEventListeners();

    // Event listeners for filters
    document.getElementById('resultFilter').addEventListener('change', () => {
        const executionFileName = testRunSelect.value;
        loadExecutionData(executionFileName).then(executionData => {
            applyTestResultsFilters(executionData, executionIndexData.filename);
        });
    });

    document.getElementById('projectNameFilter').addEventListener('change', () => {
        const executionFileName = testRunSelect.value;
        loadExecutionData(executionFileName).then(executionData => {
            applyTestResultsFilters(executionData, executionIndexData.filename);
        });
    });

    // Toggle buttons
    setupToggleButton('toggleDetailsButton', 'collapsibleContent', 'Show Test Results', 'Hide Test Results', 'fas fa-chevron-down');
    setupToggleButton('toggleCommitsButton', 'commitsCollapsibleContent', 'Show Commit Details', 'Hide Commit Details', 'fas fa-code-branch');
    setupToggleButton('toggleSlowestTestsButton', 'slowestTestsCollapsibleContent', 'Show Slowest Tests', 'Hide Slowest Tests', 'fas fa-hourglass-half');
}

// New function to add event listeners to delta counts
function addDeltaEventListeners() {
    // Get references to the delta elements
    const passedDelta = document.getElementById('passedDelta');
    const failedDelta = document.getElementById('failedDelta');
    const errorDelta = document.getElementById('errorDelta');
    const skippedDelta = document.getElementById('skippedDelta');

    // Add click event listeners if the elements exist
    if (passedDelta) {
        passedDelta.addEventListener('click', () => showDeltaDetails('passed'));
    }
    if (failedDelta) {
        failedDelta.addEventListener('click', () => showDeltaDetails('failed'));
    }
    if (errorDelta) {
        errorDelta.addEventListener('click', () => showDeltaDetails('error'));
    }
    if (skippedDelta) {
        skippedDelta.addEventListener('click', () => showDeltaDetails('skipped'));
    }
}

function getSelectedTimeWindow(timeWindowRadios) {
    let selectedTimeWindow = null; // Default to null if no radio button is selected
    for (const radio of timeWindowRadios) {
        if (radio.checked) {
            selectedTimeWindow = radio.value;
            break;
        }
    }
    return selectedTimeWindow;
}

export function addTestVelocityAndAuthorshipEventListeners(commitDeltaData, testAuthorshipData) {
    const authorFilter = document.getElementById('authorFilter');
    const projectFilter = document.getElementById('projectFilter');
    const timeWindowRadios = document.getElementsByName('timeWindow');

    // Event listeners for filters - only update the chart, not the details table
    authorFilter.addEventListener('change', (e) => {
        resetAuthorshipDetailsTable();
        let selectedTimeWindow = getSelectedTimeWindow(timeWindowRadios);
        renderTestVelocityAndAuthorshipSection(testAuthorshipData, e.target.value, projectFilter.value, selectedTimeWindow).then(() => { });
    });

    projectFilter.addEventListener('change', (e) => {
        resetAuthorshipDetailsTable();
        let selectedTimeWindow = getSelectedTimeWindow(timeWindowRadios);
        renderTestVelocityAndAuthorshipSection(testAuthorshipData, authorFilter.value, e.target.value, selectedTimeWindow).then(() => { });
    });

    // Add event listeners for when the time window changes
    timeWindowRadios.forEach(radio => {
        radio.addEventListener('change', e => {
            resetAuthorshipDetailsTable();
            let selectedTimeWindow = e.target.value;
            renderTestVelocityAndAuthorshipSection(testAuthorshipData, authorFilter.value, projectFilter.value, selectedTimeWindow).then(() => { });
        });
    });
}

// Function to initialize toggle buttons
function setupToggleButton(buttonId, contentId, showText, hideText, iconClass) {
    const button = document.getElementById(buttonId);
    const content = document.getElementById(contentId);

    // Initial button text based on content visibility
    if (content.classList.contains('expanded')) {
        button.innerHTML = `<i class="${iconClass}"></i> ${hideText}`;
    } else {
        button.innerHTML = `<i class="${iconClass}"></i> ${showText}`;
    }

    button.addEventListener('click', function() {
        content.classList.toggle('expanded');

        // Update the button text and icon
        if (content.classList.contains('expanded')) {
            button.innerHTML = `<i class="${iconClass}"></i> ${hideText}`;
        } else {
            button.innerHTML = `<i class="${iconClass}"></i> ${showText}`;
        }
    });
}
