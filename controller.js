
let allTestResultsData = []; // Declare at the top
let previousTestResultsData = [];
let testResultsPieChart;
let testRunData = [];
let trendChart;

// Start functions


// Function to handle the trend chart
async function showTrendChart() {
    try {
        // Fetch the test_runs index
        const response = await fetch('test_results/test_results_index.json');
        const testRuns = await response.json();

        // Prepare data for the chart
        const labels = [];
        const passedData = [];
        const failedData = [];
        const errorData = [];
        const skippedData = [];

        // Sort the testRuns by execution_time
        testRuns.sort((a, b) => new Date(a.execution_time) - new Date(b.execution_time));

        testRuns.forEach(run => {
            labels.push(run.execution_time); // Use execution_time as label
            passedData.push(run.counts.passed);
            failedData.push(run.counts.failed);
            errorData.push(run.counts.error);
            skippedData.push(run.counts.skipped);
        });

        // Get the context of the canvas
        const ctx = document.getElementById('trendChart').getContext('2d');

        // If the chart already exists, destroy it before creating a new one
        if (trendChart) {
            trendChart.destroy();
        }

        // Create the line chart
        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Passed',
                        data: passedData,
                        borderColor: 'rgba(75, 192, 132, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false,
                        borderWidth: 2,
                        tension: 0.1
                    },
                    {
                        label: 'Failed',
                        data: failedData,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        fill: false,
                        borderWidth: 2,
                        tension: 0.1
                    },
                    {
                        label: 'Error',
                        data: errorData,
                        borderColor: 'rgba(255, 159, 64, 1)',
                        backgroundColor: 'rgba(255, 159, 64, 0.2)',
                        fill: false,
                        borderWidth: 2,
                        tension: 0.1
                    },
                    {
                        label: 'Skipped',
                        data: skippedData,
                        borderColor: 'rgba(201, 203, 207, 1)',
                        backgroundColor: 'rgba(201, 203, 207, 0.2)',
                        fill: false,
                        borderWidth: 2,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Execution Time'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Number of Tests'
                        },
                        beginAtZero: true
                    }
                },
	            plugins: {
	                legend: {
	                    position: 'bottom',
	                    labels: {
	                        font: {
	                            size: 12
	                        }
	                    }
	                }
                }
            }
        });

        // Show the chart container
        document.getElementById('trendChartContainer').style.display = 'block';
    } catch (error) {
        console.error('Error fetching trend data:', error);
    }
}



// Function to fetch and populate test runs
async function fetchTestRuns() {
    try {
        const response = await fetch('test_results/test_results_index.json');
        const testRuns = await response.json();
        testRunData = testRuns;

        // Populate the test run selection dropdown
        populateTestRunSelection(testRuns);

        // Load the latest test run by default
        if (testRuns.length > 0) {
            const latestTestRun = testRuns[testRuns.length - 1];
            fetchAndDisplayTestResults(latestTestRun.filename);
            showTrendChart();
        }
    } catch (error) {
        console.error('Error fetching test runs:', error);
    }
}

function populateTestRunSelection(testRuns) {
    const testRunSelect = document.getElementById('testRunSelect');
    testRunSelect.innerHTML = ''; // Clear existing options

    // Create an option for each test run
    testRuns.forEach((testRun, index) => {
        const option = document.createElement('option');
        option.value = testRun.filename;
        option.textContent = `${testRun.execution_time} (${testRun.test_branch})`;
        testRunSelect.appendChild(option);
    });

    // Set the selected option to the latest test run
    if (testRuns.length > 0) {
        testRunSelect.selectedIndex = testRuns.length - 1;
    }

    // Add an event listener for when the user selects a different test run
    testRunSelect.addEventListener('change', (event) => {
        const selectedFilename = event.target.value;
        fetchAndDisplayTestResults(selectedFilename);
    });
}

