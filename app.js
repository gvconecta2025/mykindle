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
    // 2. SISTEMA DE MEMÓRIA (LOCAL STORAGE)
    // =========================================================
    
    // Função para SALVAR o estado atual de todas as listas no dispositivo
    function salvarDados() {
        const listas = document.querySelectorAll('.task-list');
        const dadosDoApp = [];

        listas.forEach((lista) => {
            const tarefasDaLista = [];
            // Varre cada tarefa dentro desta lista
            lista.querySelectorAll('.task-item').forEach(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                const texto = item.textContent.trim(); // Pega apenas o texto, sem o HTML
                tarefasDaLista.push({ 
                    texto: texto, 
                    concluido: checkbox.checked 
                });
            });
            dadosDoApp.push(tarefasDaLista);
        });

        // Converte os dados em texto e salva no cofre do navegador
        localStorage.setItem('fractal_trincheira_estado', JSON.stringify(dadosDoApp));
    }

    // Função para CARREGAR os dados salvos quando o app abre
    function carregarDados() {
        const dadosSalvos = localStorage.getItem('fractal_trincheira_estado');
        
        if (dadosSalvos) {
            const dadosDoApp = JSON.parse(dadosSalvos);
            const listas = document.querySelectorAll('.task-list');

            listas.forEach((lista, index) => {
                if (dadosDoApp[index]) {
                    lista.innerHTML = ''; // Limpa as tarefas genéricas do HTML original
                    
                    // Reconstrói as tarefas baseadas na memória salva
                    dadosDoApp[index].forEach(tarefa => {
                        const novaLabel = document.createElement('label');
                        novaLabel.className = 'task-item';
                        
                        // Restaura o visual de "concluído" se estava marcado
                        if (tarefa.concluido) {
                            novaLabel.style.opacity = '0.4';
                            novaLabel.style.textDecoration = 'line-through';
                        }
                        
                        novaLabel.innerHTML = `<input type="checkbox" ${tarefa.concluido ? 'checked' : ''}> ${tarefa.texto}`;
                        lista.appendChild(novaLabel);
                    });
                }
            });
        }
    }


    // =========================================================
    // 3. MOTOR FRACTAL: ATUALIZAR PROGRESSO
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
        
        // Sempre que o progresso muda, nós salvamos o estado atual
        salvarDados();
    }

    // Escuta cliques nos checkboxes em toda a Trincheira
    const painelTrincheira = document.querySelector('.trincheira-panel');
    if(painelTrincheira) {
        painelTrincheira.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                atualizarProgresso();
            }
        });
    }

    // =========================================================
    // 4. INJEÇÃO DE DINAMISMO: ADICIONAR NOVA TAREFA
    // =========================================================
    const botoesAdicionar = document.querySelectorAll('.btn-add');

    botoesAdicionar.forEach(botao => {
        botao.addEventListener('click', (e) => {
            const formContainer = e.target.parentElement;
            const inputField = formContainer.querySelector('.input-tarefa');
            const taskList = formContainer.previousElementSibling; 
            
            const textoTarefa = inputField.value.trim();

            if (textoTarefa !== '') {
                const novaLabel = document.createElement('label');
                novaLabel.className = 'task-item';
                novaLabel.innerHTML = `<input type="checkbox"> ${textoTarefa}`;
                
                taskList.appendChild(novaLabel);
                inputField.value = '';
                
                // Atualiza o progresso e já salva a nova tarefa na memória
                atualizarProgresso();
            }
        });

        const inputF = botao.parentElement.querySelector('.input-tarefa');
        inputF.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                botao.click();
            }
        });
    });

    // =========================================================
    // 5. INICIALIZAÇÃO DO APP
    // =========================================================
    carregarDados();     // 1º Puxa os dados da memória
    atualizarProgresso(); // 2º Recalcula a barra e salva
});
