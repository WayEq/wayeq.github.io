// chart-handling.js

import {populateDetailsTableForMonth } from "./test-authorship.js";

export let testResultsPieChartInstance;
export let testResultsTrendChartInstance = null;
export let authorshipTrendChartInstance = null;
export let authorshipTestTypeChartInstance = null;


export async function renderVelocityAndAuthorshipTrendChart(integrationCounts, unitCounts, details, labels, populateDetailsTableForMonth) {

    // Create the line chart
    const ctx = document.getElementById('testsAddedTrendChart').getContext('2d');
    console.log('Initializing chart with labels:', labels);

    // If the chart already exists, destroy it before creating a new one
    if (authorshipTrendChartInstance) {
        authorshipTrendChartInstance.destroy();
    }

    authorshipTrendChartInstance = new Chart(ctx, {
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
                const activePoints = authorshipTrendChartInstance.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (activePoints.length > 0) {
                    const { index, datasetIndex } = activePoints[0];
                    const selectedMonth = labels[index];
                    const selectedTestType = datasetIndex === 0 ? 'integration' : 'unit';
                    populateDetailsTableForMonth(selectedMonth, selectedTestType, details);
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
}

export async function renderTestExecutionResultTrendChart(failedData, errorData, skippedData, labels) {

    try {
        // Get the context of the canvas
        const ctx = document.getElementById('testResultsTrendChart').getContext('2d');

        // If the chart already exists, destroy it before creating a new one
        if (testResultsTrendChartInstance) {
            testResultsTrendChartInstance.destroy();
        }

        // Create the line chart
        testResultsTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
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
                interaction: {
                    mode: 'point', // Try 'index' or 'point' if 'nearest' doesn't work
                    intersect: false  // Set to false to allow tooltips when not directly intersecting a point
                },
                responsive: true,
                scales: {
                    x: {
                        display: true,
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
                        text: 'Test Issues Trend',
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
    } catch (error) {
        console.error('Error fetching trend data:', error);
    }
}

export function createTestResultsPieChart(passed, failed, error, skipped) {

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

export function updateTestTypesPieChart(filteredData, pieChart) {
    // Calculate total integration and unit tests from filteredData
    const totalIntegrationTests = filteredData.reduce((sum, item) => sum + item.integration_count, 0);
    const totalUnitTests = filteredData.reduce((sum, item) => sum + item.unit_count, 0);
    const totalTests = totalIntegrationTests + totalUnitTests;

    pieChart.data.datasets[0].data = [totalIntegrationTests, totalUnitTests];
    pieChart.update();

    // Update the total tests count in the UI if applicable
    document.getElementById('totalTests').textContent =
        `Total Number of Existing Tests: ${totalTests} (Integration: ${totalIntegrationTests}, Unit: ${totalUnitTests})`;
}


export function showTestTypePieChart(totalIntegrationTests, totalUnitTests) {
    // Create the pie chart with the title
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    if (authorshipTestTypeChartInstance) {
        authorshipTestTypeChartInstance.destroy();
    }

    authorshipTestTypeChartInstance = new Chart(pieCtx, {
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
                    text: 'Test Types',
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

    return authorshipTestTypeChartInstance;
}