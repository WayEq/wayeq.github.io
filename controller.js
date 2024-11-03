// Start functions

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
                projectCell.textContent = detail.project ? detail.project : 'N/A';
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

        // Create the pie chart
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