function createTestResultsPieChart(passed, failed, error, skipped) {
    const ctx = document.getElementById('testResultsPieChart').getContext('2d');

    if (testResultsPieChart) {
        // If the chart already exists, destroy it before creating a new one
        testResultsPieChart.destroy();
    }

    testResultsPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Passed', 'Failed', 'Error', 'Skipped'],
            datasets: [{
                data: [passed, failed, error, skipped],
                backgroundColor: [
                    '#28a745', // Passed - Green
                    '#dc3545', // Failed - Red
                    '#ffc107', // Error - Yellow
                    '#6c757d'  // Skipped - Gray
                ],
                borderColor: '#fff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 12
                        }
                    }
                }
            }
        }
    });
}

// Reset the details table to the default message
function resetDetailsTable() {
    const detailsTableBody = document.getElementById('detailsTable').getElementsByTagName('tbody')[0];
    detailsTableBody.innerHTML = '';
    const row = document.createElement('tr');
    const noDataCell = document.createElement('td');
    noDataCell.setAttribute('colspan', 5); // Updated colspan to 5 due to additional columns
    noDataCell.textContent = 'Please select a data point from the above graph to view details.';
    row.appendChild(noDataCell);
    detailsTableBody.appendChild(row);

    // Reset the details header
    document.getElementById('detailsHeader').textContent = 'Details for Selected Month';
}

// Highlight author row in the author test count table
function highlightAuthorRow(author) {
    // Remove previous highlights
    document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

    // Highlight the new author row
    const authorRow = document.getElementById(`author_${author.replace(/\s+/g, '_')}`);
    if (authorRow) {
        authorRow.classList.add('highlight');
        // Scroll to the highlighted row
        authorRow.scrollIntoView({ behavior: 'smooth' });
    }
}

// Update the chart data only, not the details table
function updateChart(monthlyData, chart, pieChart) {
    // Filter the data based on selected author and project
    const selectedAuthor = authorFilter.value;
    const selectedProject = projectFilter.value;

    const filteredData = monthlyData.map(item => {
        let integrationCount = 0;
        let unitCount = 0;

        const filteredIntegrationDetails = item.integration_details.filter(detail =>
            (selectedAuthor === 'all' || detail.author === selectedAuthor) &&
            (selectedProject === 'all' || detail.project === selectedProject)
        );
        const filteredUnitDetails = item.unit_details.filter(detail =>
            (selectedAuthor === 'all' || detail.author === selectedAuthor) &&
            (selectedProject === 'all' || detail.project === selectedProject)
        );

        integrationCount = filteredIntegrationDetails.length;
        unitCount = filteredUnitDetails.length;

        return {
            month: item.month,
            integration_count: integrationCount,
            unit_count: unitCount,
            integration_details: filteredIntegrationDetails,
            unit_details: filteredUnitDetails
        };
    });

    // Update chart data only

    // Filter out only leading months with no data
    const filteredDataWithoutLeadingZeros = removeLeadingEmptyMonths(filteredData);
    const filteredLabels = filteredDataWithoutLeadingZeros.map(item => {
        const [year, month] = item.month.split('-');
        const correctedMonth = String(Number(month)).padStart(2, '0');
        return `${year}-${correctedMonth}`;
    });
    chart.data.labels = filteredLabels;
    chart.data.datasets[0].data = filteredDataWithoutLeadingZeros.map(item => item.integration_count);
    chart.data.datasets[1].data = filteredDataWithoutLeadingZeros.map(item => item.unit_count);
    chart.options.onClick = (e) => {
        const activePoints = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
        if (activePoints.length > 0) {
            const { index, datasetIndex } = activePoints[0];

            // Get the selected month from filteredLabels
            const selectedMonth = filteredLabels[index];

            // Find the corresponding details in the filteredData
            const selectedTestType = datasetIndex === 0 ? 'integration' : 'unit';

            // Use the filteredData to get the details for the selected month
            const selectedDetails = filteredDataWithoutLeadingZeros.find(item => {
                const [year, month] = item.month.split('-');
                return `${year}-${String(Number(month)).padStart(2, '0')}` === selectedMonth;
            });

            // Populate the details table using the filtered data
            if (selectedDetails) {
                populateDetails(selectedMonth, selectedTestType, {
                    [selectedMonth]: selectedDetails
                });
            }
        }
    }
    chart.update();

    // Update the pie chart
    updatePieChart(filteredData, pieChart);
}

