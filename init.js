// init.js

import {getUrlParameters} from './utils.js';
import {loadCommitDeltas, loadExecutionData, loadExecutionIndex, loadTestAuthorship} from './data-fetching.js';
import {addTestExecutionResultEventListeners, addTestVelocityAndAuthorshipEventListeners} from './event-listeners.js';
import {displayTestResultsForExecution, populateTestExecutionDropdown} from './test-results.js';
import {populateCommitDeltasTable} from "./commit-deltas.js";
import {renderTestVelocityAndAuthorshipSection} from "./test-authorship.js";


export async function init() {
    const params = getUrlParameters();
    const executionFileName = params.execution || null;
    const comparedExecutionFileName = params.compared || null;

    try {

        // Data Loading
        const commitDeltaData = await loadCommitDeltas();
        const executionIndexData = await loadExecutionIndex(executionFileName);
        const testAuthorshipData = await loadTestAuthorship(executionFileName);


        let resolvedComparedExecutionFileName = comparedExecutionFileName;
        if (executionIndexData.length > 1 && comparedExecutionFileName === null)
            resolvedComparedExecutionFileName = executionIndexData[executionIndexData.length - 2].filename;
        if (executionIndexData.length > 0) {
            let resolvedExecutionFileName = executionFileName === null ? executionIndexData[executionIndexData.length - 1].filename : executionFileName;
            const executionData = await loadExecutionData(resolvedExecutionFileName);
            await populateTestExecutionDropdown(resolvedExecutionFileName, executionIndexData);
            await displayTestResultsForExecution(resolvedExecutionFileName, resolvedComparedExecutionFileName, executionIndexData, executionData);
            await populateCommitDeltasTable(resolvedExecutionFileName, resolvedComparedExecutionFileName, commitDeltaData);
            await addTestExecutionResultEventListeners(executionIndexData, commitDeltaData)
        }

        await renderTestVelocityAndAuthorshipSection(testAuthorshipData, 'all', 'all', 'all');
        addTestVelocityAndAuthorshipEventListeners(commitDeltaData, testAuthorshipData);
    } catch (error) {
        console.error('Initialization error:', error);
    }
}
init().then(() => {});