// =========================================================
// 1. IMPORTAÇÕES DO FIREBASE (Nuvem)
// =========================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

// SUAS CHAVES DO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyCHK6pA45hCN1_X3WHpbWMNoADc7-7JmcQ",
  authDomain: "cincoanos-4c824.firebaseapp.com",
  projectId: "cincoanos-4c824",
  storageBucket: "cincoanos-4c824.firebasestorage.app",
  messagingSenderId: "236919232015",
  appId: "1:236919232015:web:a8dc70e9ee0b66630ef57a",
  measurementId: "G-1LBB83ZW9W"
};

// INICIALIZA O APLICATIVO NA NUVEM
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// VARIAVEL GLOBAL PARA SABER QUEM ESTÁ LOGADO
let usuarioLogado = null;

// =========================================================
// 2. SISTEMA DE AUTENTICAÇÃO (Login / Logout)
// =========================================================
const loginScreen = document.getElementById('login-screen');
const appDashboard = document.getElementById('app-dashboard');
const btnLoginGoogle = document.getElementById('btn-login-google');
const btnLogout = document.getElementById('btn-logout');
const userAvatar = document.getElementById('user-avatar');

// Escuta as mudanças de conta (Se entrou ou saiu)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuário logado
        usuarioLogado = user;
        loginScreen.classList.add('hidden');
        appDashboard.classList.remove('hidden');
        userAvatar.src = user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        
        // Puxar dados da nuvem ao invés do localStorage
        await puxarDadosDaNuvem();
        atualizarProgressoTrincheira();
    } else {
        // Ninguém logado
        usuarioLogado = null;
        appDashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

// Ação do Botão Entrar
btnLoginGoogle.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => alert("Erro ao fazer login: " + error.message));
});

// Ação do Botão Sair
btnLogout.addEventListener('click', () => {
    signOut(auth);
});

// =========================================================
// 3. SISTEMA DE BANCO DE DADOS (Firestore)
// =========================================================

// Função mestre que envia TUDO para o Firebase
async function salvarNaNuvem() {
    if (!usuarioLogado) return;

    // 1. Coleta a Bússola
    const titulosBussola = document.querySelectorAll('.meta-titulo');
    const dadosBussola = [];
    titulosBussola.forEach(titulo => dadosBussola.push(titulo.textContent.trim()));

    // 2. Coleta a Trincheira
    const listas = document.querySelectorAll('.task-list');
    const dadosTrincheira = [];
    listas.forEach((lista) => {
        const tarefas = [];
        lista.querySelectorAll('.task-item').forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const texto = item.querySelector('.task-text').textContent.trim(); 
            tarefas.push({ texto: texto, concluido: checkbox.checked });
        });
        dadosTrincheira.push(tarefas);
    });

    // 3. Cria o "pacote" e manda pra nuvem vinculando ao ID do usuário
    try {
        await setDoc(doc(db, "usuarios", usuarioLogado.uid), {
            bussola: dadosBussola,
            trincheira: dadosTrincheira,
            ultimaAtualizacao: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error("Erro ao salvar na nuvem: ", e);
    }
}

// Função mestre que puxa TUDO do Firebase quando faz login
async function puxarDadosDaNuvem() {
    if (!usuarioLogado) return;

    try {
        const docSnap = await getDoc(doc(db, "usuarios", usuarioLogado.uid));
        
        if (docSnap.exists()) {
            const dados = docSnap.data();

            // 1. Restaurar Bússola
            if (dados.bussola) {
                const titulosBussola = document.querySelectorAll('.meta-titulo');
                titulosBussola.forEach((titulo, index) => {
                    if (dados.bussola[index]) titulo.textContent = dados.bussola[index];
                });
            }

            // 2. Restaurar Trincheira
            if (dados.trincheira) {
                const listas = document.querySelectorAll('.task-list');
                listas.forEach((lista, index) => {
                    if (dados.trincheira[index]) {
                        lista.innerHTML = ''; 
                        dados.trincheira[index].forEach(tarefa => {
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
        } else {
            // Primeiro acesso do usuário: Preenche com dados iniciais vazios/padrões
            document.querySelectorAll('.meta-titulo').forEach(t => t.textContent = "Defina sua meta");
            document.querySelectorAll('.task-list').forEach(l => l.innerHTML = '');
        }
    } catch (e) {
        console.error("Erro ao puxar dados: ", e);
    }
}

// =========================================================
// 4. MOTOR FRACTAL & UI EVENTS (Adaptado para nuvem)
// =========================================================

// Atualiza a barra azul e engatilha o salvamento na nuvem
const barraSemana = document.querySelector('.destaque-fill');
function atualizarProgressoTrincheira() {
    const checkboxes = document.querySelectorAll('.task-item input[type="checkbox"]');
    if (!barraSemana) return;

    let concluidas = 0;
    checkboxes.forEach(box => {
        const labelContent = box.parentElement; 
        if (box.checked) {
            concluidas++;
            labelContent.style.opacity = '0.4';
            labelContent.style.textDecoration = 'line-through';
        } else {
            labelContent.style.opacity = '1';
            labelContent.style.textDecoration = 'none';
        }
    });

    const total = checkboxes.length;
    const porcentagem = total > 0 ? (concluidas / total) * 100 : 0;
    barraSemana.style.width = `${porcentagem}%`;
    
    // Salva na Nuvem a cada alteração na Trincheira
    salvarNaNuvem();
}

// Escuta cliques na Trincheira (Marcar / Excluir)
const painelTrincheira = document.querySelector('.trincheira-panel');
if(painelTrincheira) {
    painelTrincheira.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-delete')) {
            e.preventDefault(); 
            e.target.closest('.task-item').remove();
            atualizarProgressoTrincheira(); 
        }
    });
    painelTrincheira.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') atualizarProgressoTrincheira();
    });
}

// Adicionar Nova Tarefa
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
                    <input type="checkbox"> <span class="task-text">${textoTarefa}</span>
                </div>
                <button class="btn-delete" title="Excluir">×</button>
            `;
            taskList.appendChild(novaLabel);
            inputField.value = '';
            atualizarProgressoTrincheira(); // Atualiza e salva na nuvem
        }
    });

    const inputF = botao.parentElement.querySelector('.input-tarefa');
    inputF.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') botao.click();
    });
});

// Eventos de Edição da Bússola (Salva na nuvem ao terminar de editar)
document.querySelectorAll('.meta-titulo').forEach(titulo => {
    titulo.addEventListener('blur', salvarNaNuvem);
    titulo.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            titulo.blur(); 
        }
    });
});

// Botão de Refresh PWA (Limpeza Visual)
const btnSync = document.getElementById('btn-sync');
if (btnSync) {
    btnSync.addEventListener('click', () => {
        btnSync.style.transform = 'rotate(180deg)';
        setTimeout(() => window.location.reload(true), 300); 
    });
}
