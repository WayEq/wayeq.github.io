// test-authorship.js

import {renderVelocityAndAuthorshipTrendChart, showTestTypePieChart} from './chart-handling.js';

export function resetAuthorshipDetailsTable() {
    const detailsTableBody = document.getElementById('detailsTable').getElementsByTagName('tbody')[0];
    detailsTableBody.innerHTML = '';
    const row = document.createElement('tr');
    const noDataCell = document.createElement('td');
    noDataCell.setAttribute('colspan', 5);
    noDataCell.textContent = 'Please select a data point from the above graph to view details.';
    row.appendChild(noDataCell);
    detailsTableBody.appendChild(row);

    // Reset the details header
    document.getElementById('detailsHeader').textContent = 'Details for Selected Month';
}

export async function renderTestVelocityAndAuthorshipSection(testAuthorshipData, author, project, selectedTimeWindow) {
    const testMetadataAll = testAuthorshipData.test_metadata;
    const monthlyAggregates = testAuthorshipData.monthly_aggregates;
    const authorTestCountData = testAuthorshipData.author_test_count;

    const now = new Date();
    let startDate;

    // Determine the start date based on selected time window
    switch (selectedTimeWindow) {
        case 'last_6_months':
            startDate = new Date(now);
            startDate.setMonth(startDate.getMonth() - 6);
            break;
        case 'last_year': // Handling 'Last Year'
            startDate = new Date(now);
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        case 'all':
        default:
            startDate = new Date(0); // Set to earliest possible date
            break;
    }


    // Process testMetadata to create per-month test details
    const monthlyDetails = {};

    const testMetadata = testMetadataAll.filter(test => (test.author === author || author === 'all')
        && (test.project === project || project === 'all')
    && (new Date(test.timestamp) >= startDate));


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

    const monthlyAggregatesFiltered = monthlyAggregates.filter(aggregate => new Date(aggregate.month) >= startDate);
    const monthlyData = monthlyAggregatesFiltered.map(aggregate => {
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


    const integrationCounts = monthlyData.map(item => item.integration_count);
    const unitCounts = monthlyData.map(item => item.unit_count);
    const details = monthlyData.reduce((acc, item) => {
        acc[item.month] = {
            integration_details: item.integration_details,
            unit_details: item.unit_details
        };
        return acc;
    }, {});

    // Populate the filters
    const allAuthors = new Set();
    const allProjects = new Set();

    // Use testMetadata to get all authors and projects
    testMetadata.forEach(detail => {
        allAuthors.add(detail.author);
        allProjects.add(detail.project);
    });
    const authorFilter = document.getElementById('authorFilter')
    Array.from(allAuthors).sort().forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        authorFilter.appendChild(option);
    });

    const projectFilter = document.getElementById('projectFilter');
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
        `Tests Added: ${totalTests} (Integration: ${totalIntegrationTests}, Unit: ${totalUnitTests})`;

    const labels = monthlyData.map(item => {
        const [year, month] = item.month.split('-');
        const correctedMonth = String(Number(month)).padStart(2, '0');
        return `${year}-${correctedMonth}`;
    });

    const { trimmedIntegrationCounts, trimmedUnitCounts, trimmedLabels } = trimLeadingZeros(integrationCounts, unitCounts, labels);

    await renderVelocityAndAuthorshipTrendChart(trimmedIntegrationCounts, trimmedUnitCounts, details, trimmedLabels, populateDetailsTableForMonth);

    showTestTypePieChart(totalIntegrationTests, totalUnitTests, authorTestCountData);

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

}

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

export async function populateDetailsTableForMonth(month, testType, details) {
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
                const packagePath = detail.package; // Assuming package path is in the format required
                classLink.href = detail.project.includes('glide-idr') ? `https://code.devsnc.com/dev/glide/blob/track/idrhermes/${detail.project}/src/test/java/${detail.package}/${detail.class}.java` : `https://code.devsnc.com/dev/glide-test/blob/track/idrhermes/${detail.project}/src/test/java/${detail.package}/${detail.class}.java`;
                classLink.target = '_blank';
                classLink.textContent = detail.class;
                const coverageLink = document.createElement('a');
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

// Function to highlight an author row
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

function trimLeadingZeros(numArray1, numArray2, labels) {
    // Ensure all arrays have the same length
    if (numArray1.length !== numArray2.length || numArray1.length !== labels.length) {
        throw new Error("All arrays must have the same length.");
    }

    // Find the first index where at least one of the numeric arrays is non-zero
    let trimIndex = 0;
    while (
        trimIndex < numArray1.length &&
        numArray1[trimIndex] === 0 &&
        numArray2[trimIndex] === 0
        ) {
        trimIndex++;
    }

    // Slice the arrays from the trimIndex to the end
    const trimmedIntegrationCounts = numArray1.slice(trimIndex);
    const trimmedUnitCounts = numArray2.slice(trimIndex);
    const trimmedLabels = labels.slice(trimIndex);

    return {
        trimmedIntegrationCounts,
        trimmedUnitCounts,
        trimmedLabels
    };
}



// Function to generate the class coverage URL
function generateCoverageUrl(testClass, packagePath) {
    // Remove the 'IT' or 'Test' suffix to get the class under test
    const classUnderTest = testClass.replace(/(IT|Test)$/, '');

    // Construct the URL
    const baseUrl = "https://metrics.devsnc.com/code?id=com.snc%3Asonar-glide-idr&branch=track%2Fidrhermes&selected=com.snc%3Asonar-glide-idr%3Amodules%2Fglide%2Fglide-idr%2Fsrc%2Fmain%2Fjava%2F";
    return `${baseUrl}${packagePath}%2F${classUnderTest}.java`;
}