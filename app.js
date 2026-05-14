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
let eixosGlobais = [];
let eixoAtivoIndex = 0; 

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
            eixosGlobais: eixosGlobais, eixoAtivoIndex: eixoAtivoIndex,
            trincheira: dadosTrincheira, historico: historicoVitoriasGlobais,
            ultimaAtualizacao: new Date().toISOString()
        }, { merge: true });
    } catch (e) { console.error("Erro Nuvem: ", e); }
}

function criarEixoInicial() {
    eixosGlobais = [{
        nome: "Eixo Principal",
        bussola: ["Sua grande visão em 5 anos...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta..."],
        bussolaNotas: ["", "", "", "", "", ""]
    }];
    eixoAtivoIndex = 0;
}

async function puxarDadosDaNuvem() {
    if (!usuarioLogado) return;
    try {
        const docSnap = await getDoc(doc(db, "usuarios", usuarioLogado.uid));
        if (docSnap.exists()) {
            const dados = docSnap.data();
            verificarAcessoVisual(dados.acessoLiberado === true);
            if (dados.eixosGlobais) { eixosGlobais = dados.eixosGlobais; eixoAtivoIndex = dados.eixoAtivoIndex || 0; }
            else if (dados.bussola) { eixosGlobais = [{ nome: "Eixo Principal", bussola: dados.bussola, bussolaNotas: dados.bussolaNotas || ["","","","","",""] }]; eixoAtivoIndex = 0; }
            else { criarEixoInicial(); }
            renderizarSeletorEixos(); carregarBussolaVisual();
            if (dados.historico) historicoVitoriasGlobais = dados.historico; 
            if (dados.trincheira) {
                document.querySelectorAll('.task-list').forEach((lista, index) => {
                    if (dados.trincheira[index]) {
                        lista.innerHTML = ''; 
                        dados.trincheira[index].forEach(tarefa => {
                            const novaLabel = document.createElement('label');
                            novaLabel.className = 'task-item';
                            const opacity = tarefa.concluido ? '0.5' : '1';
                            const decoration = tarefa.concluido ? 'line-through' : 'none';
                            novaLabel.innerHTML = `
                                <div class="task-content">
                                    <input type="checkbox" ${tarefa.concluido ? 'checked' : ''}> 
                                    <span class="checkmark"></span>
                                    <span class="task-text" style="opacity: ${opacity}; text-decoration: ${decoration};">${tarefa.texto}</span>
                                </div>
                                <button class="btn-delete" title="Excluir">🗑️</button>
                            `;
                            lista.appendChild(novaLabel);
                        });
                    }
                });
            }
        } else { verificarAcessoVisual(false); criarEixoInicial(); renderizarSeletorEixos(); carregarBussolaVisual(); await setDoc(doc(db, "usuarios", usuarioLogado.uid), { acessoLiberado: false, emailOrigem: usuarioLogado.email, eixosGlobais: eixosGlobais, eixoAtivoIndex: 0 }); }
        atualizarProgressoTrincheira();
    } catch (e) { console.error("Erro puxar dados: ", e); }
}

const selectEixo = document.getElementById('select-eixo');
const btnNovoEixo = document.getElementById('btn-novo-eixo');
const btnEditarEixo = document.getElementById('btn-editar-eixo');
const btnExcluirEixo = document.getElementById('btn-excluir-eixo');

