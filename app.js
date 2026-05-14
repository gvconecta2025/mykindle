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
let acessoPermitido = false; 
let notasGlobaisBussola = ["", "", "", "", "", ""];
let historicoVitoriasGlobais = []; // NOVO: Armazena as tarefas concluídas varridas

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
const paywallScreen = document.getElementById('paywall-screen');
const userAvatar = document.getElementById('user-avatar');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        usuarioLogado = user;
        loginScreen.classList.add('hidden');
        appDashboard.classList.remove('hidden');
        userAvatar.src = user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
        atualizarData(); 
        await puxarDadosDaNuvem();
    } else {
        usuarioLogado = null;
        acessoPermitido = false;
        appDashboard.classList.add('hidden');
        paywallScreen.classList.add('hidden');
        loginScreen.classList.remove('hidden');
    }
});

document.getElementById('btn-login-google').addEventListener('click', () => {
    signInWithPopup(auth, new GoogleAuthProvider()).catch(error => alert("Erro: " + error.message));
});
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));
document.getElementById('btn-paywall-logout').addEventListener('click', () => signOut(auth));

// =========================================================
// 2. BANCO DE DADOS (Firestore)
// =========================================================
function verificarAcessoVisual(temAcesso) {
    if (temAcesso) {
        acessoPermitido = true;
        paywallScreen.classList.add('hidden');
        appDashboard.style.filter = "none";
        appDashboard.style.pointerEvents = "auto";
    } else {
        acessoPermitido = false;
        paywallScreen.classList.remove('hidden');
        appDashboard.style.filter = "blur(10px)";
        appDashboard.style.pointerEvents = "none";
        appDashboard.style.userSelect = "none";
    }
}

async function salvarNaNuvem() {
    if (!usuarioLogado || !acessoPermitido) return;
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
            bussolaNotas: notasGlobaisBussola,
            trincheira: dadosTrincheira,
            historico: historicoVitoriasGlobais, // Envia o histórico para a nuvem
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
            verificarAcessoVisual(dados.acessoLiberado === true);

            if (dados.bussola) {
                document.querySelectorAll('.meta-titulo').forEach((titulo, index) => {
                    if (dados.bussola[index]) titulo.textContent = dados.bussola[index];
                });
            }
            if (dados.bussolaNotas) notasGlobaisBussola = dados.bussolaNotas;
            if (dados.historico) historicoVitoriasGlobais = dados.historico; // Recupera vitórias

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
            verificarAcessoVisual(false);
            document.querySelectorAll('.meta-titulo').forEach((t, i) => {
                if(i===0) t.textContent = "Sua grande visão em 5 anos...";
                else t.textContent = "Defina sua meta...";
            });
            await setDoc(doc(db, "usuarios", usuarioLogado.uid), {
                acessoLiberado: false, emailOrigem: usuarioLogado.email, dataCriacao: new Date().toISOString()
            });
        }
        atualizarProgressoTrincheira();
    } catch (e) { console.error("Erro puxar dados: ", e); }
}

// =========================================================
// 3. NAVEGAÇÃO E PAINÉIS (Trincheira vs Planejamento vs Vitórias)
// =========================================================
const painelTrincheira = document.getElementById('painel-trincheira');
const painelPlanejamento = document.getElementById('painel-planejamento');
const painelVitorias = document.getElementById('painel-vitorias');
const navBussola = document.getElementById('nav-bussola');
const navVitorias = document.getElementById('nav-vitorias');

// Navegação do Menu Esquerdo
navBussola.addEventListener('click', () => {
    document.querySelectorAll('.icone').forEach(i => i.classList.remove('ativo'));
    navBussola.classList.add('ativo');
    painelPlanejamento.classList.add('hidden');
    painelVitorias.classList.add('hidden');
    painelTrincheira.classList.remove('hidden');
});

navVitorias.addEventListener('click', () => {
    document.querySelectorAll('.icone').forEach(i => i.classList.remove('ativo'));
    navVitorias.classList.add('ativo');
    painelTrincheira.classList.add('hidden');
    painelPlanejamento.classList.add('hidden');
    painelVitorias.classList.remove('hidden');
    renderizarHistorico(); // Carrega as vitórias na tela
});

// Modal de Planejamento (Sala de Guerra)
const planBadge = document.getElementById('plan-badge-periodo');
const planContextoPai = document.getElementById('plan-contexto-pai');
const planInputMeta = document.getElementById('plan-input-meta');
const planInputNotas = document.getElementById('plan-input-notas');
const planDicaFilho = document.getElementById('plan-dica-filho');
let nivelAtualEditando = -1; 

