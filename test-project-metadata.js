async function fetchProjectMetrics() {
    try {
        const response = await fetch('test_project_metrics.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const metricsData = await response.json();
        return metricsData;
    } catch (error) {
        console.error('Failed to fetch project metrics:', error);
        return [];
    }
}

function showIgnoredTestsModal(projectName, ignoredTests) {
    const modal = document.getElementById('ignoredTestsModal');
    const modalTitle = document.getElementById('ignoredTestsModalTitle');
    const modalBody = document.getElementById('ignoredTestsModalBody');
    const closeModal = document.getElementById('closeIgnoredTestsModal');

    // Set the title
    modalTitle.innerText = `Ignored Tests in ${projectName}`;

    // Clear previous content
    modalBody.innerHTML = '';

    if (!ignoredTests || ignoredTests.length === 0) {
        modalBody.innerHTML = '<p>No ignored tests available.</p>';
    } else {
        // Create a table to display the ignored tests
        const table = document.createElement('table');
        table.classList.add('ignored-tests-table');
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Class Name</th>
                <th>Test Method</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        ignoredTests.forEach(test => {
            const row = document.createElement('tr');

            // Class Name
            const classCell = document.createElement('td');
            classCell.textContent = test.class_name;
            row.appendChild(classCell);

            // Test Method
            const methodCell = document.createElement('td');
            methodCell.textContent = test.method_name;
            row.appendChild(methodCell);

            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        modalBody.appendChild(table);
    }

    // Show the modal
    modal.style.display = 'block';

    // Close the modal when the user clicks the close button
    closeModal.onclick = () => {
        modal.style.display = 'none';
    };

    // Close the modal when the user clicks outside of the modal content
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

export async function populateProjectMetrics() {
    const metricsData = await fetchProjectMetrics();
    const projectMetricsFilter = document.getElementById('projectMetricsFilter');
    const totalClassesCount = document.getElementById('totalClassesCount');
    const totalCasesCount = document.getElementById('totalCasesCount');
    const totalIgnoredCount = document.getElementById('totalIgnoredCount');
    const ignoredPercentage = document.getElementById('ignoredPercentage');
    const projectsMetricsTableBody = document.querySelector('#projectsMetricsTable tbody');

    // Populate project filter options
    const projectNames = metricsData.map(metric => metric.project_name);
    projectNames.forEach(projectName => {
        const option = document.createElement('option');
        option.value = projectName;
        option.textContent = projectName;
        projectMetricsFilter.appendChild(option);
    });

    // Function to update metrics based on selected project
    function updateMetrics() {
        const selectedProject = projectMetricsFilter.value;
        let filteredMetrics = metricsData;

        if (selectedProject !== 'all') {
            filteredMetrics = metricsData.filter(metric => metric.project_name === selectedProject);
        }

        // Calculate aggregate metrics
        const totalClasses = filteredMetrics.reduce((sum, metric) => sum + metric.total_classes, 0);
        const totalCases = filteredMetrics.reduce((sum, metric) => sum + metric.total_cases, 0);
        const totalIgnored = filteredMetrics.reduce((sum, metric) => sum + metric.total_ignored, 0);
        const ignoredPercent = totalCases > 0 ? ((totalIgnored / totalCases) * 100).toFixed(2) : 0;

        // Update summary cards
        totalClassesCount.textContent = totalClasses;
        totalCasesCount.textContent = totalCases;
        totalIgnoredCount.textContent = totalIgnored;
        ignoredPercentage.textContent = `${ignoredPercent}%`;

        // Populate table
        projectsMetricsTableBody.innerHTML = '';
        filteredMetrics.forEach(metric => {
            const row = document.createElement('tr');

            // Project Name
            const projectCell = document.createElement('td');
            projectCell.textContent = metric.project_name;
            row.appendChild(projectCell);

            // Total Test Classes
            const classesCell = document.createElement('td');
            classesCell.textContent = metric.total_classes;
            row.appendChild(classesCell);

            // Total Test Cases
            const casesCell = document.createElement('td');
            casesCell.textContent = metric.total_cases;
            row.appendChild(casesCell);

            // Ignored Tests (Clickable)
            const ignoredCell = document.createElement('td');
            ignoredCell.textContent = metric.total_ignored;
            if (metric.total_ignored > 0) {
                ignoredCell.classList.add('clickable');
                ignoredCell.title = 'Click to view ignored tests';
                ignoredCell.addEventListener('click', () => {
                    showIgnoredTestsModal(metric.project_name, metric.ignored_tests);
                });
            }
            row.appendChild(ignoredCell);

            // Ignored Percentage
            const percentageCell = document.createElement('td');
            percentageCell.textContent = `${metric.ignored_percentage}%`;
            row.appendChild(percentageCell);

            projectsMetricsTableBody.appendChild(row);
        });
    }

    // Event listener for project filter
    projectMetricsFilter.addEventListener('change', updateMetrics);

    // Initial population
    updateMetrics();

    // Call the function after fetching metrics
    createTestCasesPieChart(metricsData);
}

function createTestCasesPieChart(metricsData) {
    const ctx = document.getElementById('testCasesPieChart').getContext('2d');
    const projectNames = metricsData.map(metric => metric.project_name);
    const totalCases = metricsData.map(metric => metric.total_cases);

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: projectNames,
            datasets: [{
                data: totalCases,
                backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'],
                hoverBackgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'Test Cases Distribution by Project'
            }
        }
    });
}



