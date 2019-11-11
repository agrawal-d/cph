window.addEventListener('message', event => {

    const message = event.data; // The JSON data our extension sent

    switch (message.command) {
        case 'refactor':
            count = Math.ceil(count * 0.5);
            counter.textContent = count;
            break;
    }
});