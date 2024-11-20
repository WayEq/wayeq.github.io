// // controller.js
//
// let allTestResultsData = []; // Declare at the top
// let previousTestResultsData = [];
// let testResultsPieChart;
// let testRunIndexData = [];
// let trendChart;
// let previousRunFilename = null;
//
// // Add a variable to store the commit deltas data
// let commitDeltasData = [];
//
// // Utility function to get URL parameters as an object.
// function getUrlParameters() {
//     const params = {};
//     const queryString = window.location.search.substring(1);
//     const pairs = queryString.split('&');
//     for (let pair of pairs) {
//         if (pair === "") continue;
//         const [key, value] = pair.split('=').map(decodeURIComponent);
//         params[key] = value;
//     }
//     return params;
// }
//
// /**
//  * Returns the ordinal suffix for a given day.
//  */
// function getOrdinalSuffix(day) {
//     if (day > 3 && day < 21) return 'th';
//     switch (day % 10) {
//         case 1:  return "st";
//         case 2:  return "nd";
//         case 3:  return "rd";
//         default: return "th";
//     }
// }
//
// /**
//  * Function to handle the trend chart
//  */
// async function showTestResultTrendChart() {
//     try {
//         // Fetch the test_runs index
//         const response = await fetch('test_results/test_results_index.json');
//         const testRuns = await response.json();
//
//         // Prepare data for the chart
//         const labels = [];
//         const passedData = [];
//         const failedData = [];
//         const errorData = [];
//         const skippedData = [];
//
//         // Sort the testRuns by execution_time
//         testRuns.sort((a, b) => new Date(a.execution_time) - new Date(b.execution_time));
//
//         testRuns.forEach(run => {
//             const date = new Date(run.execution_time);
//             const month = date.toLocaleString('default', { month: 'short' }); // e.g., 'Nov'
//             const day = date.getDate();
//             const ordinal = getOrdinalSuffix(day);
//             const hours = date.getHours();
//             const minutes = date.getMinutes().toString().padStart(2, '0');
//             const ampm = hours >= 12 ? 'pm' : 'am';
//             const formattedHours = hours % 12 || 12; // Convert to 12-hour format
//             const formattedDate = `${month} ${day}${ordinal}, ${formattedHours}:${minutes}${ampm}`;
//             labels.push(formattedDate);
//             passedData.push(run.counts.passed);
//             failedData.push(run.counts.failed);
//             errorData.push(run.counts.error);
//             skippedData.push(run.counts.skipped);
//         });
//
//         // Get the context of the canvas
//         const ctx = document.getElementById('testResultsTrendChart').getContext('2d');
//
//         // If the chart already exists, destroy it before creating a new one
//         if (trendChart) {
//             trendChart.destroy();
//         }
//
//         // Create the line chart
//         trendChart = new Chart(ctx, {
//             type: 'line',
//             data: {
//                 labels: labels,
//                 datasets: [
//                     {
//                         label: 'Failed',
//                         data: failedData,
//                         borderColor: 'rgba(255, 99, 132, 1)',
//                         backgroundColor: 'rgba(255, 99, 132, 0.2)',
//                         fill: false,
//                         borderWidth: 2,
//                         tension: 0.1
//                     },
//                     {
//                         label: 'Error',
//                         data: errorData,
//                         borderColor: 'rgba(255, 159, 64, 1)',
//                         backgroundColor: 'rgba(255, 159, 64, 0.2)',
//                         fill: false,
//                         borderWidth: 2,
//                         tension: 0.1
//                     },
//                     {
//                         label: 'Skipped',
//                         data: skippedData,
//                         borderColor: 'rgba(201, 203, 207, 1)',
//                         backgroundColor: 'rgba(201, 203, 207, 0.2)',
//                         fill: false,
//                         borderWidth: 2,
//                         tension: 0.1
//                     }
//                 ]
//             },
//             options: {
//                 responsive: true,
//                 scales: {
//                     x: {
//                         display: true,
//                     },
//                     y: {
//                         display: true,
//                         title: {
//                             display: true,
//                             text: 'Number of Tests'
//                         },
//                         beginAtZero: true
//                     }
//                 },
//                 plugins: {
//                     title: {
//                         display: true,
//                         text: 'Test Issues Trend',
//                         font: {
//                             size: 18,
//                             weight: 'bold'
//                         },
//                         padding: {
//                             top: 10,
//                             bottom: 30
//                         },
//                         color: '#333'
//                     },
//                     legend: {
//                         position: 'bottom',
//                         labels: {
//                             font: {
//                                 size: 12
//                             }
//                         }
//                     }
//                 }
//             }
//         });
//
//     } catch (error) {
//         console.error('Error fetching trend data:', error);
//     }
// }
//
// // Function to fetch and populate test runs
// async function fetchTestRuns(desiredExecution = null) {
//     try {
//         const response = await fetch('test_results/test_results_index.json');
//         const testRuns = await response.json();
//         testRunData = testRuns;
//
//         // Populate the test run selection dropdown
//         populateTestRunSelection(testRuns, desiredExecution);
//
//         // If desiredExecution is not set, load the latest test run by default
//         if (!desiredExecution && testRuns.length > 0) {
//             const latestTestRun = testRuns[testRuns.length - 1];
//             fetchAndDisplayTestResults(latestTestRun.filename);
//         }
//         showTestResultTrendChart();
//     } catch (error) {
//         console.error('Error fetching test runs:', error);
//     }
// }
//
// function populateTestRunSelection(testRuns, desiredExecution) {
//     const testRunSelect = document.getElementById('testRunSelect');
//     testRunSelect.innerHTML = ''; // Clear existing options
//
//     // Create an option for each test run
//     testRuns.forEach((testRun, index) => {
//         const option = document.createElement('option');
//         option.value = testRun.filename;
//         option.textContent = `${testRun.execution_time} (${testRun.test_branch})`;
//         testRunSelect.appendChild(option);
//     });
//
//     // Add an event listener for when the user selects a different test run
//     testRunSelect.addEventListener('change', (event) => {
//         const selectedFilename = event.target.value;
//         fetchAndDisplayTestResults(selectedFilename);
//         // Update the commit deltas when the test run changes
//         populateCommitDeltasTable(selectedFilename);
//     });
//
//     // If desiredExecution is specified and exists, set it as selected
//     if (desiredExecution) {
//         const desiredOption = Array.from(testRunSelect.options).find(option => option.value === desiredExecution);
//         if (desiredOption) {
//             testRunSelect.value = desiredExecution;
//             fetchAndDisplayTestResults(desiredExecution);
//             // Update commit deltas
//             populateCommitDeltasTable(desiredExecution);
//         } else {
//             console.warn(`Desired execution "${desiredExecution}" not found. Loading the latest test run instead.`);
//             if (testRuns.length > 0) {
//                 const latestTestRun = testRuns[testRuns.length - 1];
//                 testRunSelect.value = latestTestRun.filename;
//                 fetchAndDisplayTestResults(latestTestRun.filename);
//                 // Update commit deltas
//                 populateCommitDeltasTable(latestTestRun.filename);
//                 showTestResultTrendChart();
//             }
//         }
//     } else {
//         // If no desiredExecution, set the selected option to the latest test run
//         if (testRuns.length > 0) {
//             testRunSelect.selectedIndex = testRuns.length - 1;
//             // Update commit deltas
//             const latestTestRun = testRuns[testRuns.length - 1];
//             populateCommitDeltasTable(latestTestRun.filename);
//         }
//     }
// }
//
// function createTestResultsPieChart(passed, failed, error, skipped) {
//     const ctx = document.getElementById('testResultsPieChart').getContext('2d');
//
//     if (testResultsPieChart) {
//         // If the chart already exists, destroy it before creating a new one
//         testResultsPieChart.destroy();
//     }
//
//     testResultsPieChart = new Chart(ctx, {
//         type: 'pie',
//         data: {
//             labels: ['Passed', 'Failed', 'Error', 'Skipped'],
//             datasets: [{
//                 data: [passed, failed, error, skipped],
//                 backgroundColor: [
//                     '#28a745', // Passed - Green
//                     '#dc3545', // Failed - Red
//                     '#ffc107', // Error - Yellow
//                     '#6c757d'  // Skipped - Gray
//                 ],
//                 borderColor: '#fff',
//                 borderWidth: 1
//             }]
//         },
//         options: {
//             responsive: true,
//             maintainAspectRatio: false,
//             plugins: {
//                 title: {
//                     display: true,
//                     text: 'Test Results Distribution',
//                     font: {
//                         size: 18,
//                         weight: 'bold'
//                     },
//                     padding: {
//                         top: 10,
//                         bottom: 30
//                     },
//                     color: '#333'
//                 },
//                 legend: {
//                     position: 'bottom',
//                     labels: {
//                         font: {
//                             size: 12
//                         }
//                     }
//                 }
//             }
//         }
//     });
// }
//
// // Function to reset the details table
// function resetDetailsTable() {
//     const detailsTableBody = document.getElementById('detailsTable').getElementsByTagName('tbody')[0];
//     detailsTableBody.innerHTML = '';
//     const row = document.createElement('tr');
//     const noDataCell = document.createElement('td');
//     noDataCell.setAttribute('colspan', 5);
//     noDataCell.textContent = 'Please select a data point from the above graph to view details.';
//     row.appendChild(noDataCell);
//     detailsTableBody.appendChild(row);
//
//     // Reset the details header
//     document.getElementById('detailsHeader').textContent = 'Details for Selected Month';
// }
//
// // Function to highlight an author row
// function highlightAuthorRow(author) {
//     // Remove previous highlights
//     document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
//
//     // Highlight the new author row
//     const authorRow = document.getElementById(`author_${author.replace(/\s+/g, '_')}`);
//     if (authorRow) {
//         authorRow.classList.add('highlight');
//         // Scroll to the highlighted row
//         authorRow.scrollIntoView({ behavior: 'smooth' });
//     }
// }
//
// // Update the chart data only, not the details table
// function updateChart(monthlyData, chart, pieChart) {
//     const selectedAuthor = document.getElementById('authorFilter').value;
//     const selectedProject = document.getElementById('projectFilter').value;
//
//     // Get the selected time window from the radio buttons
//     const selectedTimeWindow = document.querySelector('input[name="timeWindow"]:checked').value;
//
//
//     const now = new Date();
//     let startDate;
//
//     // Determine the start date based on selected time window
//     switch (selectedTimeWindow) {
//         case 'last_6_months':
//             startDate = new Date(now);
//             startDate.setMonth(startDate.getMonth() - 6);
//             break;
//         case 'last_year': // Handling 'Last Year'
//             startDate = new Date(now);
//             startDate.setFullYear(startDate.getFullYear() - 1);
//             break;
//         case 'all':
//         default:
//             startDate = new Date(0); // Set to earliest possible date
//             break;
//     }
//
//     const filteredData = monthlyData
//         .filter(item => {
//             // Convert month string to a date object (assuming format 'YYYY-MM')
//             const [year, month] = item.month.split('-');
//             const itemDate = new Date(year, month); // Months are 0-indexed in JS Date
//             return itemDate >= startDate;
//         })
//         .map(item => {
//             let integrationCount = 0;
//             let unitCount = 0;
//
//             const filteredIntegrationDetails = item.integration_details.filter(detail =>
//                 (selectedAuthor === 'all' || detail.author === selectedAuthor) &&
//                 (selectedProject === 'all' || detail.project === selectedProject)
//             );
//             const filteredUnitDetails = item.unit_details.filter(detail =>
//                 (selectedAuthor === 'all' || detail.author === selectedAuthor) &&
//                 (selectedProject === 'all' || detail.project === selectedProject)
//             );
//
//             integrationCount = filteredIntegrationDetails.length;
//             unitCount = filteredUnitDetails.length;
//
//             return {
//                 month: item.month,
//                 integration_count: integrationCount,
//                 unit_count: unitCount,
//                 integration_details: filteredIntegrationDetails,
//                 unit_details: filteredUnitDetails
//             };
//         });
//
//     // Update chart data only
//
//     // Filter out only leading months with no data
//     const filteredDataWithoutLeadingZeros = removeLeadingEmptyMonths(filteredData);
//     const filteredLabels = filteredDataWithoutLeadingZeros.map(item => {
//         const [year, month] = item.month.split('-');
//         const correctedMonth = String(Number(month)).padStart(2, '0');
//         return `${year}-${correctedMonth}`;
//     });
//     chart.data.labels = filteredLabels;
//     chart.data.datasets[0].data = filteredDataWithoutLeadingZeros.map(item => item.integration_count);
//     chart.data.datasets[1].data = filteredDataWithoutLeadingZeros.map(item => item.unit_count);
//     chart.options.onClick = (e) => {
//         const activePoints = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
//         if (activePoints.length > 0) {
//             const { index, datasetIndex } = activePoints[0];
//
//             // Get the selected month from filteredLabels
//             const selectedMonth = filteredLabels[index];
//
//             // Find the corresponding details in the filteredData
//             const selectedTestType = datasetIndex === 0 ? 'integration' : 'unit';
//
//             // Use the filteredData to get the details for the selected month
//             const selectedDetails = filteredDataWithoutLeadingZeros.find(item => {
//                 const [year, month] = item.month.split('-');
//                 return `${year}-${String(Number(month)).padStart(2, '0')}` === selectedMonth;
//             });
//
//             // Populate the details table using the filtered data
//             if (selectedDetails) {
//                 populateDetails(selectedMonth, selectedTestType, {
//                     [selectedMonth]: selectedDetails
//                 });
//             }
//         }
//     }
//     chart.update();
//
//     updateTestTypesPieChart(filteredData, pieChart);
// }
//
//
// // Function to expand collapsible content
// function expandCollapsibleContent(contentElement) {
//     // Set the height to the scrollHeight
//     contentElement.style.height = contentElement.scrollHeight + 'px';
//
//     // After the transition ends, set the height to 'auto'
//     contentElement.addEventListener('transitionend', function handler() {
//         contentElement.style.height = 'auto';
//         contentElement.removeEventListener('transitionend', handler);
//     });
// }
//
//
// // Update the function that populates the details table
// function populateDetails(month, testType, details) {
//     // Update the header to reflect the selected month
//     const [year, month2] = month.split('-');  // Split the string into year and month parts
//     const correctedDate = new Date(year, month2 - 1);  // month - 1 because JavaScript months are 0-based
//
//     const formattedDate = correctedDate.toLocaleString('en-us', { month: 'long', year: 'numeric' });
//
//     document.getElementById('detailsHeader').textContent = `${testType.charAt(0).toUpperCase() + testType.slice(1)} tests added in ${formattedDate}`;
//
//     const detailsTableBody = document.getElementById('detailsTable').getElementsByTagName('tbody')[0];
//     detailsTableBody.innerHTML = '';
//     document.getElementById('noSelectionMessage')?.remove();
//     const selectedDetails = details[month];
//     if (selectedDetails) {
//         let allDetails;
//         if (testType === 'integration') {
//             allDetails = selectedDetails.integration_details;
//         } else if (testType === 'unit') {
//             allDetails = selectedDetails.unit_details;
//         } else {
//             allDetails = [...selectedDetails.integration_details, ...selectedDetails.unit_details];
//         }
//
//         // Apply author and project filters
//         const selectedAuthor = authorFilter.value;
//         const selectedProject = projectFilter.value;
//         if (selectedAuthor !== 'all') {
//             allDetails = allDetails.filter(detail => detail.author === selectedAuthor);
//         }
//         if (selectedProject !== 'all') {
//             allDetails = allDetails.filter(detail => detail.project === selectedProject);
//         }
//
//         if (allDetails.length > 0) {
//             allDetails.forEach(detail => {
//                 const row = document.createElement('tr');
//                 const projectCell = document.createElement('td');
//                 projectCell.textContent = detail.project ? detail.project : '';
//                 const classCell = document.createElement('td');
//                 const classLink = document.createElement('a');
//                 const coverageCell = document.createElement('td');
//                 const packagePath = detail.package; // Assuming package path is in the format required
//                 classLink.href = detail.project.includes('glide-idr') ? `https://code.devsnc.com/dev/glide/blob/track/idrhermes/${detail.project}/src/test/java/${detail.package}/${detail.class}.java` : `https://code.devsnc.com/dev/glide-test/blob/track/idrhermes/${detail.project}/src/test/java/${detail.package}/${detail.class}.java`;
//                 classLink.target = '_blank';
//                 classLink.textContent = detail.class;
//                 const coverageLink = document.createElement('a');
//                 coverageLink.href = generateCoverageUrl(detail.class, packagePath);
//                 coverageLink.target = '_blank';
//                 coverageLink.textContent = "link";
//                 coverageCell.appendChild(coverageLink);
//                 classCell.appendChild(classLink);
//                 const testCell = document.createElement('td');
//                 testCell.textContent = detail.test;
//                 const authorCell = document.createElement('td');
//                 const authorLink = document.createElement('a');
//                 authorLink.href = `#author_${detail.author.replace(/\s+/g, '_')}`;
//                 authorLink.textContent = detail.author;
//                 authorLink.addEventListener('click', function() {
//                     highlightAuthorRow(detail.author);
//                 });
//                 authorCell.appendChild(authorLink);
//                 row.appendChild(projectCell);
//                 row.appendChild(classCell);
//                 row.appendChild(coverageCell);
//                 row.appendChild(testCell);
//                 row.appendChild(authorCell);
//                 detailsTableBody.appendChild(row);
//             });
//         } else {
//             const row = document.createElement('tr');
//             const noDataCell = document.createElement('td');
//             noDataCell.setAttribute('colspan', 5); // Updated colspan to 5 due to additional columns
//             noDataCell.textContent = 'No tests found for this month based on the current filters.';
//             row.appendChild(noDataCell);
//             detailsTableBody.appendChild(row);
//         }
//     }
// }
//
// function removeLeadingEmptyMonths(data) {
//     let hasEncounteredData = false;
//     return data.filter(item => {
//         if (item.integration_count > 0 || item.unit_count > 0) {
//             hasEncounteredData = true;  // Start keeping months once data is found
//         }
//         return hasEncounteredData;
//     });
// }
//
// // Function to populate the latest tests list
// function populateLatestTests(testMetadata) {
//     const latestTestsList = document.getElementById('latestTestsList');
//     latestTestsList.innerHTML = ''; // Clear existing list
//
//     // Sort the tests by timestamp descending
//     const sortedTests = [...testMetadata].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
//
//     // Get the last 5 tests
//     const latestTests = sortedTests.slice(0, 5);
//
//     latestTests.forEach(test => {
//         const listItem = document.createElement('li');
//         listItem.classList.add('latest-test-item');
//
//         // Create elements for test name, class, author, and timestamp
//         const testName = document.createElement('span');
//         testName.classList.add('test-name');
//
//         const className = document.createElement('span');
//         className.classList.add('class-name');
//         className.textContent = ` (${test.class})`;
//
//         const authorName = document.createElement('span');
//         authorName.classList.add('author-name');
//         authorName.textContent = ` by ${test.author}`;
//
//         const timestamp = document.createElement('span');
//         timestamp.classList.add('timestamp');
//         timestamp.textContent = ` on ${test.timestamp}`;
//
//         // Create hyperlink only for the test name or class
//         const testLink = document.createElement('a');
//         testLink.href = test.project.includes('glide-idr')
//             ? `https://code.devsnc.com/dev/glide/blob/track/idrhermes/${test.project}/src/test/java/${test.package}/${test.class}.java`
//             : `https://code.devsnc.com/dev/glide-test/blob/track/idrhermes/${test.project}/src/test/java/${test.package}/${test.class}.java`;
//         testLink.target = '_blank';
//         testLink.textContent = test.test;
//         testName.innerHTML = ''; // Clear textContent to insert link
//         testName.appendChild(testLink);
//
//         // Append elements to the list item
//         listItem.appendChild(testName);
//         listItem.appendChild(className);
//         listItem.appendChild(authorName);
//         listItem.appendChild(timestamp);
//
//         latestTestsList.appendChild(listItem);
//     });
// }
//
//
// // Function to fetch and display test results for a specific filename
// async function fetchAndDisplayTestResults(filename) {
//     try {
//         // Find the index of the selected test run
//         const selectedRunIndex = testRunData.findIndex(run => run.filename === filename);
//
//         // Identify the previous test run (if available)
//         if (selectedRunIndex > 0) {
//             previousRunFilename = testRunData[selectedRunIndex - 1].filename;
//         }
//
//         // Fetch the current test run data
//         const response = await fetch(`test_results/${filename}`);
//         const testResultsData = await response.json();
//
//         // Fetch the previous test run data if available
//         if (previousRunFilename) {
//             const prevResponse = await fetch(`test_results/${previousRunFilename}`);
//             const prevTestResultsData = await prevResponse.json();
//             previousTestResultsData = prevTestResultsData.test_results;
//         } else {
//             previousTestResultsData = []; // No previous data available
//         }
//
//         // Extract metadata
//         const executionTime = testResultsData.execution_time;
//         const testBranch = testResultsData.test_branch;
//         const glideCommit = testResultsData.glide_commit_hash;
//         const testResults = testResultsData.test_results; // The array of test results
//
//         // Process the test results data
//         processTestResultsData(testResults);
//
//         // Display metadata in the UI
//         displayTestMetadata(executionTime, testBranch, glideCommit);
//
//         // Update the commit deltas table
//         populateCommitDeltasTable(filename);
//
//     } catch (error) {
//         console.error('Error fetching test results:', error);
//     }
// }
//
// // Function to process and display the test results data
// function processTestResultsData(testResultsData) {
//     allTestResultsData = testResultsData; // Store current test run data
//
//     // Calculate counts for current test run
//     const currentCounts = calculateTestCounts(allTestResultsData);
//
//     // Calculate counts for previous test run (if available)
//     let previousCounts = null;
//     if (previousTestResultsData && previousTestResultsData.length > 0) {
//         previousCounts = calculateTestCounts(previousTestResultsData);
//     }
//
//     // Proceed to update the test results summary with counts and deltas
//     updateTestResultsSummary(currentCounts, previousCounts);
//
//     // By default, show only failed and errored tests
//     const defaultFilteredData = allTestResultsData.filter(test => test.result === 'failed' || test.result === 'error');
//
//     // Populate the test results table with filtered data
//     populateTestResultsTable(defaultFilteredData);
//
//     // Populate the project filter options
//     populateTestResultsFilters(allTestResultsData);
// }
//
// function calculateTestCounts(testData) {
//     return {
//         passed: testData.filter(test => test.result === 'passed').length,
//         failed: testData.filter(test => test.result === 'failed').length,
//         error: testData.filter(test => test.result === 'error').length,
//         skipped: testData.filter(test => test.result === 'skipped').length
//     };
// }
//
// function displayTestMetadata(executionTime, testBranch, glideCommit) {
//     const metadataContainer = document.getElementById('testMetadata');
//
//     // Format the execution time
//     const formattedExecutionTime = new Date(executionTime).toLocaleString();
//
//     const commit = glideCommit ? ` (${glideCommit})` : '';
//     // Update the content
//     metadataContainer.innerHTML = `
//         <p><strong><i class="far fa-clock"></i> Execution Time:</strong> ${formattedExecutionTime}</p>
//         <p><strong><i class="fas fa-code-branch"></i> Branch:</strong> ${testBranch}${commit}</p>
//     `;
// }
//
// // Function to populate the test results filters
// function populateTestResultsFilters(testResultsData) {
//     const projectNameFilter = document.getElementById('projectNameFilter');
//     const allProjects = new Set(testResultsData.map(test => test.project_name));
//
//     // Clear existing options (except 'All Projects')
//     projectNameFilter.innerHTML = '<option value="all">All Projects</option>';
//
//     allProjects.forEach(project => {
//         const option = document.createElement('option');
//         option.value = project;
//         option.textContent = project;
//         projectNameFilter.appendChild(option);
//     });
// }
//
// function updateTestResultsSummary(currentCounts, previousCounts) {
//     // Update counts
//     document.getElementById('passedCount').innerHTML = formatCountWithDelta('passedCount', currentCounts.passed, previousCounts ? previousCounts.passed : null);
//     document.getElementById('failedCount').innerHTML = formatCountWithDelta('failedCount', currentCounts.failed, previousCounts ? previousCounts.failed : null);
//     document.getElementById('errorCount').innerHTML = formatCountWithDelta('errorCount', currentCounts.error, previousCounts ? previousCounts.error : null);
//     document.getElementById('skippedCount').innerHTML = formatCountWithDelta('skippedCount', currentCounts.skipped, previousCounts ? previousCounts.skipped : null);
//
//     // Create or update the pie chart
//     createTestResultsPieChart(currentCounts.passed, currentCounts.failed, currentCounts.error, currentCounts.skipped);
// }
//
// function formatCountWithDelta(metricType, currentCount, previousCount) {
//     if (previousCount === null) {
//         // No previous data, just display the current count
//         return `${currentCount}`;
//     }
//
//     const delta = currentCount - previousCount;
//     let deltaSymbol = '';
//     let deltaClass = '';
//
//     if (delta > 0) {
//         deltaSymbol = `&uarr; ${delta}`;
//         metricType === 'passedCount' ? deltaClass = 'delta-up' : deltaClass = 'delta-down';
//     } else if (delta < 0) {
//         deltaSymbol = `&darr; ${Math.abs(delta)}`;
//         metricType === 'passedCount' ? deltaClass = 'delta-down' : deltaClass = 'delta-up';
//     } else {
//         deltaSymbol = ``;
//         deltaClass = 'delta-same';
//     }
//
//     return `${currentCount} <span class="delta ${deltaClass}">${deltaSymbol}</span>`;
// }
//
// // Function to populate the test results table
// function populateTestResultsTable(testResultsData) {
//     const tableBody = document.querySelector('#testResultsTable tbody');
//     tableBody.innerHTML = ''; // Clear existing rows
//
//     // Group the data by project
//     const projectGroups = groupBy(testResultsData, 'project_name');
//
//     // Iterate over each project group
//     for (const projectName in projectGroups) {
//         const projectData = projectGroups[projectName];
//
//         // Group the project data by class
//         const classGroups = groupBy(projectData, 'class_name');
//
//         const projectRowSpan = projectData.length; // Total number of tests in this project
//         let isFirstProjectRow = true; // Flag to check if it's the first row for the project
//
//         for (const className in classGroups) {
//             const classData = classGroups[className];
//             const classRowSpan = classData.length; // Number of tests in this class
//             let isFirstClassRow = true; // Flag to check if it's the first row for the class
//
//             classData.forEach((test) => {
//                 const row = document.createElement('tr');
//
//                 // Project Name cell
//                 if (isFirstProjectRow) {
//                     const projectCell = document.createElement('td');
//                     projectCell.textContent = projectName || '';
//                     projectCell.rowSpan = projectRowSpan;
//                     projectCell.style.verticalAlign = 'top';
//                     row.appendChild(projectCell);
//                     isFirstProjectRow = false;
//                 }
//
//                 // Class Name cell
//                 if (isFirstClassRow) {
//                     const classCell = document.createElement('td');
//                     classCell.textContent = className || '';
//                     classCell.rowSpan = classRowSpan;
//                     classCell.style.verticalAlign = 'top';
//                     row.appendChild(classCell);
//                     isFirstClassRow = false;
//                 }
//
//                 // Test Name
//                 const testNameCell = document.createElement('td');
//                 testNameCell.textContent = test.test_name || '';
//                 row.appendChild(testNameCell);
//
//                 // Result
//                 const resultCell = document.createElement('td');
//                 resultCell.textContent = test.result || '';
//                 resultCell.classList.add(test.result); // Add class for styling
//                 row.appendChild(resultCell);
//
//                 // Error Details
//                 const errorCell = document.createElement('td');
//                 if (test.stack_trace) {
//                     const detailsButton = document.createElement('button');
//                     detailsButton.textContent = 'Details';
//                     detailsButton.onclick = () => {
//                         window.open(
//                             'test-result.html?project=' + encodeURIComponent(test.project_name) +
//                             '&class=' + encodeURIComponent(test.class_name) +
//                             '&test=' + encodeURIComponent(test.test_name),
//                             '_blank'
//                         );
//                     };
//                     errorCell.appendChild(detailsButton);
//                 } else {
//                     errorCell.textContent = '';
//                 }
//                 row.appendChild(errorCell);
//
//                 tableBody.appendChild(row);
//             });
//         }
//     }
// }
//
// // Helper function to group data by a key
// function groupBy(array, key) {
//     return array.reduce((result, currentItem) => {
//         const groupKey = currentItem[key];
//         if (!result[groupKey]) {
//             result[groupKey] = [];
//         }
//         result[groupKey].push(currentItem);
//         return result;
//     }, {});
// }
//
// function applyTestResultsFilters() {
//     const selectedResult = document.getElementById('resultFilter').value;
//     const selectedProject = document.getElementById('projectNameFilter').value;
//
//     let filteredData = allTestResultsData;
//
//     if (selectedResult !== 'all') {
//         filteredData = filteredData.filter(test => test.result === "failed" || test.result === "error");
//     }
//
//     if (selectedProject !== 'all') {
//         filteredData = filteredData.filter(test => test.project_name === selectedProject);
//     }
//
//     // Update the summary and table with the filtered data
//     populateTestResultsTable(filteredData);
// }
//
// // Function to load commit deltas data
// async function loadCommitDeltas() {
//     try {
//         const response = await fetch('commit_deltas.json');
//         if (!response.ok) {
//             throw new Error(`HTTP error! Status: ${response.status}`);
//         }
//         commitDeltasData = await response.json();
//         // Optionally, you can call populateCommitDeltasTable here if needed
//     } catch (error) {
//         console.error('Error loading commit deltas:', error);
//         displayError(`Failed to load commit deltas: ${error.message}`);
//     }
// }
//
// // Function to populate the commit deltas table
// function populateCommitDeltasTable(selectedFilename) {
//     const tableBody = document.querySelector('#commitDeltasTable tbody');
//     tableBody.innerHTML = ''; // Clear existing content
//
//     // Find the corresponding commit delta entry
//     const commitDeltaEntry = commitDeltasData.find(entry => entry.to_filename === selectedFilename && entry.from_filename === previousRunFilename);
//
//     if (commitDeltaEntry) {
//         const { glide_commits, glide_test_commits } = commitDeltaEntry;
//
//         // Combine commits from both repositories
//         const allCommits = [
//             ...glide_commits.map(commit => ({ repo: 'glide', ...commit })),
//             ...glide_test_commits.map(commit => ({ repo: 'glide-test', ...commit }))
//         ];
//
//         if (allCommits.length > 0) {
//             allCommits.forEach(commit => {
//                 const row = document.createElement('tr');
//
//                 // Repository
//                 const repoCell = document.createElement('td');
//                 repoCell.textContent = commit.repo;
//                 row.appendChild(repoCell);
//
//                 // Commit Hash (with link to commit)
//                 const commitCell = document.createElement('td');
//                 const commitLink = document.createElement('a');
//                 commitLink.href = generateCommitUrl(commit.repo, commit.commit);
//                 commitLink.target = '_blank';
//                 commitLink.textContent = commit.commit.substring(0, 7); // Shorten hash for display
//                 commitCell.appendChild(commitLink);
//                 row.appendChild(commitCell);
//
//                 // Author
//                 const authorCell = document.createElement('td');
//                 authorCell.textContent = commit.author;
//                 row.appendChild(authorCell);
//
//                 // Date
//                 const dateCell = document.createElement('td');
//                 dateCell.textContent = new Date(commit.date).toLocaleString();
//                 row.appendChild(dateCell);
//
//                 // Message
//                 const messageCell = document.createElement('td');
//                 messageCell.textContent = commit.message;
//                 row.appendChild(messageCell);
//
//                 tableBody.appendChild(row);
//             });
//         } else {
//             const row = document.createElement('tr');
//             const noDataCell = document.createElement('td');
//             noDataCell.setAttribute('colspan', 5);
//             noDataCell.textContent = 'No new commits between the selected test run and the previous one.';
//             row.appendChild(noDataCell);
//             tableBody.appendChild(row);
//         }
//     } else {
//         const row = document.createElement('tr');
//         const noDataCell = document.createElement('td');
//         noDataCell.setAttribute('colspan', 5);
//         noDataCell.textContent = 'Commit data not available for the selected test run.';
//         row.appendChild(noDataCell);
//         tableBody.appendChild(row);
//     }
// }
//
// /**
//  * Generate a URL to the commit on your Git repository web interface.
//  */
// function generateCommitUrl(repo, commitHash) {
//     let baseUrl;
//     if (repo === 'glide') {
//         baseUrl = 'https://code.devsnc.com/dev/glide/commit/';
//     } else if (repo === 'glide-test') {
//         baseUrl = 'https://code.devsnc.com/dev/glide-test/commit/';
//     } else {
//         baseUrl = '#';
//     }
//     return `${baseUrl}${commitHash}`;
// }
//
// /**
//  * Function to display error messages to the user.
//  */
// function displayError(message) {
//     alert(message); // Simple alert for demonstration; consider a better UI in production
// }
//
// /**
//  * Initialization function to be called on page load.
//  */
// async function init() {
//     const params = getUrlParameters();
//     const desiredExecution = params.execution || null; // Get the 'execution' parameter if it exists
//
//     try {
//         // Load commit deltas data
//         await loadCommitDeltas();
//
//         // Fetch test runs and display data
//         await fetchTestRuns(desiredExecution);
//
//         // Add event listeners for the commit deltas toggle button
//         const toggleCommitsButton = document.getElementById('toggleCommitsButton');
//         const commitsCollapsibleContent = document.getElementById('commitsCollapsibleContent');
//
//         toggleCommitsButton.addEventListener('click', () => {
//             if (commitsCollapsibleContent.classList.contains('expanded')) {
//                 // Collapse the content
//                 commitsCollapsibleContent.style.height = commitsCollapsibleContent.scrollHeight + 'px';
//                 commitsCollapsibleContent.offsetHeight; // Trigger reflow
//                 commitsCollapsibleContent.style.height = '0';
//                 commitsCollapsibleContent.classList.remove('expanded');
//                 toggleCommitsButton.textContent = 'Show Commit Details';
//             } else {
//                 // Expand the content
//                 commitsCollapsibleContent.classList.add('expanded');
//                 toggleCommitsButton.textContent = 'Hide Commit Details';
//                 expandCollapsibleContent(commitsCollapsibleContent);
//             }
//         });
//
//         // Existing initialization logic...
//
//     } catch (error) {
//         console.error('Initialization error:', error);
//     }
// }
// // Function to update the pie chart
// function updateTestTypesPieChart(filteredData, pieChart) {
//     // Calculate total integration and unit tests from filteredData
//     const totalIntegrationTests = filteredData.reduce((sum, item) => sum + item.integration_count, 0);
//     const totalUnitTests = filteredData.reduce((sum, item) => sum + item.unit_count, 0);
//     const totalTests = totalIntegrationTests + totalUnitTests;
//
//     pieChart.data.datasets[0].data = [totalIntegrationTests, totalUnitTests];
//     pieChart.update();
//
//     // Update the total tests count in the UI if applicable
//     document.getElementById('totalTests').textContent =
//         `Total Number of Existing Tests: ${totalTests} (Integration: ${totalIntegrationTests}, Unit: ${totalUnitTests})`;
// }
// // End functions
//
// // Run the init function when the page loads
// window.onload = init;
//
// // Load the JSON data from the file
// console.log('Starting data load...');
// fetch('test_analysis_results.json')
//     .then(response => {
//         console.log('Response received:', response);
//         return response.json();
//     })
//     .then(data => {
//         console.log('Data loaded:', data);
//         // Extract the data from the new format
//         const testMetadata = data.test_metadata;
//         const monthlyAggregates = data.monthly_aggregates;
//         const authorTestCountData = data.author_test_count;
//
//         // Process testMetadata to create per-month test details
//         const monthlyDetails = {};
//
//         testMetadata.forEach(test => {
//             // Use the test_type field directly
//             const testType = test.test_type; // 'integration' or 'unit'
//
//             // Extract month from timestamp
//             const timestamp = test.timestamp; // e.g., "2024-05-13"
//             const month = timestamp.slice(0, 7); // "2024-05"
//
//             // Initialize the month in monthlyDetails if not already
//             if (!monthlyDetails[month]) {
//                 monthlyDetails[month] = {
//                     integration_details: [],
//                     unit_details: []
//                 };
//             }
//
//             if (testType === 'integration') {
//                 monthlyDetails[month].integration_details.push(test);
//             } else if (testType === 'unit') {
//                 monthlyDetails[month].unit_details.push(test);
//             }
//         });
//
//         // Now, create 'monthlyData' array similar to the old format
//         const monthlyData = monthlyAggregates.map(aggregate => {
//             const month = aggregate.month;
//             const integration_details = monthlyDetails[month]?.integration_details || [];
//             const unit_details = monthlyDetails[month]?.unit_details || [];
//
//             return {
//                 month: month,
//                 integration_count: integration_details.length,
//                 unit_count: unit_details.length,
//                 integration_details: integration_details,
//                 unit_details: unit_details
//             };
//         });
//
//         const labels = monthlyData.map(item => {
//             const [year, month] = item.month.split('-');
//             const correctedMonth = String(Number(month)).padStart(2, '0');
//             return `${year}-${correctedMonth}`;
//         });
//
//         console.log('Labels:', labels);
//         const integrationCounts = monthlyData.map(item => item.integration_count);
//         console.log('Integration Counts:', integrationCounts);
//         const unitCounts = monthlyData.map(item => item.unit_count);
//         console.log('Unit Counts:', unitCounts);
//         const details = monthlyData.reduce((acc, item) => {
//             acc[item.month] = {
//                 integration_details: item.integration_details,
//                 unit_details: item.unit_details
//             };
//             return acc;
//         }, {});
//
//         // Populate the filters
//         const authorFilter = document.getElementById('authorFilter');
//         const projectFilter = document.getElementById('projectFilter');
//         const allAuthors = new Set();
//         const allProjects = new Set();
//
//         // Use testMetadata to get all authors and projects
//         testMetadata.forEach(detail => {
//             allAuthors.add(detail.author);
//             allProjects.add(detail.project);
//         });
//
//         Array.from(allAuthors).sort().forEach(author => {
//             const option = document.createElement('option');
//             option.value = author;
//             option.textContent = author;
//             authorFilter.appendChild(option);
//         });
//
//         Array.from(allProjects).sort().forEach(project => {
//             const option = document.createElement('option');
//             option.value = project;
//             option.textContent = project;
//             projectFilter.appendChild(option);
//         });
//
//         // Calculate total number of tests
//         const totalIntegrationTests = integrationCounts.reduce((a, b) => a + b, 0);
//         const totalUnitTests = unitCounts.reduce((a, b) => a + b, 0);
//         const totalTests = totalIntegrationTests + totalUnitTests;
//
//         // Update the header with the total number of tests
//         document.getElementById('totalTests').textContent =
//             `Total Number of Existing Tests: ${totalTests} (Integration: ${totalIntegrationTests}, Unit: ${totalUnitTests})`;
//
//         // Create the line chart
//         const ctx = document.getElementById('testsAddedTrendChart').getContext('2d');
//         console.log('Initializing chart with labels:', labels);
//         const chart = new Chart(ctx, {
//             type: 'line',
//             data: {
//                 labels: labels,
//                 datasets: [
//                     {
//                         label: 'Integration Tests Added',
//                         data: integrationCounts,
//                         borderColor: 'rgba(75, 192, 192, 1)',
//                         backgroundColor: ctx.createLinearGradient(0, 0, 0, 450),
//                         fill: true,
//                         borderWidth: 3,
//                         tension: 0.4,
//                         pointStyle: 'circle',
//                         pointRadius: 6,
//                         pointHoverRadius: 8,
//                         trendlineLinear: {
//                             style: "rgba(75, 192, 192, .8)",
//                             lineStyle: "dotted",
//                             width: 2
//                         }
//                     },
//                     {
//                         label: 'Unit Tests Added',
//                         data: unitCounts,
//                         borderColor: 'rgba(255, 99, 132, 1)',
//                         backgroundColor: ctx.createLinearGradient(0, 0, 0, 450),
//                         fill: true,
//                         borderWidth: 3,
//                         tension: 0.4,
//                         pointStyle: 'circle',
//                         pointRadius: 6,
//                         pointHoverRadius: 8,
//                         trendlineLinear: {
//                             style: "rgba(255, 99, 132, .8)",
//                             lineStyle: "dotted",
//                             width: 2
//                         }
//                     }
//                 ]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 plugins: {
//                     legend: {
//                         labels: {
//                             font: {
//                                 size: 14
//                             }
//                         }
//                     }
//                 },
//                 onClick: (e) => {
//                     const activePoints = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
//                     if (activePoints.length > 0) {
//                         const { index, datasetIndex } = activePoints[0];
//                         const selectedMonth = labels[index];
//                         const selectedTestType = datasetIndex === 0 ? 'integration' : 'unit';
//                         populateDetails(selectedMonth, selectedTestType, details);
//                     }
//                 },
//                 scales: {
//                     x: {
//                         title: {
//                             display: true,
//                             text: 'Month',
//                             font: {
//                                 size: 16
//                             }
//                         }
//                     },
//                     y: {
//                         title: {
//                             display: true,
//                             text: 'Number of Tests Added',
//                             font: {
//                                 size: 16
//                             }
//                         },
//                         beginAtZero: true
//                     }
//                 }
//             }
//         });
//
//
//         // Create the pie chart with the title
//         const pieCtx = document.getElementById('pieChart').getContext('2d');
//         const pieChart = new Chart(pieCtx, {
//             type: 'pie',
//             data: {
//                 labels: ['Integration Tests', 'Unit Tests'],
//                 datasets: [{
//                     data: [totalIntegrationTests, totalUnitTests],
//                     backgroundColor: [
//                         'rgba(75, 192, 192, 0.6)',
//                         'rgba(255, 99, 132, 0.6)'
//                     ],
//                     borderColor: [
//                         'rgba(75, 192, 192, 1)',
//                         'rgba(255, 99, 132, 1)'
//                     ],
//                     borderWidth: 1
//                 }]
//             },
//             options: {
//                 responsive: true,
//                 maintainAspectRatio: false,
//                 plugins: {
//                     legend: {
//                         position: 'right',
//                         labels: {
//                             font: {
//                                 size: 14
//                             }
//                         }
//                     },
//                     title: {
//                         display: true,
//                         text: 'Test Distribution',
//                         font: {
//                             size: 18,
//                             family: "'Roboto', sans-serif", // Optional: Match your page font
//                             weight: 'bold' // Optional: Make the title bold
//                         },
//                         padding: {
//                             top: 10,
//                             bottom: 30
//                         },
//                         color: '#333' // Optional: Set the color of the title text
//                     }
//                 }
//             }
//         });
//
//         // Populate author test count table
//         if (authorTestCountData) {
//             const authorTableBody = document.getElementById('authorTable').getElementsByTagName('tbody')[0];
//             authorTableBody.innerHTML = '';
//             for (const [author, count] of Object.entries(authorTestCountData)) {
//                 const row = document.createElement('tr');
//                 row.id = `author_${author.replace(/\s+/g, '_')}`;
//                 const authorCell = document.createElement('td');
//                 authorCell.textContent = author;
//                 const countCell = document.createElement('td');
//                 countCell.textContent = count;
//                 row.appendChild(authorCell);
//                 row.appendChild(countCell);
//                 authorTableBody.appendChild(row);
//             }
//         }
//
//         // Populate the latest tests list
//         populateLatestTests(testMetadata);
//
//         // Event listeners for filters - only update the chart, not the details table
//         authorFilter.addEventListener('change', () => {
//             resetDetailsTable();
//             updateChart(monthlyData, chart, pieChart);
//         });
//
//         projectFilter.addEventListener('change', () => {
//             resetDetailsTable();
//             updateChart(monthlyData, chart, pieChart);
//         });
//
// 		// Get references to the time window radio buttons
// 		const timeWindowRadios = document.getElementsByName('timeWindow');
//
// 		// Add event listeners for when the time window changes
// 		timeWindowRadios.forEach(radio => {
// 		    radio.addEventListener('change', () => {
// 		        resetDetailsTable();
// 		        updateChart(monthlyData, chart, pieChart);
// 		    });
// 		});
//
//     })
//     .catch(error => console.error('Error loading JSON data:', error));
//
// // Call fetchTestRuns when the page loads with desiredExecution if present
//
//
// // Get references to the toggle button and collapsible content
// const toggleDetailsButton = document.getElementById('toggleDetailsButton');
// const collapsibleContent = document.getElementById('collapsibleContent');
//
// toggleDetailsButton.addEventListener('click', () => {
//     if (collapsibleContent.classList.contains('expanded')) {
//         // Collapse the content
//         collapsibleContent.style.height = collapsibleContent.scrollHeight + 'px';
//         collapsibleContent.offsetHeight; // Trigger reflow
//         collapsibleContent.style.height = '0';
//         collapsibleContent.classList.remove('expanded');
//         toggleDetailsButton.textContent = 'Show Details';
//     } else {
//         collapsibleContent.classList.add('expanded');
//         toggleDetailsButton.textContent = 'Hide Details';
//         expandCollapsibleContent(collapsibleContent);
//     }
// });
//
// // Event listeners for filters
// document.getElementById('resultFilter').addEventListener('change', applyTestResultsFilters);
// document.getElementById('projectNameFilter').addEventListener('change', applyTestResultsFilters);
//
