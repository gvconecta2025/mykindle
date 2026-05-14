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
// 1. O RELÓGIO E AUTENTICAÇÃO
// =========================================================
function atualizarData() {
    const elData = document.getElementById('data-hoje');
    if(elData) {
        const diasSemana = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
        const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
        const hoje = new Date();
        elData.textContent = `HOJE: ${diasSemana[hoje.getDay()]}, ${hoje.getDate()} DE ${meses[hoje.getMonth()]}`;
    }
}

const loginScreen = document.getElementById('login-screen');
const appDashboard = document.getElementById('app-dashboard');
const userAvatar = document.getElementById('user-avatar');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioLogado = user;
        loginScreen.classList.add('hidden');
        appDashboard.classList.remove('hidden');
        userAvatar.src = user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        atualizarData(); 
        await puxarDadosDaNuvem();
        atualizarProgressoTrincheira();
    } else {
        usuarioLogado = null;
        appDashboard.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

document.getElementById('btn-login-google').addEventListener('click', () => {
    signInWithPopup(auth, new GoogleAuthProvider()).catch(error => alert("Erro: " + error.message));
});
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

// =========================================================
// 2. BANCO DE DADOS (Firestore)
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
            document.querySelectorAll('.meta-titulo').forEach((t, i) => {
                if(i===0) t.textContent = "Sua grande visão em 5 anos...";
                else t.textContent = "Defina sua meta...";
            });
        }
    } catch (e) { console.error("Erro puxar dados: ", e); }
}

// =========================================================
// 3. NOVO: LÓGICA DA SALA DE GUERRA (MODAL DE PLANEJAMENTO)
// =========================================================
const modalPlanejamento = document.getElementById('modal-planejamento');
const btnFecharModal = document.getElementById('btn-fechar-modal');
const btnSalvarModal = document.getElementById('btn-salvar-planejamento');

const modalBadge = document.getElementById('modal-badge-periodo');
const modalContextoPai = document.getElementById('modal-contexto-pai');
const modalInputMeta = document.getElementById('modal-input-meta');
const modalDicaFilho = document.getElementById('modal-dica-filho');

let nivelAtualEditando = -1; // Guarda qual caixa da bússola abriu o modal

// Dicionário do Método Fractal: Explica as conexões entre os níveis
const fractalMapeamento = [
    { periodo: "5 ANOS", pai: "Este é o seu Norte Estelar Supremo. O ápice da montanha.", filho: "Você desdobrará isso em 5 metas anuais consistentes." },
    { periodo: "1 ANO", pai: "A Meta de 5 Anos", filho: "Para bater este ano, você o dividirá em 2 Grandes Semestres (6 meses)." },
    { periodo: "6 MESES", pai: "A Meta de 1 Ano", filho: "Metade do percurso. O próximo passo é focar no Trimestre (3 meses)." },
    { periodo: "3 MESES", pai: "A Meta Semestral (6 Meses)", filho: "Quase lá. Vamos reduzir o foco para metas mensais táticas." },
    { periodo: "1 MÊS", pai: "O Fechamento do Trimestre (3 Meses)", filho: "Isso se transformará nas 4 batalhas semanais ativas." },
    { periodo: "ESTA SEMANA", pai: "O Objetivo do Mês", filho: "Você vai fatiar esta meta em tarefas diárias na sua Trincheira." }
];

// Quando o usuário clica em qualquer card da bússola
document.querySelectorAll('.meta-item').forEach(item => {
    item.addEventListener('click', () => {
        const nivelStr = item.getAttribute('data-nivel');
        nivelAtualEditando = parseInt(nivelStr);
        
        const configFase = fractalMapeamento[nivelAtualEditando];
        const tituloAtual = item.querySelector('.meta-titulo').textContent;
        
        // Pega o título real da meta pai para dar mais clareza, se não for o topo
        let textoPaiReal = configFase.pai;
        if (nivelAtualEditando > 0) {
            const paineis = document.querySelectorAll('.meta-titulo');
            textoPaiReal = `Alimenta: "${paineis[nivelAtualEditando - 1].textContent}"`;
        }
        
        // Preenche os dados do Modal
        modalBadge.textContent = `PLANEJAMENTO: ${configFase.periodo}`;
        modalContextoPai.textContent = textoPaiReal;
        modalInputMeta.value = tituloAtual === "Defina sua meta..." ? "" : tituloAtual;
        modalDicaFilho.textContent = configFase.filho;
        
        // Abre o Modal
        modalPlanejamento.classList.remove('hidden');
        modalInputMeta.focus();
    });
});

// Fechar Modal
function fecharModal() {
    modalPlanejamento.classList.add('hidden');
    nivelAtualEditando = -1;
}

btnFecharModal.addEventListener('click', fecharModal);

// Salvar Modal
btnSalvarModal.addEventListener('click', () => {
    if (nivelAtualEditando > -1) {
        const novoTexto = modalInputMeta.value.trim();
        if (novoTexto !== "") {
            // Atualiza o texto na bússola visualmente
            const paineis = document.querySelectorAll('.meta-item');
            paineis[nivelAtualEditando].querySelector('.meta-titulo').textContent = novoTexto;
            
            // Salva no banco de dados
            salvarNaNuvem();
        }
    }
    fecharModal();
});


// =========================================================
// 4. MOTOR DA TRINCHEIRA
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

const btnVarrer = document.getElementById('btn-varrer');
if (btnVarrer) {
    btnVarrer.addEventListener('click', () => {
        let limpouAlgo = false;
        document.querySelectorAll('.task-item input[type="checkbox"]').forEach(box => {
            if (box.checked) { box.closest('.task-item').remove(); limpouAlgo = true; }
        });
        if(limpouAlgo) atualizarProgressoTrincheira(); 
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

const btnSync = document.getElementById('btn-sync');
if (btnSync) {
    btnSync.addEventListener('click', () => {
        btnSync.style.transform = 'rotate(180deg)';
        setTimeout(() => window.location.reload(true), 300); 
    });
}
