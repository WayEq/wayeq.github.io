// chartManager.js

const ChartManager = (() => {
    let testResultsTrendChartInstance;
    let testResultsPieChartInstance;
    let overallPieChartInstance;
    let testsAddedTrendChartInstance;

    /**
     * Show the Test Results Trend Chart.
     */
    async function showTestResultsTrendChart() {
        try {
            const testRuns = DataHandler.getTestRunData();
            const labels = [];
            const passedData = [];
            const failedData = [];
            const errorData = [];
            const skippedData = [];

            // Sort the testRuns by execution_time
            testRuns.sort((a, b) => new Date(a.execution_time) - new Date(b.execution_time));

            testRuns.forEach(run => {
                const date = new Date(run.execution_time);
                const month = date.toLocaleString('default', { month: 'short' }); // e.g., 'Nov'
                const day = date.getDate();
                const ordinal = UIController.getOrdinalSuffix(day);
                const hours = date.getHours();
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'pm' : 'am';
                const formattedHours = hours % 12 || 12; // Convert to 12-hour format
                const formattedDate = `${month} ${day}${ordinal}, ${formattedHours}:${minutes}${ampm}`;
                labels.push(formattedDate);
                passedData.push(run.counts.passed);
                failedData.push(run.counts.failed);
                errorData.push(run.counts.error);
                skippedData.push(run.counts.skipped);
            });

            const ctx = document.getElementById('testResultsTrendChart').getContext('2d');

            if (testResultsTrendChartInstance) {
                testResultsTrendChartInstance.destroy();
            }

            testResultsTrendChartInstance = new Chart(ctx, {
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
                        title: {
                            display: true,
                            text: 'Test Execution Trend',
                            font: {
                                size: 18,
                                weight: 'bold'
                            },
                            padding: {
                                top: 10,
                                bottom: 30
                            },
                            color: '#333'
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    size: 12
                                }
                            }
                        }
                    },
                    onClick: handleTestResultsTrendChartClick
                }
            });
        }

        /**
         * Handle click events on the Test Results Trend Chart.
         * @param {Object} event - The click event.
         */
        function handleTestResultsTrendChartClick(event) {
            const chart = testResultsTrendChartInstance;
            const activePoints = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
            if (activePoints.length > 0) {
                const { index, datasetIndex } = activePoints[0];
                const selectedMonth = chart.data.labels[index];
                const selectedTestType = datasetIndex === 0 ? 'integration' : 'unit'; // Adjust based on your logic
                const details = DataHandler.getMonthlyData()[index]; // Ensure this aligns with your data structure

                UIController.populateDetails(selectedMonth, selectedTestType, {
                    [selectedMonth]: details
                });
            }
        }

        /**
         * Create or update the Test Results Pie Chart.
         * @param {number} passed - Number of passed tests.
         * @param {number} failed - Number of failed tests.
         * @param {number} error - Number of errored tests.
         * @param {number} skipped - Number of skipped tests.
         */
        function createTestResultsPieChart(passed, failed, error, skipped) {
            const ctx = document.getElementById('testResultsPieChart').getContext('2d');

            if (testResultsPieChartInstance) {
                testResultsPieChartInstance.destroy();
            }

            testResultsPieChartInstance = new Chart(ctx, {
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
                        title: {
                            display: true,
                            text: 'Test Results Distribution',
                            font: {
                                size: 18,
                                weight: 'bold'
                            },
                            padding: {
                                top: 10,
                                bottom: 30
                            },
                            color: '#333'
                        },
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

        /**
         * Create or update the Overall Pie Chart.
         * This chart corresponds to the <canvas id="pieChart"> in your latest HTML.
         * @param {Array} filteredData - Filtered monthly data.
         */
        function createOverallPieChart(filteredData) {
            const totalIntegrationTests = filteredData.reduce((sum, item) => sum + item.integration_count, 0);
            const totalUnitTests = filteredData.reduce((sum, item) => sum + item.unit_count, 0);
            const totalTests = totalIntegrationTests + totalUnitTests;

            const ctx = document.getElementById('pieChart').getContext('2d');

            if (overallPieChartInstance) {
                overallPieChartInstance.destroy();
            }

            overallPieChartInstance = new Chart(ctx, {
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
                        title: {
                            display: true,
                            text: 'Overall Test Distribution',
                            font: {
                                size: 18,
                                weight: 'bold'
                            },
                            padding: {
                                top: 10,
                                bottom: 30
                            },
                            color: '#333'
                        },
                        legend: {
                            position: 'right',
                            labels: {
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });

            // Update the total tests count in the UI
            document.getElementById('totalTests').textContent =
                `Total Number of Existing Tests: ${totalTests} (Integration: ${totalIntegrationTests}, Unit: ${totalUnitTests})`;
        }

        /**
         * Show the Tests Added Trend Chart.
         * This corresponds to <canvas id="testsAddedTrendChart"> in your latest HTML.
         */
        async function showTestsAddedTrendChart() {
            try {
                const monthlyData = DataHandler.getMonthlyData();
                const labels = monthlyData.map(item => item.month);
                const integrationCounts = monthlyData.map(item => item.integration_count);
                const unitCounts = monthlyData.map(item => item.unit_count);

                const ctx = document.getElementById('testsAddedTrendChart').getContext('2d');

                if (testsAddedTrendChartInstance) {
                    testsAddedTrendChartInstance.destroy();
                }

                testsAddedTrendChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Integration Tests Added',
                                data: integrationCounts,
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
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
                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
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
                            },
                            title: {
                                display: true,
                                text: 'Tests Added Over Time',
                                font: {
                                    size: 18,
                                    family: "'Roboto', sans-serif",
                                    weight: 'bold'
                                },
                                padding: {
                                    top: 10,
                                    bottom: 30
                                },
                                color: '#333'
                            }
                        },
                        onClick: handleTestsAddedTrendChartClick,
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
            } catch (error) {
                console.error('Error in showTestsAddedTrendChart:', error);
            }
        }

        /**
         * Handle click events on the Tests Added Trend Chart.
         * @param {Object} event - The click event.
         */
        function handleTestsAddedTrendChartClick(event) {
            const chart = testsAddedTrendChartInstance;
            const activePoints = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
            if (activePoints.length > 0) {
                const { index, datasetIndex } = activePoints[0];
                const selectedMonth = chart.data.labels[index];
                const selectedTestType = datasetIndex === 0 ? 'integration' : 'unit';
                const details = DataHandler.getMonthlyData()[index]; // Ensure this aligns with your data structure

                UIController.populateDetails(selectedMonth, selectedTestType, {
                    [selectedMonth]: details
                });
            }
        }

        /**
         * Create or update the Overall Pie Chart.
         * This corresponds to the <canvas id="pieChart"> in your latest HTML.
         * @param {Array} filteredData - Filtered monthly data.
         */
        function createOverallPieChart(filteredData) {
            const totalIntegrationTests = filteredData.reduce((sum, item) => sum + item.integration_count, 0);
            const totalUnitTests = filteredData.reduce((sum, item) => sum + item.unit_count, 0);
            const totalTests = totalIntegrationTests + totalUnitTests;

            const ctx = document.getElementById('pieChart').getContext('2d');

            if (overallPieChartInstance) {
                overallPieChartInstance.destroy();
            }

            overallPieChartInstance = new Chart(ctx, {
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
                        title: {
                            display: true,
                            text: 'Overall Test Distribution',
                            font: {
                                size: 18,
                                weight: 'bold'
                            },
                            padding: {
                                top: 10,
                                bottom: 30
                            },
                            color: '#333'
                        },
                        legend: {
                            position: 'right',
                            labels: {
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });

            // Update the total tests count in the UI
            document.getElementById('totalTests').textContent =
                `Total Number of Existing Tests: ${totalTests} (Integration: ${totalIntegrationTests}, Unit: ${totalUnitTests})`;
        }

        /**
         * Show the Tests Added Trend Chart.
         * This corresponds to <canvas id="testsAddedTrendChart"> in your latest HTML.
         */
        async function showTestsAddedTrendChart() {
            try {
                const monthlyData = DataHandler.getMonthlyData();
                const labels = monthlyData.map(item => item.month);
                const integrationCounts = monthlyData.map(item => item.integration_count);
                const unitCounts = monthlyData.map(item => item.unit_count);

                const ctx = document.getElementById('testsAddedTrendChart').getContext('2d');

                if (testsAddedTrendChartInstance) {
                    testsAddedTrendChartInstance.destroy();
                }

                testsAddedTrendChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [
                            {
                                label: 'Integration Tests Added',
                                data: integrationCounts,
                                borderColor: 'rgba(75, 192, 192, 1)',
                                backgroundColor: 'rgba(75, 192, 192, 0.2)',
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
                                backgroundColor: 'rgba(255, 99, 132, 0.2)',
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
                            },
                            title: {
                                display: true,
                                text: 'Tests Added Over Time',
                                font: {
                                    size: 18,
                                    family: "'Roboto', sans-serif",
                                    weight: 'bold'
                                },
                                padding: {
                                    top: 10,
                                    bottom: 30
                                },
                                color: '#333'
                            }
                        },
                        onClick: handleTestsAddedTrendChartClick,
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
            } catch (error) {
                console.error('Error in showTestsAddedTrendChart:', error);
            }
        }

        return {
            showTestResultsTrendChart,
            createTestResultsPieChart,
            createOverallPieChart,
            showTestsAddedTrendChart,
            processTestResultsData
        };
    })();
