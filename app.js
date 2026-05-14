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
let historicoVitoriasGlobais = []; 

// === NOVO: SISTEMA DE EIXOS (MÚLTIPLAS BÚSSOLAS) ===
let eixosGlobais = [];
let eixoAtivoIndex = 0; // Aponta para qual eixo está sendo visualizado agora

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

document.getElementById('btn-login-google').addEventListener('click', () => { signInWithPopup(auth, new GoogleAuthProvider()).catch(error => alert("Erro: " + error.message)); });
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));
document.getElementById('btn-paywall-logout').addEventListener('click', () => signOut(auth));

// =========================================================
// 2. BANCO DE DADOS E MIGRAÇÃO DE EIXOS
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

    // Coleta a Trincheira (Global)
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
            eixosGlobais: eixosGlobais, // Salva o array de objetos dos Eixos
            eixoAtivoIndex: eixoAtivoIndex,
            trincheira: dadosTrincheira,
            historico: historicoVitoriasGlobais,
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

            // LOGICA DE MIGRAÇÃO: Suporte a dados antigos e novos
            if (dados.eixosGlobais) {
                eixosGlobais = dados.eixosGlobais;
                eixoAtivoIndex = dados.eixoAtivoIndex !== undefined ? dados.eixoAtivoIndex : 0;
            } else if (dados.bussola) {
                // Migrando o usuário antigo para o formato de Eixos
                eixosGlobais = [{
                    nome: "Eixo Principal",
                    bussola: dados.bussola,
                    bussolaNotas: dados.bussolaNotas || ["","","","","",""]
                }];
                eixoAtivoIndex = 0;
            } else {
                // Conta Zerada mas que já tem doc no banco
                criarEixoInicial();
            }

            renderizarSeletorEixos();
            carregarBussolaVisual();
            if (dados.historico) historicoVitoriasGlobais = dados.historico; 

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
            criarEixoInicial();
            renderizarSeletorEixos();
            carregarBussolaVisual();
            
            await setDoc(doc(db, "usuarios", usuarioLogado.uid), {
                acessoLiberado: false, emailOrigem: usuarioLogado.email, dataCriacao: new Date().toISOString(), eixosGlobais: eixosGlobais, eixoAtivoIndex: 0
            });
        }
        atualizarProgressoTrincheira();
    } catch (e) { console.error("Erro puxar dados: ", e); }
}

function criarEixoInicial() {
    eixosGlobais = [{
        nome: "Eixo Principal",
        bussola: ["Sua grande visão em 5 anos...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta..."],
        bussolaNotas: ["", "", "", "", "", ""]
    }];
    eixoAtivoIndex = 0;
}

// =========================================================
// 3. UI DOS EIXOS PARALELOS
// =========================================================
const selectEixo = document.getElementById('select-eixo');
const btnNovoEixo = document.getElementById('btn-novo-eixo');

function renderizarSeletorEixos() {
    selectEixo.innerHTML = '';
    eixosGlobais.forEach((eixo, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = eixo.nome;
        if (index === eixoAtivoIndex) option.selected = true;
        selectEixo.appendChild(option);
    });
}

function carregarBussolaVisual() {
    if(!eixosGlobais[eixoAtivoIndex]) return;
    const eixoAtual = eixosGlobais[eixoAtivoIndex];
    document.querySelectorAll('.meta-titulo').forEach((titulo, index) => {
        titulo.textContent = eixoAtual.bussola[index] || "Defina sua meta...";
    });
}

// Quando muda o select, recarrega a tela
selectEixo.addEventListener('change', (e) => {
    eixoAtivoIndex = parseInt(e.target.value);
    carregarBussolaVisual();
    salvarNaNuvem(); // Memoriza a última aba aberta
});

// Adicionar novo eixo (Projeto paralelo)
btnNovoEixo.addEventListener('click', () => {
    const nomeNovoEixo = prompt("Nome do novo Eixo Estratégico (Ex: Concurso, Empresa, etc):");
    if (nomeNovoEixo && nomeNovoEixo.trim() !== "") {
        eixosGlobais.push({
            nome: nomeNovoEixo.trim(),
            bussola: ["Sua grande visão em 5 anos...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta..."],
            bussolaNotas: ["", "", "", "", "", ""]
        });
        eixoAtivoIndex = eixosGlobais.length - 1; // Já muda pra ele
        renderizarSeletorEixos();
        carregarBussolaVisual();
        salvarNaNuvem();
    }
});


