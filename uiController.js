// uiController.js

const UIController = (() => {
    /**
     * Populate Test Run Selection Dropdown.
     * @param {Array} testRuns - Array of test run objects.
     * @param {string|null} desiredExecution - Specific execution to select.
     */
    function populateTestRunSelection(testRuns, desiredExecution) {
        const testRunSelect = document.getElementById('testRunSelect');
        testRunSelect.innerHTML = ''; // Clear existing options

        testRuns.forEach((testRun, index) => {
            const option = document.createElement('option');
            option.value = testRun.filename;
            option.textContent = `${testRun.execution_time} (${testRun.test_branch})`;
            testRunSelect.appendChild(option);
        });

        testRunSelect.addEventListener('change', (event) => {
            const selectedFilename = event.target.value;
            DataHandler.fetchAndDisplayTestResults(selectedFilename);
        });

        if (desiredExecution) {
            const desiredOption = Array.from(testRunSelect.options).find(option => option.value === desiredExecution);
            if (desiredOption) {
                testRunSelect.value = desiredExecution;
                DataHandler.fetchAndDisplayTestResults(desiredExecution);
            } else {
                console.warn(`Desired execution "${desiredExecution}" not found. Loading the latest test run instead.`);
                if (testRuns.length > 0) {
                    const latestTestRun = testRuns[testRuns.length - 1];
                    testRunSelect.value = latestTestRun.filename;
                    DataHandler.fetchAndDisplayTestResults(latestTestRun.filename);
                    ChartManager.showTestResultTrendChart();
                }
            }
        } else {
            if (testRuns.length > 0) {
                testRunSelect.selectedIndex = testRuns.length - 1;
            }
        }
    }

    /**
     * Display Test Metadata in the UI.
     * @param {string} executionTime - The execution time of the test run.
     * @param {string} testBranch - The test branch name.
     */
    function displayTestMetadata(executionTime, testBranch) {
        const metadataContainer = document.getElementById('testMetadata');
        const formattedExecutionTime = new Date(executionTime).toLocaleString();

        metadataContainer.innerHTML = `
            <p><strong><i class="far fa-clock"></i> Execution Time:</strong> ${formattedExecutionTime}</p>
            <p><strong><i class="fas fa-code-branch"></i> Test Branch:</strong> ${testBranch}</p>
        `;
    }

    /**
     * Update Test Results Summary with counts and deltas.
     * @param {Object} currentCounts - Current test counts.
     * @param {Object|null} previousCounts - Previous test counts.
     */
    function updateTestResultsSummary(currentCounts, previousCounts) {
        document.getElementById('passedCount').innerHTML = formatCountWithDelta('passedCount', currentCounts.passed, previousCounts ? previousCounts.passed : null);
        document.getElementById('failedCount').innerHTML = formatCountWithDelta('failedCount', currentCounts.failed, previousCounts ? previousCounts.failed : null);
        document.getElementById('errorCount').innerHTML = formatCountWithDelta('errorCount', currentCounts.error, previousCounts ? previousCounts.error : null);
        document.getElementById('skippedCount').innerHTML = formatCountWithDelta('skippedCount', currentCounts.skipped, previousCounts ? previousCounts.skipped : null);

        ChartManager.createTestResultsPieChart(currentCounts.passed, currentCounts.failed, currentCounts.error, currentCounts.skipped);
    }

    /**
     * Format count with delta indicators.
     * @param {string} metricType - The type of metric (e.g., 'passedCount').
     * @param {number} currentCount - Current count.
     * @param {number|null} previousCount - Previous count.
     * @returns {string} - Formatted HTML string.
     */
    function formatCountWithDelta(metricType, currentCount, previousCount) {
        if (previousCount === null) {
            return `${currentCount}`;
        }

        const delta = currentCount - previousCount;
        let deltaSymbol = '';
        let deltaClass = '';

        if (delta > 0) {
            deltaSymbol = `&uarr; ${delta}`;
            deltaClass = metricType === 'passedCount' ? 'delta-up' : 'delta-down';
        } else if (delta < 0) {
            deltaSymbol = `&darr; ${Math.abs(delta)}`;
            deltaClass = metricType === 'passedCount' ? 'delta-down' : 'delta-up';
        }

        return `${currentCount} <span class="delta ${deltaClass}">${deltaSymbol}</span>`;
    }

    /**
     * Populate Test Results Table.
     * @param {Array} testResultsData - Array of test result objects.
     */
    function populateTestResultsTable(testResultsData) {
        const tableBody = document.querySelector('#testResultsTable tbody');
        tableBody.innerHTML = ''; // Clear existing rows

        const projectGroups = groupBy(testResultsData, 'project_name');

        for (const projectName in projectGroups) {
            const projectData = projectGroups[projectName];
            const classGroups = groupBy(projectData, 'class_name');
            const projectRowSpan = projectData.length;
            let isFirstProjectRow = true;

            for (const className in classGroups) {
                const classData = classGroups[className];
                const classRowSpan = classData.length;
                let isFirstClassRow = true;

                classData.forEach((test) => {
                    const row = document.createElement('tr');

                    // Project Name cell
                    if (isFirstProjectRow) {
                        const projectCell = document.createElement('td');
                        projectCell.textContent = projectName || '';
                        projectCell.rowSpan = classGroups[className].length;
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
                                `test-result.html?project=${encodeURIComponent(test.project_name)}&class=${encodeURIComponent(test.class_name)}&test=${encodeURIComponent(test.test_name)}`,
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

    /**
     * Populate Test Results Filters.
     * @param {Array} testResultsData - Array of test result objects.
     */
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

        // Attach event listeners
        document.getElementById('resultFilter').addEventListener('change', applyTestResultsFilters);
        projectNameFilter.addEventListener('change', applyTestResultsFilters);
    }

    /**
     * Apply Test Results Filters.
     */
    function applyTestResultsFilters() {
        const selectedResult = document.getElementById('resultFilter').value;
        const selectedProject = document.getElementById('projectNameFilter').value;

        let filteredData = DataHandler.getAllTestResultsData();

        if (selectedResult !== 'all') {
            filteredData = filteredData.filter(test => test.result === "failed" || test.result === "error");
        }

        if (selectedProject !== 'all') {
            filteredData = filteredData.filter(test => test.project_name === selectedProject);
        }

        populateTestResultsTable(filteredData);
    }

    /**
     * Populate Latest Tests List.
     * @param {Array} testMetadata - Array of test metadata objects.
     */
    function populateLatestTests(testMetadata) {
        const latestTestsList = document.getElementById('latestTestsList');
        latestTestsList.innerHTML = ''; // Clear existing list

        const sortedTests = [...testMetadata].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const latestTests = sortedTests.slice(0, 5);

        latestTests.forEach(test => {
            const listItem = document.createElement('li');
            listItem.classList.add('latest-test-item');

            const testName = document.createElement('span');
            testName.classList.add('test-name');

            const className = document.createElement('span');
            className.classList.add('class-name');
            className.textContent = ` (${test.class})`;

            const authorName = document.createElement('span');
            authorName.classList.add('author-name');
            authorName.textContent = ` by ${test.author}`;

            const timestamp = document.createElement('span');
            timestamp.classList.add('timestamp');
            timestamp.textContent = ` on ${test.timestamp}`;

            const testLink = document.createElement('a');
            testLink.href = test.project.includes('glide-idr')
                ? `https://code.devsnc.com/dev/glide/blob/track/idrhermes/${test.project}/src/test/java/${test.package}/${test.class}.java`
                : `https://code.devsnc.com/dev/glide-test/blob/track/idrhermes/${test.project}/src/test/java/${test.package}/${test.class}.java`;
            testLink.target = '_blank';
            testLink.textContent = test.test;
            testName.innerHTML = ''; // Clear textContent to insert link
            testName.appendChild(testLink);

            listItem.appendChild(testName);
            listItem.appendChild(className);
            listItem.appendChild(authorName);
            listItem.appendChild(timestamp);

            latestTestsList.appendChild(listItem);
        });
    }

    /**
     * Populate Author Test Count Table.
     * @param {Object} authorTestCountData - Object with author names as keys and test counts as values.
     */
    function populateAuthorTestCountTable(authorTestCountData) {
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

        // Add event listeners for highlighting
        document.querySelectorAll('#authorTable tbody tr').forEach(row => {
            row.addEventListener('click', () => {
                const author = row.querySelector('td').textContent;
                highlightAuthorRow(author);
            });
        });
    }

    /**
     * Highlight an author row in the Author Test Count Table.
     * @param {string} author - The author's name to highlight.
     */
    function highlightAuthorRow(author) {
        // Remove previous highlights
        document.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));

        // Highlight the new author row
        const authorRow = document.getElementById(`author_${author.replace(/\s+/g, '_')}`);
        if (authorRow) {
            authorRow.classList.add('highlight');
            authorRow.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Populate Details Table based on selected month and test type.
     * @param {string} month - Selected month in 'YYYY-MM' format.
     * @param {string} testType - 'integration' or 'unit'.
     * @param {Object} details - Object containing details for the selected month.
     */
    function populateDetails(month, testType, details) {
        const [year, monthNum] = month.split('-');
        const correctedDate = new Date(year, monthNum - 1);
        const formattedDate = correctedDate.toLocaleString('en-us', { month: 'long', year: 'numeric' });

        document.getElementById('detailsHeader').textContent = `${capitalizeFirstLetter(testType)} tests added in ${formattedDate}`;

        const detailsTableBody = document.getElementById('detailsTable').getElementsByTagName('tbody')[0];
        detailsTableBody.innerHTML = '';
        const noSelectionMessage = document.getElementById('noSelectionMessage');
        if (noSelectionMessage) {
            noSelectionMessage.remove();
        }

        const selectedDetails = details[month];
        if (selectedDetails) {
            let allDetails;
            if (testType === 'integration') {
                allDetails = selectedDetails.integration_details;
            } else if (testType === 'unit') {
                allDetails = selectedDetails.unit_details;
            }

            // Apply Author and Project Filters
            const selectedAuthor = document.getElementById('authorFilter').value;
            const selectedProject = document.getElementById('projectFilter').value;

            if (selectedAuthor !== 'all') {
                allDetails = allDetails.filter(detail => detail.author === selectedAuthor);
            }
            if (selectedProject !== 'all') {
                allDetails = allDetails.filter(detail => detail.project === selectedProject);
            }

            if (allDetails.length > 0) {
                allDetails.forEach(detail => {
                    const row = document.createElement('tr');

                    // Project Name cell
                    const projectCell = document.createElement('td');
                    projectCell.textContent = detail.project || '';
                    row.appendChild(projectCell);

                    // Class Name cell
                    const classCell = document.createElement('td');
                    const classLink = document.createElement('a');
                    classLink.href = detail.project.includes('glide-idr')
                        ? `https://code.devsnc.com/dev/glide/blob/track/idrhermes/${detail.project}/src/test/java/${detail.package}/${detail.class}.java`
                        : `https://code.devsnc.com/dev/glide-test/blob/track/idrhermes/${detail.project}/src/test/java/${detail.package}/${detail.class}.java`;
                    classLink.target = '_blank';
                    classLink.textContent = detail.class;
                    classCell.appendChild(classLink);
                    row.appendChild(classCell);

                    // Coverage Link cell
                    const coverageCell = document.createElement('td');
                    const coverageLink = document.createElement('a');
                    coverageLink.href = generateCoverageUrl(detail.class, detail.package);
                    coverageLink.target = '_blank';
                    coverageLink.textContent = "Link";
                    coverageCell.appendChild(coverageLink);
                    row.appendChild(coverageCell);

                    // Test Name cell
                    const testCell = document.createElement('td');
                    testCell.textContent = detail.test;
                    row.appendChild(testCell);

                    // Author Name cell
                    const authorCell = document.createElement('td');
                    const authorLink = document.createElement('a');
                    authorLink.href = `#author_${detail.author.replace(/\s+/g, '_')}`;
                    authorLink.textContent = detail.author;
                    authorLink.addEventListener('click', function() {
                        highlightAuthorRow(detail.author);
                    });
                    authorCell.appendChild(authorLink);
                    row.appendChild(authorCell);

                    detailsTableBody.appendChild(row);
                });
            } else {
                const row = document.createElement('tr');
                const noDataCell = document.createElement('td');
                noDataCell.setAttribute('colspan', 5);
                noDataCell.textContent = 'No tests found for this month based on the current filters.';
                row.appendChild(noDataCell);
                detailsTableBody.appendChild(row);
            }
        }
    }

    /**
     * Generate the class coverage URL.
     * @param {string} testClass - The test class name.
     * @param {string} packagePath - The package path.
     * @returns {string} - The constructed coverage URL.
     */
    function generateCoverageUrl(testClass, packagePath) {
        // Remove the 'IT' or 'Test' suffix to get the class under test
        const classUnderTest = testClass.replace(/(IT|Test)$/, '');

        // Construct the URL
        const baseUrl = "https://metrics.devsnc.com/code?id=com.snc%3Asonar-glide-idr&branch=track%2Fidrhermes&selected=com.snc%3Asonar-glide-idr%3Amodules%2Fglide%2Fglide-idr%2Fsrc%2Fmain%2Fjava%2F";
        return `${baseUrl}${packagePath}%2F${classUnderTest}.java`;
    }

    /**
     * Reset the Details Table to show the no selection message.
     */
    function resetDetailsTable() {
        const detailsTableBody = document.getElementById('detailsTable').getElementsByTagName('tbody')[0];
        detailsTableBody.innerHTML = '';

        const noSelectionRow = document.createElement('tr');
        noSelectionRow.id = 'noSelectionMessage';

        const noDataCell = document.createElement('td');
        noDataCell.setAttribute('colspan', 5);
        noDataCell.textContent = 'Please select a data point from the above graph to view details.';
        noSelectionRow.appendChild(noDataCell);

        detailsTableBody.appendChild(noSelectionRow);
    }

    /**
     * Display error messages to the user.
     * @param {string} message - The error message to display.
     */
    function displayError(message) {
        alert(message); // Simple alert for demonstration; consider a better UI in production
    }

    /**
     * Capitalize the first letter of a string.
     * @param {string} str - The string to capitalize.
     * @returns {string} - The capitalized string.
     */
    function capitalizeFirstLetter(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /**
     * Get ordinal suffix for a day.
     * @param {number} day - The day of the month.
     * @returns {string} - The ordinal suffix ('st', 'nd', 'rd', 'th').
     */
    function getOrdinalSuffix(day) {
        if (day > 3 && day < 21) return 'th';
        switch (day % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    }

    /**
     * Group an array of objects by a specific key.
     * @param {Array} array - The array to group.
     * @param {string} key - The key to group by.
     * @returns {Object} - The grouped object.
     */
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

    return {
        populateTestRunSelection,
        displayTestMetadata,
        updateTestResultsSummary,
        formatCountWithDelta,
        populateTestResultsTable,
        populateTestResultsFilters,
        applyTestResultsFilters,
        populateLatestTests,
        populateAuthorTestCountTable,
        populateDetails,
        highlightAuthorRow,
        resetDetailsTable,
        displayError,
        getOrdinalSuffix,
        groupBy
    };
})();
