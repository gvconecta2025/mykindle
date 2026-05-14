import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHK6pA45hCN1_X3WHpbWMNoADc7-7JmcQ",
  authDomain: "cincoanos-4c824.firebaseapp.com",
  projectId: "cincoanos-4c824",
  storageBucket: "cincoanos-4c824.firebasestorage.app",
  messagingSenderId: "236919232015",
  appId: "1:236919232015:web:a8dc70e9ee0b66630ef57a",
  measurementId: "G-1LBB83ZW9W"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let usuarioLogado = null;

// =========================================================
// 1. O RELÓGIO (Data Dinâmica)
// =========================================================
function atualizarData() {
    const elData = document.getElementById('data-hoje');
    if(elData) {
        const diasSemana = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
        const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        
        const hoje = new Date();
        const diaSemanaStr = diasSemana[hoje.getDay()];
        const dia = hoje.getDate();
        const mesStr = meses[hoje.getMonth()];
        
        elData.textContent = `HOJE: ${diaSemanaStr}, ${dia} DE ${mesStr}`;
    }
}

// =========================================================
// 2. AUTENTICAÇÃO E INICIALIZAÇÃO
// =========================================================
const loginScreen = document.getElementById('login-screen');
const appDashboard = document.getElementById('app-dashboard');
const btnLoginGoogle = document.getElementById('btn-login-google');
const btnLogout = document.getElementById('btn-logout');
const userAvatar = document.getElementById('user-avatar');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioLogado = user;
        loginScreen.classList.add('hidden');
        appDashboard.classList.remove('hidden');
        userAvatar.src = user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        
        atualizarData(); // Roda o relógio
        await puxarDadosDaNuvem();
        atualizarProgressoTrincheira();
    } else {
        usuarioLogado = null;
        appDashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

btnLoginGoogle.addEventListener('click', () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(error => alert("Erro ao fazer login: " + error.message));
});

btnLogout.addEventListener('click', () => signOut(auth));

// =========================================================
// 3. BANCO DE DADOS (Firestore)
// =========================================================
async function salvarNaNuvem() {
    if (!usuarioLogado) return;
    const titulosBussola = document.querySelectorAll('.meta-titulo');
    const dadosBussola = [];
    titulosBussola.forEach(titulo => dadosBussola.push(titulo.textContent.trim()));

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

    try {
        await setDoc(doc(db, "usuarios", usuarioLogado.uid), {
            bussola: dadosBussola,
            trincheira: dadosTrincheira,
            ultimaAtualizacao: new Date().toISOString()
        }, { merge: true });
    } catch (e) { console.error("Erro Nuvem: ", e); }
}

async function puxarDadosDaNuvem() {
    if (!usuarioLogado) return;
    try {
        const docSnap = await getDoc(doc(db, "usuarios", usuarioLogado.uid));
        if (docSnap.exists()) {
            const dados = docSnap.data();
            if (dados.bussola) {
                document.querySelectorAll('.meta-titulo').forEach((titulo, index) => {
                    if (dados.bussola[index]) titulo.textContent = dados.bussola[index];
                });
            }
            if (dados.trincheira) {
                document.querySelectorAll('.task-list').forEach((lista, index) => {
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
            document.querySelectorAll('.meta-titulo').forEach(t => t.textContent = "Defina sua meta");
            document.querySelectorAll('.task-list').forEach(l => l.innerHTML = '');
        }
    } catch (e) { console.error("Erro puxar dados: ", e); }
}

// =========================================================
// 4. MOTOR FRACTAL, UI & VARREDURA
// =========================================================
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
    salvarNaNuvem();
}

// Botão de Varrer Concluídas
const btnVarrer = document.getElementById('btn-varrer');
if (btnVarrer) {
    btnVarrer.addEventListener('click', () => {
        const checkboxes = document.querySelectorAll('.task-item input[type="checkbox"]');
        let limpouAlgo = false;
        
        checkboxes.forEach(box => {
            if (box.checked) {
                box.closest('.task-item').remove();
                limpouAlgo = true;
            }
        });
        
        if(limpouAlgo) {
            atualizarProgressoTrincheira(); // Recalcula e salva
        }
    });
}

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

document.querySelectorAll('.btn-add').forEach(botao => {
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
            atualizarProgressoTrincheira();
        }
    });
    const inputF = botao.parentElement.querySelector('.input-tarefa');
    inputF.addEventListener('keypress', (e) => { if (e.key === 'Enter') botao.click(); });
});

document.querySelectorAll('.meta-titulo').forEach(titulo => {
    titulo.addEventListener('blur', salvarNaNuvem);
    titulo.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); titulo.blur(); }
    });
});

const btnSync = document.getElementById('btn-sync');
if (btnSync) {
    btnSync.addEventListener('click', () => {
        btnSync.style.transform = 'rotate(180deg)';
        setTimeout(() => window.location.reload(true), 300); 
    });
}
