// event-listeners.js

import { applyTestResultsFilters, displayTestResultsForExecution } from './test-results.js';
import { expandCollapsibleContent } from './utils.js';
import { populateCommitDeltasTable } from './commit-deltas.js';
import {renderTestVelocityAndAuthorshipSection, resetAuthorshipDetailsTable} from "./test-authorship.js";
import {loadExecutionData} from "./data-fetching.js";

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
                });
            });
        });
    });


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
    const toggleDetailsButton = document.getElementById('toggleDetailsButton');
    const collapsibleContent = document.getElementById('collapsibleContent');

    toggleDetailsButton.addEventListener('click', () => {
        if (collapsibleContent.classList.contains('expanded')) {
            // Collapse the content
            collapsibleContent.style.height = collapsibleContent.scrollHeight + 'px';
            collapsibleContent.offsetHeight; // Trigger reflow
            collapsibleContent.style.height = '0';
            collapsibleContent.classList.remove('expanded');
            toggleDetailsButton.textContent = 'Show Details';
        } else {
            collapsibleContent.classList.add('expanded');
            toggleDetailsButton.textContent = 'Hide Details';
            expandCollapsibleContent(collapsibleContent);
        }
    });

    // Add event listeners for the commit deltas toggle button
    const toggleCommitsButton = document.getElementById('toggleCommitsButton');
    const commitsCollapsibleContent = document.getElementById('commitsCollapsibleContent');

    toggleCommitsButton.addEventListener('click', () => {
        if (commitsCollapsibleContent.classList.contains('expanded')) {
            // Collapse the content
            commitsCollapsibleContent.style.height = commitsCollapsibleContent.scrollHeight + 'px';
            commitsCollapsibleContent.offsetHeight; // Trigger reflow
            commitsCollapsibleContent.style.height = '0';
            commitsCollapsibleContent.classList.remove('expanded');
            toggleCommitsButton.textContent = 'Show Commit Details';
        } else {
            // Expand the content
            commitsCollapsibleContent.classList.add('expanded');
            toggleCommitsButton.textContent = 'Hide Commit Details';
            expandCollapsibleContent(commitsCollapsibleContent);
        }
    });
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
        renderTestVelocityAndAuthorshipSection(testAuthorshipData, e.target.value, projectFilter.value, selectedTimeWindow).then(() => {} );

    });

    projectFilter.addEventListener('change', (e) => {
        resetAuthorshipDetailsTable();

        let selectedTimeWindow = getSelectedTimeWindow(timeWindowRadios);
        renderTestVelocityAndAuthorshipSection(testAuthorshipData, authorFilter.value, e.target.value, selectedTimeWindow).then(() => {} );
    });

    // Get references to the time window radio buttons

    // Add event listeners for when the time window changes
    timeWindowRadios.forEach(radio => {
        radio.addEventListener('change', e => {
            resetAuthorshipDetailsTable();
            renderTestVelocityAndAuthorshipSection(testAuthorshipData, authorFilter.value, projectFilter.value, e.target.value).then(() => {} );
        });
    });
}