// Function to update the pie chart
function updatePieChart(filteredData, pieChart) {
    // Calculate total integration and unit tests from filteredData
    const totalIntegrationTests = filteredData.reduce((sum, item) => sum + item.integration_count, 0);
    const totalUnitTests = filteredData.reduce((sum, item) => sum + item.unit_count, 0);

    pieChart.data.datasets[0].data = [totalIntegrationTests, totalUnitTests];
    pieChart.update();
}

// Function to generate the class coverage URL
function generateCoverageUrl(testClass, packagePath) {
    // Remove the 'IT' or 'Test' suffix to get the class under test
    const classUnderTest = testClass.replace(/(IT|Test)$/, '');

    // Construct the URL
    const baseUrl = "https://metrics.devsnc.com/code?id=com.snc%3Asonar-glide-idr&branch=track%2Fidrhermes&selected=com.snc%3Asonar-glide-idr%3Amodules%2Fglide%2Fglide-idr%2Fsrc%2Fmain%2Fjava%2F";
    return `${baseUrl}${packagePath}%2F${classUnderTest}.java`;
}

// Update the function that populates the details table
function populateDetails(month, testType, details) {
    // Update the header to reflect the selected month
    const [year, month2] = month.split('-');  // Split the string into year and month parts
    const correctedDate = new Date(year, month2 - 1);  // month - 1 because JavaScript months are 0-based

    const formattedDate = correctedDate.toLocaleString('en-us', { month: 'long', year: 'numeric' });

    document.getElementById('detailsHeader').textContent = `${testType.charAt(0).toUpperCase() + testType.slice(1)} tests added in ${formattedDate}`;

    const detailsTableBody = document.getElementById('detailsTable').getElementsByTagName('tbody')[0];
    detailsTableBody.innerHTML = '';
    document.getElementById('noSelectionMessage')?.remove();
    const selectedDetails = details[month];
    if (selectedDetails) {
        let allDetails;
        if (testType === 'integration') {
            allDetails = selectedDetails.integration_details;
        } else if (testType === 'unit') {
            allDetails = selectedDetails.unit_details;
        } else {
            allDetails = [...selectedDetails.integration_details, ...selectedDetails.unit_details];
        }

        // Apply author and project filters
        const selectedAuthor = authorFilter.value;
        const selectedProject = projectFilter.value;
        if (selectedAuthor !== 'all') {
            allDetails = allDetails.filter(detail => detail.author === selectedAuthor);
        }
        if (selectedProject !== 'all') {
            allDetails = allDetails.filter(detail => detail.project === selectedProject);
        }

        if (allDetails.length > 0) {
            allDetails.forEach(detail => {
                const row = document.createElement('tr');
                const projectCell = document.createElement('td');
                projectCell.textContent = detail.project ? detail.project : '';
                const classCell = document.createElement('td');
                const classLink = document.createElement('a');
                const coverageCell = document.createElement('td');
                classLink.href = detail.project.includes('glide-idr') ? `https://code.devsnc.com/dev/glide/blob/track/idrhermes/${detail.project}/src/test/java/${detail.package}/${detail.class}.java` : `https://code.devsnc.com/dev/glide-test/blob/track/idrhermes/${detail.project}/src/test/java/${detail.package}/${detail.class}.java`;
                classLink.target = '_blank';
                classLink.textContent = detail.class;
                const coverageLink = document.createElement('a');
                const packagePath = detail.package; // Assuming package path is in the format required
                coverageLink.href = generateCoverageUrl(detail.class, packagePath);
                coverageLink.target = '_blank';
                coverageLink.textContent = "link";
                coverageCell.appendChild(coverageLink);
                classCell.appendChild(classLink);
                const testCell = document.createElement('td');
                testCell.textContent = detail.test;
                const authorCell = document.createElement('td');
                const authorLink = document.createElement('a');
                authorLink.href = `#author_${detail.author.replace(/\s+/g, '_')}`;
                authorLink.textContent = detail.author;
                authorLink.addEventListener('click', function() {
                    highlightAuthorRow(detail.author);
                });
                authorCell.appendChild(authorLink);
                row.appendChild(projectCell);
                row.appendChild(classCell);
                row.appendChild(coverageCell);
                row.appendChild(testCell);
                row.appendChild(authorCell);
                detailsTableBody.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            const noDataCell = document.createElement('td');
            noDataCell.setAttribute('colspan', 5); // Updated colspan to 5 due to additional columns
            noDataCell.textContent = 'No tests found for this month based on the current filters.';
            row.appendChild(noDataCell);
            detailsTableBody.appendChild(row);
        }
    }
}

function removeLeadingEmptyMonths(data) {
    let hasEncounteredData = false;
    return data.filter(item => {
        if (item.integration_count > 0 || item.unit_count > 0) {
            hasEncounteredData = true;  // Start keeping months once data is found
        }
        return hasEncounteredData;
    });
}

// Function to populate the latest tests list
function populateLatestTests(testMetadata) {
    const latestTestsList = document.getElementById('latestTestsList');
    latestTestsList.innerHTML = ''; // Clear existing list

    // Sort the tests by timestamp descending
    const sortedTests = [...testMetadata].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Get the last 5 tests
    const latestTests = sortedTests.slice(0, 5);

    latestTests.forEach(test => {
        const listItem = document.createElement('li');
        listItem.classList.add('latest-test-item');

        // Create elements for test name, class, author, and timestamp
        const testName = document.createElement('span');
        testName.classList.add('test-name');
        testName.textContent = test.test;

        const className = document.createElement('span');
        className.classList.add('class-name');
        className.textContent = ` (${test.class})`;

        const authorName = document.createElement('span');
        authorName.classList.add('author-name');
        authorName.textContent = ` by ${test.author}`;

        const timestamp = document.createElement('span');
        timestamp.classList.add('timestamp');
        timestamp.textContent = ` on ${test.timestamp}`;

        // Create hyperlink only for the test name or class
        const testLink = document.createElement('a');
        testLink.href = test.project.includes('glide-idr')
            ? `https://code.devsnc.com/dev/glide/blob/track/idrhermes/${test.project}/src/test/java/${test.package}/${test.class}.java`
            : `https://code.devsnc.com/dev/glide-test/blob/track/idrhermes/${test.project}/src/test/java/${test.package}/${test.class}.java`;
        testLink.target = '_blank';
        testLink.textContent = test.test;
        testName.innerHTML = ''; // Clear textContent to insert link
        testName.appendChild(testLink);

        // Append elements to the list item
        listItem.appendChild(testName);
        listItem.appendChild(className);
        listItem.appendChild(authorName);
        listItem.appendChild(timestamp);

        latestTestsList.appendChild(listItem);
    });
}
async function fetchAndDisplayTestResults(filename) {
    try {
        // Find the index of the selected test run
        const selectedRunIndex = testRunData.findIndex(run => run.filename === filename);

        // Identify the previous test run (if available)
        let previousRunFilename = null;
        if (selectedRunIndex > 0) {
            previousRunFilename = testRunData[selectedRunIndex - 1].filename;
        }

        // Fetch the current test run data
        const response = await fetch(`test_results/${filename}`);
        const testResultsData = await response.json();

        // Fetch the previous test run data if available
        if (previousRunFilename) {
            const prevResponse = await fetch(`test_results/${previousRunFilename}`);
            const prevTestResultsData = await prevResponse.json();
            previousTestResultsData = prevTestResultsData.test_results;
        } else {
            previousTestResultsData = []; // No previous data available
        }

        // Extract metadata
        const executionTime = testResultsData.execution_time;
        const testBranch = testResultsData.test_branch;
        const testResults = testResultsData.test_results; // The array of test results

        // Process the test results data
        processTestResultsData(testResults);

        // Display metadata in the UI
        displayTestMetadata(executionTime, testBranch);
    } catch (error) {
        console.error('Error fetching test results:', error);
    }
}



function expandCollapsibleContent() {
    // Set the height to the scrollHeight
    collapsibleContent.style.height = collapsibleContent.scrollHeight + 'px';

    // After the transition ends, set the height to 'auto'
    collapsibleContent.addEventListener('transitionend', function handler() {
        collapsibleContent.style.height = 'auto';
        collapsibleContent.removeEventListener('transitionend', handler);
    });
}

// Function to process and display the test results data
function processTestResultsData(testResultsData) {
    allTestResultsData = testResultsData; // Store current test run data

    // Calculate counts for current test run
    const currentCounts = calculateTestCounts(allTestResultsData);

    // Calculate counts for previous test run (if available)
    let previousCounts = null;
    if (previousTestResultsData && previousTestResultsData.length > 0) {
        previousCounts = calculateTestCounts(previousTestResultsData);
    }

    // Proceed to update the test results summary with counts and deltas
    updateTestResultsSummary(currentCounts, previousCounts);

    // By default, show only failed and errored tests
    const defaultFilteredData = allTestResultsData.filter(test => test.result === 'failed' || test.result === 'error');

    // Populate the test results table with filtered data
    populateTestResultsTable(defaultFilteredData);

    // Populate the project filter options
    populateTestResultsFilters(allTestResultsData);
}

function calculateTestCounts(testData) {
    return {
        passed: testData.filter(test => test.result === 'passed').length,
        failed: testData.filter(test => test.result === 'failed').length,
        error: testData.filter(test => test.result === 'error').length,
        skipped: testData.filter(test => test.result === 'skipped').length
    };
}

function displayTestMetadata(executionTime, testBranch) {
    const metadataContainer = document.getElementById('testMetadata');

    // Format the execution time (optional)
    const formattedExecutionTime = new Date(executionTime).toLocaleString();

    // Update the content
    metadataContainer.innerHTML = `
        <p><strong><i class="far fa-clock"></i> Execution Time:</strong> ${formattedExecutionTime}</p>
        <p><strong><i class="fas fa-code-branch"></i> Test Branch:</strong> ${testBranch}</p>
    `;
}
// Function to populate the test results filters
function populateTestResultsFilters(testResultsData) {
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

function updateTestResultsSummary(currentCounts, previousCounts) {
    // Update counts
    document.getElementById('passedCount').innerHTML = formatCountWithDelta(currentCounts.passed, previousCounts ? previousCounts.passed : null);
    document.getElementById('failedCount').innerHTML = formatCountWithDelta(currentCounts.failed, previousCounts ? previousCounts.failed : null);
    document.getElementById('errorCount').innerHTML = formatCountWithDelta(currentCounts.error, previousCounts ? previousCounts.error : null);
    document.getElementById('skippedCount').innerHTML = formatCountWithDelta(currentCounts.skipped, previousCounts ? previousCounts.skipped : null);

    // Create or update the pie chart
    createTestResultsPieChart(currentCounts.passed, currentCounts.failed, currentCounts.error, currentCounts.skipped);
}

function formatCountWithDelta(currentCount, previousCount) {
    if (previousCount === null) {
        // No previous data, just display the current count
        return `${currentCount}`;
    }

    const delta = currentCount - previousCount;
    let deltaSymbol = '';
    let deltaClass = '';

    if (delta > 0) {
        deltaSymbol = `&uarr; ${delta}`;
        deltaClass = 'delta-up';
    } else if (delta < 0) {
        deltaSymbol = `&darr; ${Math.abs(delta)}`;
        deltaClass = 'delta-down';
    } else {
        deltaSymbol = `&ndash; 0`;
        deltaClass = 'delta-same';
    }

    return `${currentCount} <span class="delta ${deltaClass}">${deltaSymbol}</span>`;
}


// Function to populate the test results table
function populateTestResultsTable(testResultsData) {
    const tableBody = document.querySelector('#testResultsTable tbody');
    tableBody.innerHTML = ''; // Clear existing rows

    // Group the data by project
    const projectGroups = groupBy(testResultsData, 'project_name');

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
                            '&test=' + encodeURIComponent(test.test_name),
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

// Helper function to group data by a key
function groupBy(array, key) {
    return array.reduce((result, currentItem) => {
        const groupKey = currentItem[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(currentItem);
        return result;
    }, {});
}


function applyTestResultsFilters() {
    const selectedResult = document.getElementById('resultFilter').value;
    const selectedProject = document.getElementById('projectNameFilter').value;

    let filteredData = allTestResultsData;

    if (selectedResult !== 'all') {
        filteredData = filteredData.filter(test => test.result === "failed" || test.result === "error");
    }

    if (selectedProject !== 'all') {
        filteredData = filteredData.filter(test => test.project_name === selectedProject);
    }

    // Update the summary and table with the filtered data
    populateTestResultsTable(filteredData);
}
// end functions

// Load the JSON data from the file
console.log('Starting data load...');
fetch('test_analysis_results.json')
    .then(response => {
        console.log('Response received:', response);
        return response.json();
    })
    .then(data => {
        console.log('Data loaded:', data);
        // Extract the data from the new format
        const testMetadata = data.test_metadata;
        const monthlyAggregates = data.monthly_aggregates;
        const authorTestCountData = data.author_test_count;

        // Process testMetadata to create per-month test details
        const monthlyDetails = {};

        testMetadata.forEach(test => {
            // Use the test_type field directly
            const testType = test.test_type; // 'integration' or 'unit'

            // Extract month from timestamp
            const timestamp = test.timestamp; // e.g., "2024-05-13"
            const month = timestamp.slice(0, 7); // "2024-05"

            // Initialize the month in monthlyDetails if not already
            if (!monthlyDetails[month]) {
                monthlyDetails[month] = {
                    integration_details: [],
                    unit_details: []
                };
            }

            if (testType === 'integration') {
                monthlyDetails[month].integration_details.push(test);
            } else if (testType === 'unit') {
                monthlyDetails[month].unit_details.push(test);
            }
        });

        // Now, create 'monthlyData' array similar to the old format
        const monthlyData = monthlyAggregates.map(aggregate => {
            const month = aggregate.month;
            const integration_details = monthlyDetails[month]?.integration_details || [];
            const unit_details = monthlyDetails[month]?.unit_details || [];

            return {
                month: month,
                integration_count: integration_details.length,
                unit_count: unit_details.length,
                integration_details: integration_details,
                unit_details: unit_details
            };
        });

        const labels = monthlyData.map(item => {
            const [year, month] = item.month.split('-');
            const correctedMonth = String(Number(month)).padStart(2, '0');
            return `${year}-${correctedMonth}`;
        });

        console.log('Labels:', labels);
        const integrationCounts = monthlyData.map(item => item.integration_count);
        console.log('Integration Counts:', integrationCounts);
        const unitCounts = monthlyData.map(item => item.unit_count);
        console.log('Unit Counts:', unitCounts);
        const details = monthlyData.reduce((acc, item) => {
            acc[item.month] = {
                integration_details: item.integration_details,
                unit_details: item.unit_details
            };
            return acc;
        }, {});

        // Populate the filters
        const authorFilter = document.getElementById('authorFilter');
        const projectFilter = document.getElementById('projectFilter');
        const allAuthors = new Set();
        const allProjects = new Set();

        // Use testMetadata to get all authors and projects
        testMetadata.forEach(detail => {
            allAuthors.add(detail.author);
            allProjects.add(detail.project);
        });

        Array.from(allAuthors).sort().forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            option.textContent = author;
            authorFilter.appendChild(option);
        });

        Array.from(allProjects).sort().forEach(project => {
            const option = document.createElement('option');
            option.value = project;
            option.textContent = project;
            projectFilter.appendChild(option);
        });

        // Calculate total number of tests
        const totalIntegrationTests = integrationCounts.reduce((a, b) => a + b, 0);
        const totalUnitTests = unitCounts.reduce((a, b) => a + b, 0);
        const totalTests = totalIntegrationTests + totalUnitTests;

        // Update the header with the total number of tests
        document.getElementById('totalTests').textContent =
            `Total Number of Existing Tests: ${totalTests} (Integration: ${totalIntegrationTests}, Unit: ${totalUnitTests})`;

        // Create the line chart
        const ctx = document.getElementById('testChart').getContext('2d');
        console.log('Initializing chart with labels:', labels);
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Integration Tests Added',
                        data: integrationCounts,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: ctx.createLinearGradient(0, 0, 0, 450),
                        fill: true,
                        borderWidth: 3,
                        tension: 0.4,
                        pointStyle: 'circle',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        trendlineLinear: {
                            style: "rgba(75, 192, 192, .8)",
                            lineStyle: "dotted",
                            width: 2
                        }
                    },
                    {
                        label: 'Unit Tests Added',
                        data: unitCounts,
                        borderColor: 'rgba(255, 99, 132, 1)',
                        backgroundColor: ctx.createLinearGradient(0, 0, 0, 450),
                        fill: true,
                        borderWidth: 3,
                        tension: 0.4,
                        pointStyle: 'circle',
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        trendlineLinear: {
                            style: "rgba(255, 99, 132, .8)",
                            lineStyle: "dotted",
                            width: 2
                        }
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    }
                },
                onClick: (e) => {
                    const activePoints = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                    if (activePoints.length > 0) {
                        const { index, datasetIndex } = activePoints[0];
                        const selectedMonth = labels[index];
                        const selectedTestType = datasetIndex === 0 ? 'integration' : 'unit';
                        populateDetails(selectedMonth, selectedTestType, details);
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Month',
                            font: {
                                size: 16
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Tests Added',
                            font: {
                                size: 16
                            }
                        },
                        beginAtZero: true
                    }
                }
            }
        });


		// Create the pie chart with the title
		const pieCtx = document.getElementById('pieChart').getContext('2d');
		const pieChart = new Chart(pieCtx, {
		    type: 'pie',
		    data: {
		        labels: ['Integration Tests', 'Unit Tests'],
		        datasets: [{
		            data: [totalIntegrationTests, totalUnitTests],
		            backgroundColor: [
		                'rgba(75, 192, 192, 0.6)',
		                'rgba(255, 99, 132, 0.6)'
		            ],
		            borderColor: [
		                'rgba(75, 192, 192, 1)',
		                'rgba(255, 99, 132, 1)'
		            ],
		            borderWidth: 1
		        }]
		    },
		    options: {
		        responsive: true,
		        maintainAspectRatio: false,
		        plugins: {
		            legend: {
		                position: 'right',
		                labels: {
		                    font: {
		                        size: 14
		                    }
		                }
		            },
		            title: {
		                display: true,
		                text: 'Test Distribution',
		                font: {
		                    size: 18,
		                    family: "'Roboto', sans-serif", // Optional: Match your page font
		                    weight: 'bold' // Optional: Make the title bold
		                },
		                padding: {
		                    top: 10,
		                    bottom: 30
		                },
		                color: '#333' // Optional: Set the color of the title text
		            }
		        }
		    }
		});



        // Populate author test count table
        if (authorTestCountData) {
            const authorTableBody = document.getElementById('authorTable').getElementsByTagName('tbody')[0];
            authorTableBody.innerHTML = '';
            for (const [author, count] of Object.entries(authorTestCountData)) {
                const row = document.createElement('tr');
                row.id = `author_${author.replace(/\s+/g, '_')}`;
                const authorCell = document.createElement('td');
                authorCell.textContent = author;
                const countCell = document.createElement('td');
                countCell.textContent = count;
                row.appendChild(authorCell);
                row.appendChild(countCell);
                authorTableBody.appendChild(row);
            }
        }

        // Populate the latest tests list
        populateLatestTests(testMetadata);

        // Event listeners for filters - only update the chart, not the details table
        authorFilter.addEventListener('change', () => {
            resetDetailsTable();
            updateChart(monthlyData, chart, pieChart);
        });

        projectFilter.addEventListener('change', () => {
            resetDetailsTable();
            updateChart(monthlyData, chart, pieChart);
        });

    })
    .catch(error => console.error('Error loading JSON data:', error));

document.getElementById('resultFilter').addEventListener('change', applyTestResultsFilters);
document.getElementById('projectNameFilter').addEventListener('change', applyTestResultsFilters);
//document.getElementById('showTrendButton').addEventListener('click', showTrendChart);

// Call fetchTestRuns when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchTestRuns();
});


// Get references to the toggle button and collapsible content
const toggleDetailsButton = document.getElementById('toggleDetailsButton');
const collapsibleContent = document.getElementById('collapsibleContent');

// Flag to track if test results have been loaded
let testResultsLoaded = false;

testResultsLoaded = true;

// Add event listener to the toggle button
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
        expandCollapsibleContent();
    }
});

