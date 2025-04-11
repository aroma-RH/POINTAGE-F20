const DB_NAME = 'PointageDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_submissions';
const GROUP_CACHE = 'group_data';

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains(GROUP_CACHE)) {
                db.createObjectStore(GROUP_CACHE, { keyPath: 'id' });
            }
        };

        request.onsuccess = function (event) {
            resolve(event.target.result);
        };

        request.onerror = function (event) {
            reject(event.target.error);
        };
    });
}

function savePendingSubmission(submission) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.add(submission);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    });
}

function getPendingSubmissions() {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    });
}

function deletePendingSubmission(id) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

function saveGroupsToCache(data) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(GROUP_CACHE, 'readwrite');
            const store = tx.objectStore(GROUP_CACHE);
            const request = store.put({ id: 'groupData', data });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    });
}

function getGroupsFromCache() {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(GROUP_CACHE, 'readonly');
            const store = tx.objectStore(GROUP_CACHE);
            const request = store.get('groupData');

            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.data : null);
            };
            request.onerror = () => reject(request.error);
        });
    });
}