function renderizarSeletorEixos() {
    selectEixo.innerHTML = '';
    eixosGlobais.forEach((eixo, index) => {
        const option = document.createElement('option');
        option.value = index; option.textContent = eixo.nome;
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

selectEixo.addEventListener('change', (e) => { eixoAtivoIndex = parseInt(e.target.value); carregarBussolaVisual(); salvarNaNuvem(); });
btnNovoEixo.addEventListener('click', () => {
    const nomeNovo = prompt("Nome do novo Eixo:");
    if (nomeNovo && nomeNovo.trim() !== "") {
        eixosGlobais.push({ nome: nomeNovo.trim(), bussola: ["Sua grande visão em 5 anos...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta...", "Defina sua meta..."], bussolaNotas: ["", "", "", "", "", ""] });
        eixoAtivoIndex = eixosGlobais.length - 1; renderizarSeletorEixos(); carregarBussolaVisual(); salvarNaNuvem();
    }
});
btnEditarEixo.addEventListener('click', () => {
    if(eixosGlobais.length === 0) return;
    const nomeAtual = eixosGlobais[eixoAtivoIndex].nome;
    const novoNome = prompt(`Renomear "${nomeAtual}" para:`, nomeAtual);
    if (novoNome && novoNome.trim() !== "" && novoNome !== nomeAtual) { eixosGlobais[eixoAtivoIndex].nome = novoNome.trim(); renderizarSeletorEixos(); salvarNaNuvem(); }
});
btnExcluirEixo.addEventListener('click', () => {
    if(eixosGlobais.length === 0) return;
    if (confirm(`Excluir eixo "${eixosGlobais[eixoAtivoIndex].nome}"?`)) {
        eixosGlobais.splice(eixoAtivoIndex, 1); 
        if(eixosGlobais.length === 0) { criarEixoInicial(); } else { eixoAtivoIndex = 0; }
        renderizarSeletorEixos(); carregarBussolaVisual(); salvarNaNuvem();
    }
});

const painelTrincheira = document.getElementById('painel-trincheira');
const painelPlanejamento = document.getElementById('painel-planejamento');
const painelVitorias = document.getElementById('painel-vitorias');
const navBussola = document.getElementById('nav-bussola');
const navVitorias = document.getElementById('nav-vitorias');

navBussola.addEventListener('click', () => { document.querySelectorAll('.icone').forEach(i => i.classList.remove('ativo')); navBussola.classList.add('ativo'); painelPlanejamento.classList.add('hidden'); painelVitorias.classList.add('hidden'); painelTrincheira.classList.remove('hidden'); });
navVitorias.addEventListener('click', () => { document.querySelectorAll('.icone').forEach(i => i.classList.remove('ativo')); navVitorias.classList.add('ativo'); painelTrincheira.classList.add('hidden'); painelPlanejamento.classList.add('hidden'); painelVitorias.classList.remove('hidden'); renderizarHistorico(); });

const planInputMeta = document.getElementById('plan-input-meta');
const planInputNotas = document.getElementById('plan-input-notas');
let nivelAtualEditando = -1; 

document.querySelectorAll('.meta-item').forEach(item => {
    item.addEventListener('click', () => {
        document.querySelectorAll('.meta-item').forEach(i => i.classList.remove('selecionado'));
        item.classList.add('selecionado');
        nivelAtualEditando = parseInt(item.getAttribute('data-nivel'));
        const eixoAtual = eixosGlobais[eixoAtivoIndex];
        const config = ["5 ANOS", "1 ANO", "6 MESES", "3 MESES", "1 MÊS", "ESTA SEMANA"];
        document.getElementById('plan-badge-periodo').textContent = `PLANEJAMENTO: ${config[nivelAtualEditando]} - [${eixoAtual.nome.toUpperCase()}]`;
        document.getElementById('plan-contexto-pai').textContent = nivelAtualEditando > 0 ? `Alimenta: "${eixoAtual.bussola[nivelAtualEditando - 1]}"` : "Este é o seu Norte Estelar Supremo.";
        planInputMeta.value = (eixoAtual.bussola[nivelAtualEditando] === "Defina sua meta..." || eixoAtual.bussola[nivelAtualEditando] === "Sua grande visão em 5 anos...") ? "" : eixoAtual.bussola[nivelAtualEditando];
        planInputNotas.value = eixoAtual.bussolaNotas[nivelAtualEditando] || ""; 
        painelTrincheira.classList.add('hidden'); painelVitorias.classList.add('hidden'); painelPlanejamento.classList.remove('hidden');
    });
});

document.getElementById('btn-fechar-planejamento').addEventListener('click', () => {
    if (nivelAtualEditando > -1) {
        if (planInputMeta.value.trim() !== "") eixosGlobais[eixoAtivoIndex].bussola[nivelAtualEditando] = planInputMeta.value.trim();
        eixosGlobais[eixoAtivoIndex].bussolaNotas[nivelAtualEditando] = planInputNotas.value;
        carregarBussolaVisual(); salvarNaNuvem();
    }
    painelPlanejamento.classList.add('hidden'); navBussola.click(); 
});

const barraSemana = document.querySelector('.destaque-fill');
const porcSemana = document.getElementById('porcentagem-semana');
const textoProgressoHoje = document.getElementById('texto-progresso-hoje');
const barraProgressoHoje = document.getElementById('barra-progresso-hoje');

function atualizarProgressoTrincheira() {
    const checkboxes = document.querySelectorAll('.task-item input[type="checkbox"]');
    let concluidas = 0;
    checkboxes.forEach(box => {
        const textoLabel = box.parentElement.querySelector('.task-text'); 
        if (box.checked) { concluidas++; textoLabel.style.opacity = '0.5'; textoLabel.style.textDecoration = 'line-through'; }
        else { textoLabel.style.opacity = '1'; textoLabel.style.textDecoration = 'none'; }
    });
    const total = checkboxes.length;
    const porcentagem = total > 0 ? Math.round((concluidas / total) * 100) : 0;
    if (barraSemana && porcSemana) { barraSemana.style.width = `${porcentagem}%`; porcSemana.textContent = `${porcentagem}%`; }
    if (textoProgressoHoje && barraProgressoHoje) { textoProgressoHoje.textContent = `${concluidas}/${total} TAREFAS CONCLUÍDAS (${porcentagem}%)`; barraProgressoHoje.style.width = `${porcentagem}%`; }
    salvarNaNuvem();
}

document.getElementById('btn-varrer').addEventListener('click', () => {
    let limpouAlgo = false; const data = new Date(); const dataStr = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth()+1).toString().padStart(2, '0')}/${data.getFullYear()} às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
    document.querySelectorAll('.task-item input[type="checkbox"]').forEach(box => {
        if (box.checked) { historicoVitoriasGlobais.push({ texto: box.closest('.task-item').querySelector('.task-text').textContent, dataStr: dataStr }); box.closest('.task-item').remove(); limpouAlgo = true; }
    });
    if(limpouAlgo) atualizarProgressoTrincheira(); 
});

function renderizarHistorico() {
    const lista = document.getElementById('lista-vitorias'); lista.innerHTML = '';
    if (historicoVitoriasGlobais.length === 0) { lista.innerHTML = '<p class="vazio-msg">Seu cofre está vazio.</p>'; return; }
    [...historicoVitoriasGlobais].reverse().forEach(v => {
        const item = document.createElement('div'); item.className = 'vitoria-item';
        item.innerHTML = `<div class="vitoria-texto">${v.texto}</div><div class="vitoria-data">${v.dataStr}</div>`;
        lista.appendChild(item);
    });
}

document.getElementById('painel-trincheira').addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-delete')) { e.target.closest('.task-item').remove(); atualizarProgressoTrincheira(); }
});
document.getElementById('painel-trincheira').addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') atualizarProgressoTrincheira();
});

document.querySelectorAll('.btn-add').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const input = e.target.parentElement.querySelector('.input-tarefa');
        if (input.value.trim() !== '') {
            const item = document.createElement('label'); item.className = 'task-item';
            item.innerHTML = `<div class="task-content"><input type="checkbox"><span class="checkmark"></span><span class="task-text">${input.value.trim()}</span></div><button class="btn-delete" title="Excluir">🗑️</button>`;
            e.target.parentElement.previousElementSibling.appendChild(item); input.value = ''; atualizarProgressoTrincheira();
        }
    });
    btn.parentElement.querySelector('.input-tarefa').addEventListener('keypress', (e) => { if (e.key === 'Enter') btn.click(); });
});

document.getElementById('btn-sync').addEventListener('click', () => { document.getElementById('btn-sync').style.transform = 'rotate(180deg)'; setTimeout(() => window.location.reload(true), 300); });
