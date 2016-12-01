self.onmessage = message => {
    const url = message.data.url;
    const xhr = new XMLHttpRequest();

    xhr.responseType = 'blob';
    xhr.onreadystatechange = () => {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(xhr.response);
        reader.onload = e => {
            const request = indexedDB.open("imageCache", 5);
            const dataUrl = e.target.result;
            request.onsuccess = event => {
                const db = event.target.result;
                db.transaction(['images'], 'readwrite').objectStore('images').add({url, data: dataUrl});
            }
        };
    }

    xhr.open('GET', url, true);
    xhr.send(null);
}
