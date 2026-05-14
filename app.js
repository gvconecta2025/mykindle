if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(error => console.log('Falha SW:', error));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. PWA SYNC
    const btnSync = document.getElementById('btn-sync');
    if (btnSync) {
        btnSync.addEventListener('click', () => {
            btnSync.style.transform = 'rotate(180deg)';
            btnSync.style.transition = 'transform 0.3s ease';
            if ('caches' in window) { caches.keys().then(names => { for (let name of names) { caches.delete(name); } }); }
            setTimeout(() => { window.location.reload(true); }, 300); 
        });
    }

    // 2. SISTEMA DE MEMÓRIA (Salvando a exclusão)
    function salvarDados() {
        const listas = document.querySelectorAll('.task-list');
        const dadosDoApp = [];

        listas.forEach((lista) => {
            const tarefasDaLista = [];
            lista.querySelectorAll('.task-item').forEach(item => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                const texto = item.querySelector('.task-text').textContent.trim(); 
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
                        
                        const opacidade = tarefa.concluido ? '0.4' : '1';
                        const risco = tarefa.concluido ? 'line-through' : 'none';
                        
                        novaLabel.innerHTML = `
                            <div class="task-content" style="opacity: ${opacidade}; text-decoration: ${risco};">
                                <input type="checkbox" ${tarefa.concluido ? 'checked' : ''}> 
                                <span class="task-text">${tarefa.texto}</span>
                            </div>
                            <button class="btn-delete" title="Excluir">×</button>
                        `;
                        lista.appendChild(novaLabel);
                    });
                }
            });
        }
    }

    // 3. MOTOR FRACTAL E EXCLUSÃO
    const barraSemana = document.querySelector('.destaque-fill');
    function atualizarProgresso() {
        const checkboxes = document.querySelectorAll('.task-item input[type="checkbox"]');
        if (!barraSemana) return;

        let concluidas = 0;
        checkboxes.forEach(box => {
            const labelContent = box.parentElement; // Pega a div .task-content
            if (box.checked) {
                concluidas++;
                labelContent.style.opacity = '0.4';
                labelContent.style.textDecoration = 'line-through';
            } else {
                labelContent.style.opacity = '1';
                labelContent.style.textDecoration = 'none';
            }
        });

        // Evita divisão por zero se o usuário deletar todas as tarefas
        const total = checkboxes.length;
        const porcentagem = total > 0 ? (concluidas / total) * 100 : 0;
        barraSemana.style.width = `${porcentagem}%`;
        salvarDados();
    }

    // Escuta cliques na Trincheira (Para Marcar e Deletar)
    const painelTrincheira = document.querySelector('.trincheira-panel');
    if(painelTrincheira) {
        painelTrincheira.addEventListener('click', (e) => {
            // Se clicou no botão de excluir
            if (e.target.classList.contains('btn-delete')) {
                e.preventDefault(); // Evita que o clique também marque o checkbox
                const tarefaItem = e.target.closest('.task-item');
                tarefaItem.remove();
                atualizarProgresso(); // Recalcula e salva
            }
        });

        painelTrincheira.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                atualizarProgresso();
            }
        });
    }

    // 4. ADICIONAR NOVA TAREFA
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
                novaLabel.innerHTML = `
                    <div class="task-content">
                        <input type="checkbox"> 
                        <span class="task-text">${textoTarefa}</span>
                    </div>
                    <button class="btn-delete" title="Excluir">×</button>
                `;
                
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
