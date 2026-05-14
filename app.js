document.addEventListener('DOMContentLoaded', () => {
    
    // =========================================================
    // 1. SISTEMA DE ATUALIZAÇÃO DO PWA
    // =========================================================
    const btnSync = document.getElementById('btn-sync');
    if (btnSync) {
        btnSync.addEventListener('click', () => {
            btnSync.style.transform = 'rotate(180deg)';
            btnSync.style.transition = 'transform 0.3s ease';
            if ('caches' in window) {
                caches.keys().then(names => {
                    for (let name of names) { caches.delete(name); }
                });
            }
            setTimeout(() => { window.location.reload(true); }, 300); 
        });
    }

    // =========================================================
    // 2. MOTOR FRACTAL: ATUALIZAR PROGRESSO E RISCAR TAREFA
    // =========================================================
    const barraSemana = document.querySelector('.destaque-fill');

    function atualizarProgresso() {
        const checkboxes = document.querySelectorAll('.task-item input[type="checkbox"]');
        if (checkboxes.length === 0 || !barraSemana) return;

        let concluidas = 0;
        
        checkboxes.forEach(box => {
            const label = box.parentElement;
            if (box.checked) {
                concluidas++;
                label.style.opacity = '0.4';
                label.style.textDecoration = 'line-through';
            } else {
                label.style.opacity = '1';
                label.style.textDecoration = 'none';
            }
        });

        const porcentagem = (concluidas / checkboxes.length) * 100;
        barraSemana.style.width = `${porcentagem}%`;
    }

    // Delegação de eventos: Escuta cliques em qualquer lugar da Trincheira
    const painelTrincheira = document.querySelector('.trincheira-panel');
    if(painelTrincheira) {
        painelTrincheira.addEventListener('change', (e) => {
            // Se o clique foi em um checkbox, atualiza o progresso
            if (e.target.type === 'checkbox') {
                atualizarProgresso();
            }
        });
    }

    // =========================================================
    // 3. INJEÇÃO DE DINAMISMO: ADICIONAR NOVA TAREFA
    // =========================================================
    const botoesAdicionar = document.querySelectorAll('.btn-add');

    botoesAdicionar.forEach(botao => {
        botao.addEventListener('click', (e) => {
            // Pega a caixa de formulário atual e a lista correspondente a ela
            const formContainer = e.target.parentElement;
            const inputField = formContainer.querySelector('.input-tarefa');
            const taskList = formContainer.previousElementSibling; // A div .task-list que fica logo acima
            
            const textoTarefa = inputField.value.trim();

            if (textoTarefa !== '') {
                // Cria o HTML da nova tarefa
                const novaLabel = document.createElement('label');
                novaLabel.className = 'task-item';
                novaLabel.innerHTML = `<input type="checkbox"> ${textoTarefa}`;
                
                // Adiciona na lista visualmente
                taskList.appendChild(novaLabel);
                
                // Limpa o campo para a próxima
                inputField.value = '';
                
                // Recalcula o progresso (pois o número total de tarefas mudou)
                atualizarProgresso();
            }
        });

        // Permite adicionar apertando "Enter" no teclado
        const inputF = botao.parentElement.querySelector('.input-tarefa');
        inputF.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                botao.click();
            }
        });
    });

    // Roda uma vez no início para ajustar os itens que já vêm carregados no HTML
    atualizarProgresso();
});
