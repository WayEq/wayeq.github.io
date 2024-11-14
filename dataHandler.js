// dataHandler.js

const DataHandler = (() => {
    let testRunData = [];
    let allTestResultsData = [];
    let previousTestResultsData = [];
    let monthlyData = [];
    let authorTestCountData = {};

    /**
     * Fetch JSON data from a given URL.
     * @param {string} url - The URL to fetch data from.
     * @returns {Promise<Object>} - The fetched JSON data.
     */
    async function fetchJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            UIController.displayError(`Failed to load data from ${url}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Initialize data by fetching necessary JSON files.
     * @param {string|null} desiredExecution - Specific test run to load.
     */
    async function initializeData(desiredExecution = null) {
        try {
            const indexData = await fetchJSON('test_results/test_results_index.json');
            testRunData = indexData;

            await fetchTestRuns(desiredExecution);
            await loadTestAnalysisResults();

            return {
                testMetadata: allTestResultsData,
                monthlyData,
                authorTestCountData
            };
        } catch (error) {
            console.error('Data initialization error:', error);
        }
    }

    /**
     * Fetch and process test runs.
     * @param {string|null} desiredExecution - Specific test run to load.
     */
    async function fetchTestRuns(desiredExecution = null) {
        try {
            const testRuns = testRunData;
            UIController.populateTestRunSelection(testRuns, desiredExecution);

            if (!desiredExecution && testRuns.length > 0) {
                const latestTestRun = testRuns[testRuns.length - 1];
                await fetchAndDisplayTestResults(latestTestRun.filename);
            } else if (desiredExecution) {
                await fetchAndDisplayTestResults(desiredExecution);
            }

            ChartManager.showTestResultTrendChart();
        } catch (error) {
            console.error('Error fetching test runs:', error);
        }
    }

    /**
     * Fetch and process test analysis results.
     */
    async function loadTestAnalysisResults() {
        try {
            const data = await fetchJSON('test_analysis_results.json');
            allTestResultsData = data.test_metadata;
            monthlyData = data.monthly_aggregates.map(aggregate => {
                const month = aggregate.month;
                const integration_details = data.test_metadata.filter(test => test.test_type === 'integration' && test.timestamp.startsWith(month));
                const unit_details = data.test_metadata.filter(test => test.test_type === 'unit' && test.timestamp.startsWith(month));

                return {
                    month: month,
                    integration_count: integration_details.length,
                    unit_count: unit_details.length,
                    integration_details: integration_details,
                    unit_details: unit_details
                };
            });
            authorTestCountData = data.author_test_count;
        } catch (error) {
            console.error('Error loading test analysis results:', error);
        }
    }

    /**
     * Fetch and display test results for a specific filename.
     * @param {string} filename - The filename of the test run to fetch.
     */
    async function fetchAndDisplayTestResults(filename) {
        try {
            const selectedRunIndex = testRunData.findIndex(run => run.filename === filename);
            let previousRunFilename = null;
            if (selectedRunIndex > 0) {
                previousRunFilename = testRunData[selectedRunIndex - 1].filename;
            }

            const testResultsData = await fetchJSON(`test_results/${filename}`);
            if (previousRunFilename) {
                const prevTestResultsData = await fetchJSON(`test_results/${previousRunFilename}`);
                previousTestResultsData = prevTestResultsData.test_results;
            } else {
                previousTestResultsData = [];
            }

            allTestResultsData = testResultsData.test_results;
            ChartManager.processTestResultsData(allTestResultsData, previousTestResultsData);
            UIController.displayTestMetadata(testResultsData.execution_time, testResultsData.test_branch);
        } catch (error) {
            console.error('Error fetching test results:', error);
        }
    }

    /**
     * Get URL parameters as an object.
     * Example: ?project=snc-idr-test&class=ExampleTest&test=testFailure&execution=test_run_1.json
     * Returns: { project: "snc-idr-test", class: "ExampleTest", test: "testFailure", execution: "test_run_1.json" }
     */
    function getUrlParameters() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');
        for (let pair of pairs) {
            if (pair === "") continue;
            const [key, value] = pair.split('=').map(decodeURIComponent);
            params[key] = value;
        }
        return params;
    }

    return {
        initializeData,
        fetchAndDisplayTestResults,
        getUrlParameters,
        getTestRunData: () => testRunData,
        getAllTestResultsData: () => allTestResultsData,
        getMonthlyData: () => monthlyData,
        getAuthorTestCountData: () => authorTestCountData
    };
})();
