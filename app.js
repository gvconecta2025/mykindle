// =========================================================
// REGISTRO DO SERVICE WORKER (Para instalar e rodar offline)
// =========================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('PWA registrado com sucesso! Escopo:', registration.scope);
            })
            .catch(error => {
                console.log('Falha ao registrar o PWA:', error);
            });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. SISTEMA DE ATUALIZAÇÃO DO PWA (Botão Sincronizar)
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

    // 2. SISTEMA DE MEMÓRIA (LOCAL STORAGE)
    function salvarDados() {
        const listas = document.querySelectorAll('.task-list');
        const dadosDoApp = [];

        listas.forEach((lista) => {
            const tarefasDaLista = [];
            lista.querySelectorAll('.task-item').forEach(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                const texto = item.textContent.trim(); 
                tarefasDaLista.push({ texto: texto, concluido: checkbox.checked });
            });
            dadosDoApp.push(tarefasDaLista);
        });
        localStorage.setItem('fractal_trincheira_estado', JSON.stringify(dadosDoApp));
    }

    function carregarDados() {
        const dadosSalvos = localStorage.getItem('fractal_trincheira_estado');
        if (dadosSalvos) {
            const dadosDoApp = JSON.parse(dadosSalvos);
            const listas = document.querySelectorAll('.task-list');

            listas.forEach((lista, index) => {
                if (dadosDoApp[index]) {
                    lista.innerHTML = ''; 
                    dadosDoApp[index].forEach(tarefa => {
                        const novaLabel = document.createElement('label');
                        novaLabel.className = 'task-item';
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

    // 3. MOTOR FRACTAL: ATUALIZAR PROGRESSO
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
        salvarDados();
    }

    const painelTrincheira = document.querySelector('.trincheira-panel');
    if(painelTrincheira) {
        painelTrincheira.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                atualizarProgresso();
            }
        });
    }

    // 4. INJEÇÃO DE DINAMISMO: ADICIONAR NOVA TAREFA
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
                atualizarProgresso();
            }
        });

        const inputF = botao.parentElement.querySelector('.input-tarefa');
        inputF.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') { botao.click(); }
        });
    });

    // 5. INICIALIZAÇÃO
    carregarDados();     
    atualizarProgresso(); 
});
