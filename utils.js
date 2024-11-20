// utils.js

export function getUrlParameters() {
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

export function getOrdinalSuffix(day) {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
    }
}

export function groupBy(array, key) {
    return array.reduce((result, currentItem) => {
        const groupKey = currentItem[key];

        if (groupKey === undefined || groupKey === null) {
            // Handle case where the groupKey is undefined or null
            // Optionally, you can choose to skip or assign to a default group
            return result;
        }

        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(currentItem);
        return result;
    }, {});
}

export function displayError(message) {
    alert(message); // Simple alert; consider a better UI in production
}

export function expandCollapsibleContent(contentElement) {
    // Set the height to the scrollHeight
    contentElement.style.height = contentElement.scrollHeight + 'px';

    // After the transition ends, set the height to 'auto'
    contentElement.addEventListener('transitionend', function handler() {
        contentElement.style.height = 'auto';
        contentElement.removeEventListener('transitionend', handler);
    });
}
