// commit-deltas.js

export async function populateCommitDeltasTable(executionFileName, comparedExecutionFileName, commitDeltasData) {
    "use strict";
    const tableBody = document.querySelector('#commitDeltasTable tbody');
    tableBody.innerHTML = ''; // Clear existing content

    // Find the corresponding commit delta entry
    const commitDeltaEntry = commitDeltasData.find(entry => entry.to_filename === executionFileName && entry.from_filename === comparedExecutionFileName);

    if (commitDeltaEntry) {
        const { glide_commits, glide_test_commits } = commitDeltaEntry;

        // Combine commits from both repositories
        const allCommits = [
            ...glide_commits.map(commit => ({ repo: 'glide', ...commit })),
            ...glide_test_commits.map(commit => ({ repo: 'glide-test', ...commit }))
        ];

        if (allCommits.length > 0) {
            allCommits.forEach(commit => {
                const row = document.createElement('tr');

                // Repository
                const repoCell = document.createElement('td');
                repoCell.textContent = commit.repo;
                row.appendChild(repoCell);

                // Commit Hash (with link to commit)
                const commitCell = document.createElement('td');
                const commitLink = document.createElement('a');
                commitLink.href = generateCommitUrl(commit.repo, commit.commit);
                commitLink.target = '_blank';
                commitLink.textContent = commit.commit.substring(0, 7); // Shorten hash for display
                commitCell.appendChild(commitLink);
                row.appendChild(commitCell);

                // Author
                const authorCell = document.createElement('td');
                authorCell.textContent = commit.author;
                row.appendChild(authorCell);

                // Date
                const dateCell = document.createElement('td');
                dateCell.textContent = new Date(commit.date).toLocaleString();
                row.appendChild(dateCell);

                // Message
                const messageCell = document.createElement('td');
                messageCell.textContent = commit.message;
                row.appendChild(messageCell);

                tableBody.appendChild(row);
            });
        } else {
            const row = document.createElement('tr');
            const noDataCell = document.createElement('td');
            noDataCell.setAttribute('colspan', 5);
            noDataCell.textContent = 'No new commits between the selected test run and the previous one.';
            row.appendChild(noDataCell);
            tableBody.appendChild(row);
        }
    } else {
        const row = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.setAttribute('colspan', 5);
        noDataCell.textContent = 'Commit data not available for the selected test run.';
        row.appendChild(noDataCell);
        tableBody.appendChild(row);
    }

}

export function generateCommitUrl(repo, commitHash) {
    "use strict";
    let baseUrl;
    if (repo === 'glide') {
        baseUrl = 'https://code.devsnc.com/dev/glide/commit/';
    } else if (repo === 'glide-test') {
        baseUrl = 'https://code.devsnc.com/dev/glide-test/commit/';
    } else {
        baseUrl = '#';
    }
    return `${baseUrl}${commitHash}`;
}