const fractalMapeamento = [
    { periodo: "5 ANOS", pai: "Este é o seu Norte Estelar Supremo.", filho: "Você desdobrará isso em 5 metas anuais consistentes." },
    { periodo: "1 ANO", pai: "A Meta de 5 Anos", filho: "Divida em 2 Grandes Semestres (6 meses)." },
    { periodo: "6 MESES", pai: "A Meta de 1 Ano", filho: "Próximo passo: focar no Trimestre (3 meses)." },
    { periodo: "3 MESES", pai: "A Meta Semestral (6 Meses)", filho: "Reduza o foco para metas mensais táticas." },
    { periodo: "1 MÊS", pai: "O Fechamento do Trimestre", filho: "Isso se transformará nas 4 batalhas semanais." },
    { periodo: "ESTA SEMANA", pai: "O Objetivo do Mês", filho: "Fatie esta meta em tarefas diárias na Trincheira." }
];

document.querySelectorAll('.meta-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.meta-item').forEach(i => i.classList.remove('selecionado'));
        item.classList.add('selecionado');
        const nivelStr = item.getAttribute('data-nivel');
        nivelAtualEditando = parseInt(nivelStr);
        
        const configFase = fractalMapeamento[nivelAtualEditando];
        const tituloAtual = item.querySelector('.meta-titulo').textContent;
        let textoPaiReal = configFase.pai;
        if (nivelAtualEditando > 0) {
            textoPaiReal = `Alimenta: "${document.querySelectorAll('.meta-titulo')[nivelAtualEditando - 1].textContent}"`;
        }
        
        planBadge.textContent = `PLANEJAMENTO: ${configFase.periodo}`;
        planContextoPai.textContent = textoPaiReal;
        planInputMeta.value = tituloAtual === "Defina sua meta..." || tituloAtual === "Sua grande visão em 5 anos..." ? "" : tituloAtual;
        planInputNotas.value = notasGlobaisBussola[nivelAtualEditando] || ""; 
        planDicaFilho.textContent = configFase.filho;
        
        painelTrincheira.classList.add('hidden');
        painelVitorias.classList.add('hidden');
        painelPlanejamento.classList.remove('hidden');
    });
});

document.getElementById('btn-fechar-planejamento').addEventListener('click', () => {
    if (nivelAtualEditando > -1) {
        const novoTexto = planInputMeta.value.trim();
        if (novoTexto !== "") document.querySelectorAll('.meta-item')[nivelAtualEditando].querySelector('.meta-titulo').textContent = novoTexto;
        notasGlobaisBussola[nivelAtualEditando] = planInputNotas.value;
        salvarNaNuvem();
    }
    document.querySelectorAll('.meta-item').forEach(i => i.classList.remove('selecionado'));
    painelPlanejamento.classList.add('hidden');
    navBussola.click(); // Volta ativando a aba da Trincheira
});


// =========================================================
// 4. MOTOR DA TRINCHEIRA & ARQUIVAMENTO (VARREDURA)
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

// ARQUIVAMENTO: O botão varrer agora manda pro Histórico
const btnVarrer = document.getElementById('btn-varrer');
if (btnVarrer) {
    btnVarrer.addEventListener('click', () => {
        let limpouAlgo = false;
        
        // Pega a data atual formatada (Ex: 14/05/2026 - 15:30)
        const dataAtual = new Date();
        const dataFormatada = `${dataAtual.getDate().toString().padStart(2, '0')}/${(dataAtual.getMonth()+1).toString().padStart(2, '0')}/${dataAtual.getFullYear()} às ${dataAtual.getHours().toString().padStart(2, '0')}:${dataAtual.getMinutes().toString().padStart(2, '0')}`;

        document.querySelectorAll('.task-item input[type="checkbox"]').forEach(box => {
            if (box.checked) { 
                const textoTarefa = box.closest('.task-item').querySelector('.task-text').textContent;
                
                // Salva no banco de vitórias
                historicoVitoriasGlobais.push({
                    texto: textoTarefa,
                    dataStr: dataFormatada
                });

                // Remove da Trincheira
                box.closest('.task-item').remove(); 
                limpouAlgo = true; 
            }
        });
        
        if(limpouAlgo) atualizarProgressoTrincheira(); 
    });
}

// Renderiza o Histórico na Tela de Vitórias
function renderizarHistorico() {
    const listaHtml = document.getElementById('lista-vitorias');
    listaHtml.innerHTML = '';

    if (historicoVitoriasGlobais.length === 0) {
        listaHtml.innerHTML = '<p class="vazio-msg">Seu cofre está vazio. Conclua e varra tarefas na Trincheira para preenchê-lo.</p>';
        return;
    }

    // Cria os itens invertidos (Os mais novos no topo)
    const historicoReverso = [...historicoVitoriasGlobais].reverse();
    
    historicoReverso.forEach(vitoria => {
        const item = document.createElement('div');
        item.className = 'vitoria-item';
        item.innerHTML = `
            <div class="vitoria-texto">${vitoria.texto}</div>
            <div class="vitoria-data">${vitoria.dataStr}</div>
        `;
        listaHtml.appendChild(item);
    });
}


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
