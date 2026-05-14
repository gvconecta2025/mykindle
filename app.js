document.addEventListener('DOMContentLoaded', () => {
    // Captura o botão de sincronização no menu lateral
    const btnSync = document.getElementById('btn-sync');

    if (btnSync) {
        btnSync.addEventListener('click', () => {
            // 1. Feedback Visual: Gira o ícone em 180 graus
            btnSync.style.transform = 'rotate(180deg)';
            btnSync.style.transition = 'transform 0.3s ease';
            
            // 2. Limpeza Profunda: Apaga o cache de Service Workers (Essencial para PWAs)
            if ('caches' in window) {
                caches.keys().then(names => {
                    for (let name of names) {
                        caches.delete(name);
                    }
                });
            }
            
            // 3. O "Ctrl + F5" via código: Recarrega a página ignorando o cache
            setTimeout(() => {
                window.location.reload(true);
            }, 300); // Aguarda 300ms apenas para a animação do botão ser vista
        });
    }
});
