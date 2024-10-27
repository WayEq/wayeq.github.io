
    // Start functions

    // Reset the details table to the default message
    function resetDetailsTable() {
        const detailsTableBody = document.getElementById('detailsTable').getElementsByTagName('tbody')[0];
        detailsTableBody.innerHTML = '';
        const row = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.setAttribute('colspan', 4);
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
    function updateChart(monthlyData, chart) {
        // Filter the data based on selected author and project
        const selectedAuthor = authorFilter.value;
        const selectedProject = projectFilter.value;

        filteredData = monthlyData.map(item => {
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
        filteredData = removeLeadingEmptyMonths(filteredData);
        const filteredLabels = filteredData.map(item => {
            const [year, month] = item.month.split('-');
            const correctedMonth = String(Number(month)).padStart(2, '0');
            return `${year}-${correctedMonth}`;
        });
        chart.data.labels = filteredLabels;
        chart.data.datasets[0].data = filteredData.map(item => item.integration_count);
        chart.data.datasets[1].data = filteredData.map(item => item.unit_count);
        chart.options.onClick = (e) => {
            const activePoints = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
            if (activePoints.length > 0) {
                const { index, datasetIndex } = activePoints[0];

                // Get the selected month from filteredLabels
                const selectedMonth = filteredLabels[index];

                // Find the corresponding details in the filteredData
                const selectedTestType = datasetIndex === 0 ? 'integration' : 'unit';

                // Use the filteredData to get the details for the selected month
                const selectedDetails = filteredData.find(item => {
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
    }

    // Function to generate the class coverage URL
    function generateCoverageUrl(testClass, packagePath) {
        // Remove the 'IT' suffix to get the class under test
        const classUnderTest = testClass.replace(/IT$/, '').replace(/Test$/, '');

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
                noDataCell.setAttribute('colspan', 4);
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
            // Separate out the monthly test data and author test count data
            const monthlyData = data.filter(item => item.month);
            const authorTestCountData = data.find(item => item.author_test_count)?.author_test_count;

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
    monthlyData.forEach(item => {
        item.integration_details.concat(item.unit_details).forEach(detail => {
            allAuthors.add(detail.author);
            allProjects.add(detail.project);
        });
    });

    Array.from(allAuthors).sort().forEach(author => {
        const option = document.createElement('option');
        option.value = author;
        option.textContent = author;
        authorFilter.appendChild(option);
    });

    allProjects.forEach(project => {
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


    // Event listeners for filters - only update the chart, not the details table
    authorFilter.addEventListener('change', () => {
        resetDetailsTable();
        updateChart(monthlyData, chart);
    });

    projectFilter.addEventListener('change', () => {
        resetDetailsTable();
        updateChart(monthlyData, chart);
    });

    })
    .catch(error => console.error('Error loading JSON data:', error));