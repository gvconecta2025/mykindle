document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================
    // 1. SISTEMA DE ATUALIZAÇÃO DO PWA (Botão Sincronizar)
    // =========================================================
    const btnSync = document.getElementById('btn-sync');

    if (btnSync) {
        btnSync.addEventListener('click', () => {
            // Feedback Visual do Botão
            btnSync.style.transform = 'rotate(180deg)';
            btnSync.style.transition = 'transform 0.3s ease';
            
            // Limpa Cache
            if ('caches' in window) {
                caches.keys().then(names => {
                    for (let name of names) {
                        caches.delete(name);
                    }
                });
            }
            
            // Recarrega a página
            setTimeout(() => {
                window.location.reload(true);
            }, 300); 
        });
    }

    // =========================================================
    // 2. MOTOR FRACTAL: INTERLIGANDO TRINCHEIRA E BÚSSOLA
    // =========================================================
    
    // Captura todos os checkboxes da tela (Tempos A, B e C)
    const checkboxes = document.querySelectorAll('.task-item input[type="checkbox"]');
    
    // Captura a barra de progresso da "ESTA SEMANA" no painel esquerdo
    const barraSemana = document.querySelector('.destaque-fill');

    // Função que calcula e atualiza o progresso
    function atualizarProgresso() {
        if (checkboxes.length === 0 || !barraSemana) return;

        let concluidas = 0;
        
        // Conta quantas tarefas estão marcadas
        checkboxes.forEach(box => {
            if (box.checked) concluidas++;
        });

        // Calcula a porcentagem exata (Regra de 3 básica)
        const porcentagem = (concluidas / checkboxes.length) * 100;

        // Atualiza a largura da barra de progresso com animação
        barraSemana.style.width = `${porcentagem}%`;
        
        // Aplica o feedback visual na Trincheira (risca as tarefas feitas)
        checkboxes.forEach(box => {
            const label = box.parentElement; // Pega o cardzinho da tarefa
            if (box.checked) {
                label.style.opacity = '0.4';
                label.style.textDecoration = 'line-through';
            } else {
                label.style.opacity = '1';
                label.style.textDecoration = 'none';
            }
        });
    }

    // "Escuta" os cliques do usuário em qualquer tarefa
    checkboxes.forEach(box => {
        box.addEventListener('change', atualizarProgresso);
    });

    // Roda a verificação uma vez assim que o site abre para ajustar a barra
    // caso já existam checkboxes marcados no HTML original
    atualizarProgresso();

});
