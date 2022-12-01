setTimeout(() => {
    const docs = document.querySelectorAll(".ascii-player");
    for (const doc of docs) {
        const path = doc.getAttribute("data-path");
        window.AsciinemaPlayer.create(
            path,
            doc,
            { terminalFontSize: '30px', fit: 'width', poster: 'npt:1:23', idleTimeLimit: 2, cols: 100, rows: 20 },
        );
    }
}, 10);