// data-fetching.js

import { displayError } from './utils.js';

export async function loadExecutionIndex(desiredExecution = null) {
    try {
        const response = await fetch('test_results/test_results_index.json');
        return await response.json();
    } catch (error) {
        console.error('Error fetching test runs:', error);
        displayError(`Failed to fetch test runs: ${error.message}`);
    }
}

export async function loadExecutionData(desiredExecution = null) {
    try {
        const response = await fetch(`test_results/${desiredExecution}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching test runs:', error);
        displayError(`Failed to fetch test runs: ${error.message}`);
    }
}

export async function loadCommitDeltas() {
    try {
        const response = await fetch('commit_deltas.json');
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return  await response.json();
    } catch (error) {
        console.error('Error loading commit deltas:', error);
        displayError(`Failed to load commit deltas: ${error.message}`);
    }
}

export async function loadTestAuthorship(repo, commitHash) {
    try {
        const response = await fetch('test_analysis_results.json');
        return await response.json();
    } catch (error) {
        console.error('Error fetching test authorship:', error);
        displayError(`Failed to fetch test authorship: ${error.message}`);
    }
}