// =========================================================
// 4. NAVEGAÇÃO E PAINÉIS 
// =========================================================
const painelTrincheira = document.getElementById('painel-trincheira');
const painelPlanejamento = document.getElementById('painel-planejamento');
const painelVitorias = document.getElementById('painel-vitorias');
const navBussola = document.getElementById('nav-bussola');
const navVitorias = document.getElementById('nav-vitorias');

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
    renderizarHistorico(); 
});

// =========================================================
// 5. MODAL DE PLANEJAMENTO (Vinculado ao Eixo Ativo)
// =========================================================
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
        const eixoAtual = eixosGlobais[eixoAtivoIndex];
        
        let textoPaiReal = configFase.pai;
        if (nivelAtualEditando > 0) {
            textoPaiReal = `Alimenta: "${eixoAtual.bussola[nivelAtualEditando - 1]}"`;
        }
        
        planBadge.getContext = `PLANEJAMENTO: ${configFase.periodo}`; // Correção visual
        planBadge.textContent = `PLANEJAMENTO: ${configFase.periodo} - [${eixoAtual.nome.toUpperCase()}]`; // Mostra no título qual eixo está editando
        planContextoPai.textContent = textoPaiReal;
        
        const tituloAtual = eixoAtual.bussola[nivelAtualEditando];
        planInputMeta.value = tituloAtual === "Defina sua meta..." || tituloAtual === "Sua grande visão em 5 anos..." ? "" : tituloAtual;
        planInputNotas.value = eixoAtual.bussolaNotas[nivelAtualEditando] || ""; 
        planDicaFilho.textContent = configFase.filho;
        
        painelTrincheira.classList.add('hidden');
        painelVitorias.classList.add('hidden');
        painelPlanejamento.classList.remove('hidden');
    });
});

document.getElementById('btn-fechar-planejamento').addEventListener('click', () => {
    if (nivelAtualEditando > -1) {
        const novoTexto = planInputMeta.value.trim();
        if (novoTexto !== "") {
            // Salva no objeto JavaScript em vez de ler da tela
            eixosGlobais[eixoAtivoIndex].bussola[nivelAtualEditando] = novoTexto;
        }
        eixosGlobais[eixoAtivoIndex].bussolaNotas[nivelAtualEditando] = planInputNotas.value;
        
        carregarBussolaVisual(); // Reflete a mudança na barra lateral
        salvarNaNuvem();
    }
    document.querySelectorAll('.meta-item').forEach(i => i.classList.remove('selecionado'));
    painelPlanejamento.classList.add('hidden');
    navBussola.click(); 
});


// =========================================================
// 6. MOTOR DA TRINCHEIRA E ARQUIVAMENTO
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
        const dataAtual = new Date();
        const dataFormatada = `${dataAtual.getDate().toString().padStart(2, '0')}/${(dataAtual.getMonth()+1).toString().padStart(2, '0')}/${dataAtual.getFullYear()} às ${dataAtual.getHours().toString().padStart(2, '0')}:${dataAtual.getMinutes().toString().padStart(2, '0')}`;

        document.querySelectorAll('.task-item input[type="checkbox"]').forEach(box => {
            if (box.checked) { 
                const textoTarefa = box.closest('.task-item').querySelector('.task-text').textContent;
                historicoVitoriasGlobais.push({ texto: textoTarefa, dataStr: dataFormatada });
                box.closest('.task-item').remove(); 
                limpouAlgo = true; 
            }
        });
        if(limpouAlgo) atualizarProgressoTrincheira(); 
    });
}

function renderizarHistorico() {
    const listaHtml = document.getElementById('lista-vitorias');
    listaHtml.innerHTML = '';
    if (historicoVitoriasGlobais.length === 0) {
        listaHtml.innerHTML = '<p class="vazio-msg">Seu cofre está vazio. Conclua e varra tarefas na Trincheira para preenchê-lo.</p>';
        return;
    }
    const historicoReverso = [...historicoVitoriasGlobais].reverse();
    historicoReverso.forEach(vitoria => {
        const item = document.createElement('div');
        item.className = 'vitoria-item';
        item.innerHTML = `<div class="vitoria-texto">${vitoria.texto}</div><div class="vitoria-data">${vitoria.dataStr}</div>`;
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
