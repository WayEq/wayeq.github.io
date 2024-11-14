// main.js

document.addEventListener('DOMContentLoaded', async () => {
    const params = DataHandler.getUrlParameters();
    const desiredExecution = params.execution || null;

    try {
        const data = await DataHandler.initializeData(desiredExecution);

        // Populate Author Test Count Table
        UIController.populateAuthorTestCountTable(data.authorTestCountData);

        // Populate Latest Tests List
        UIController.populateLatestTests(data.testMetadata);

        // Initialize Charts
        await ChartManager.showTestResultsTrendChart();
        await ChartManager.showTestsAddedTrendChart();
        ChartManager.createOverallPieChart(data.monthlyData); // Assuming you want to create this initially

        // Attach Event Listeners for Time Window Radio Buttons
        const timeWindowRadios = document.getElementsByName('timeWindow');
        timeWindowRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                UIController.resetDetailsTable();
                ChartManager.showTestResultsTrendChart();
                ChartManager.showTestsAddedTrendChart();
                ChartManager.createOverallPieChart(DataHandler.getMonthlyData());
            });
        });

        // Attach Event Listener for Toggle Details Button
        const toggleDetailsButton = document.getElementById('toggleDetailsButton');
        const collapsibleContent = document.getElementById('collapsibleContent');

        toggleDetailsButton.addEventListener('click', () => {
            if (collapsibleContent.classList.contains('expanded')) {
                // Collapse the content
                collapsibleContent.style.height = collapsibleContent.scrollHeight + 'px';
                collapsibleContent.offsetHeight; // Trigger reflow
                collapsibleContent.style.height = '0';
                collapsibleContent.classList.remove('expanded');
                toggleDetailsButton.textContent = 'Show Details';
            } else {
                // Expand the content
                collapsibleContent.classList.add('expanded');
                toggleDetailsButton.textContent = 'Hide Details';
                expandCollapsibleContent();
            }
        });

    } catch (error) {
        console.error('Initialization error:', error);
    }
});

/**
 * Expand the collapsible content with smooth transition.
 */
function expandCollapsibleContent() {
    const collapsibleContent = document.getElementById('collapsibleContent');
    collapsibleContent.style.height = collapsibleContent.scrollHeight + 'px';

    collapsibleContent.addEventListener('transitionend', function handler() {
        collapsibleContent.style.height = 'auto';
        collapsibleContent.removeEventListener('transitionend', handler);
    });
}
