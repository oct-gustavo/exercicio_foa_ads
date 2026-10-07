"use strict";

/* ==========================================================================
   Meus livros - CRUD front-end
   Os dados ficam no localStorage do navegador (sem back-end).
   As chamadas reais à API estão comentadas dentro das funções api*().
   Para ligar um back-end, descomente o fetch e remova o trecho local.
   ========================================================================== */

const CHAVE = "meus-livros:v1";
const ROTULOS = { quero: "Quero ler", lendo: "Lendo", lido: "Lido" };
const CORES_CAPA = ["#D5E0CE", "#E4DCC8", "#D9DEE3", "#E3D6D0", "#CFE0DB"];

const LIVROS_INICIAIS = [
  { id: "1", titulo: "Dom Casmurro", autor: "Machado de Assis", status: "lendo", observacao: "Parei no capítulo da Capitu." },
  { id: "2", titulo: "Grande Sertão: Veredas", autor: "Guimarães Rosa", status: "lido", observacao: "" },
  { id: "3", titulo: "Capitães da Areia", autor: "Jorge Amado", status: "quero", observacao: "" }
];

/* ---------- Estado ---------- */
let livros = carregarLocal();
let filtro = "todos";
let busca = "";
let editandoId = null;
let excluirId = null;
let ultimoId = null;
let timerAviso = null;

/* ---------- Elementos ---------- */
const $ = (seletor) => document.querySelector(seletor);
const lista = $("#lista");
const vazio = $("#vazio");
const contador = $("#contador");
const dialogoForm = $("#dialogo-form");
const dialogoExcluir = $("#dialogo-excluir");
const form = $("#form");
const campoTitulo = $("#f-titulo");
const campoAutor = $("#f-autor");
const campoStatus = $("#f-status");
const campoObs = $("#f-obs");

/* ==========================================================================
   Camada de dados (troque por chamadas ao back-end quando existir)
   ========================================================================== */

function carregarLocal() {
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) return JSON.parse(bruto);
  } catch (erro) { /* localStorage indisponível: usa os dados iniciais */ }
  return LIVROS_INICIAIS.map((livro) => ({ ...livro }));
}

function salvarLocal() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(livros));
  } catch (erro) { /* sem persistência: os dados valem só nesta sessão */ }
}

function novoId() {
  return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
}

// READ - lista os livros
async function apiListar() {
  // const resposta = await fetch("/api/livros");
  // livros = await resposta.json();
  return livros;
}

// CREATE - cadastra um livro
async function apiCriar(dados) {
  // const resposta = await fetch("/api/livros", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(dados)
  // });
  // return await resposta.json();
  const novo = { id: novoId(), ...dados };
  livros.unshift(novo);
  salvarLocal();
  return novo;
}

// UPDATE - atualiza um livro existente
async function apiAtualizar(id, dados) {
  // const resposta = await fetch(`/api/livros/${id}`, {
  //   method: "PUT",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(dados)
  // });
  // return await resposta.json();
  livros = livros.map((livro) => (livro.id === id ? { ...livro, ...dados } : livro));
  salvarLocal();
}

// DELETE - exclui um livro
async function apiExcluir(id) {
  // await fetch(`/api/livros/${id}`, { method: "DELETE" });
  livros = livros.filter((livro) => livro.id !== id);
  salvarLocal();
}

/* ==========================================================================
   Tela
   ========================================================================== */

function normalizar(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function corDaCapa(titulo) {
  let soma = 0;
  for (const letra of titulo) soma += letra.charCodeAt(0);
  return CORES_CAPA[soma % CORES_CAPA.length];
}

function livrosVisiveis() {
  const termo = normalizar(busca.trim());
  return livros.filter((livro) => {
    const passaFiltro = filtro === "todos" || livro.status === filtro;
    const passaBusca = !termo || normalizar(livro.titulo + " " + livro.autor).includes(termo);
    return passaFiltro && passaBusca;
  });
}

function criarCartao(livro) {
  const item = document.createElement("li");
  item.className = "livro" + (livro.id === ultimoId ? " nova" : "");

  const capa = document.createElement("div");
  capa.className = "capa";
  capa.setAttribute("aria-hidden", "true");
  capa.style.background = corDaCapa(livro.titulo);
  capa.textContent = livro.titulo.charAt(0).toUpperCase();

  const titulo = document.createElement("h2");
  titulo.textContent = livro.titulo;

  const autor = document.createElement("p");
  autor.className = "autor";
  autor.textContent = livro.autor;

  const selo = document.createElement("span");
  selo.className = "selo selo-" + livro.status;
  selo.textContent = ROTULOS[livro.status];

  item.append(capa, titulo, autor, selo);

  if (livro.observacao) {
    const obs = document.createElement("p");
    obs.className = "obs";
    obs.textContent = livro.observacao;
    item.append(obs);
  }

  const acoes = document.createElement("div");
  acoes.className = "livro-acoes";

  const editar = document.createElement("button");
  editar.type = "button";
  editar.className = "botao";
  editar.dataset.acao = "editar";
  editar.dataset.id = livro.id;
  editar.textContent = "Editar";
  editar.setAttribute("aria-label", "Editar " + livro.titulo);

  const excluir = document.createElement("button");
  excluir.type = "button";
  excluir.className = "botao botao-excluir";
  excluir.dataset.acao = "excluir";
  excluir.dataset.id = livro.id;
  excluir.textContent = "Excluir";
  excluir.setAttribute("aria-label", "Excluir " + livro.titulo);

  acoes.append(editar, excluir);
  item.append(acoes);
  return item;
}

function desenhar() {
  const total = livros.length;
  contador.textContent = total === 1 ? "1 livro na estante" : total + " livros na estante";

  const visiveis = livrosVisiveis();
  lista.replaceChildren(...visiveis.map(criarCartao));
  ultimoId = null;

  const semResultado = total > 0 && visiveis.length === 0;
  vazio.hidden = visiveis.length > 0;
  $("#vazio-titulo").textContent = semResultado ? "Nenhum livro encontrado" : "Sua estante está vazia";
  $("#vazio-texto").textContent = semResultado
    ? "Tente outra busca ou outro filtro."
    : "Cadastre o primeiro livro para começar.";
  $("#btn-vazio").hidden = semResultado;
}

function mostrarAviso(mensagem) {
  const aviso = $("#aviso");
  aviso.textContent = mensagem;
  aviso.classList.add("visivel");
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => aviso.classList.remove("visivel"), 2500);
}

/* ---------- Formulário (criar e editar) ---------- */

function limparErros() {
  for (const campo of [campoTitulo, campoAutor]) {
    campo.removeAttribute("aria-invalid");
    campo.setCustomValidity("");
  }
  $("#erro-titulo").textContent = "";
  $("#erro-autor").textContent = "";
}

function abrirFormulario(livro) {
  limparErros();
  editandoId = livro ? livro.id : null;
  $("#form-titulo").textContent = livro ? "Editar livro" : "Novo livro";
  $("#btn-salvar").textContent = livro ? "Salvar alterações" : "Salvar livro";
  campoTitulo.value = livro ? livro.titulo : "";
  campoAutor.value = livro ? livro.autor : "";
  campoStatus.value = livro ? livro.status : "quero";
  campoObs.value = livro ? livro.observacao : "";
  dialogoForm.showModal();
  campoTitulo.focus();
}

function validarCampo(campo, idErro) {
  const vazioOuEspacos = campo.value.trim() === "";
  if (vazioOuEspacos) {
    campo.setAttribute("aria-invalid", "true");
    $(idErro).textContent = "Preencha este campo.";
    return false;
  }
  campo.removeAttribute("aria-invalid");
  $(idErro).textContent = "";
  return true;
}

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const tituloOk = validarCampo(campoTitulo, "#erro-titulo");
  const autorOk = validarCampo(campoAutor, "#erro-autor");
  if (!tituloOk) return campoTitulo.focus();
  if (!autorOk) return campoAutor.focus();

  const dados = {
    titulo: campoTitulo.value.trim(),
    autor: campoAutor.value.trim(),
    status: campoStatus.value,
    observacao: campoObs.value.trim()
  };

  if (editandoId) {
    await apiAtualizar(editandoId, dados);
    mostrarAviso("Alterações salvas");
  } else {
    const novo = await apiCriar(dados);
    ultimoId = novo.id;
    mostrarAviso("Livro salvo");
  }

  dialogoForm.close();
  desenhar();
});

campoTitulo.addEventListener("input", () => validarCampo(campoTitulo, "#erro-titulo"));
campoAutor.addEventListener("input", () => validarCampo(campoAutor, "#erro-autor"));

/* ---------- Eventos da tela ---------- */

$("#btn-novo").addEventListener("click", () => abrirFormulario(null));
$("#btn-vazio").addEventListener("click", () => abrirFormulario(null));
$("#btn-cancelar").addEventListener("click", () => dialogoForm.close());

lista.addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-acao]");
  if (!botao) return;
  const livro = livros.find((item) => item.id === botao.dataset.id);
  if (!livro) return;

  if (botao.dataset.acao === "editar") {
    abrirFormulario(livro);
  } else {
    excluirId = livro.id;
    $("#excluir-texto").textContent = "Excluir \u201C" + livro.titulo + "\u201D da sua estante? Essa ação não pode ser desfeita.";
    dialogoExcluir.showModal();
  }
});

$("#btn-manter").addEventListener("click", () => dialogoExcluir.close());
$("#btn-excluir").addEventListener("click", async () => {
  await apiExcluir(excluirId);
  excluirId = null;
  dialogoExcluir.close();
  desenhar();
  mostrarAviso("Livro excluído");
});

$("#busca").addEventListener("input", (evento) => {
  busca = evento.target.value;
  desenhar();
});

$("#filtros").addEventListener("click", (evento) => {
  const botao = evento.target.closest("button[data-filtro]");
  if (!botao) return;
  filtro = botao.dataset.filtro;
  document.querySelectorAll(".filtro").forEach((item) => {
    item.setAttribute("aria-pressed", String(item === botao));
  });
  desenhar();
});

// Fecha as janelas ao clicar fora delas
for (const dialogo of [dialogoForm, dialogoExcluir]) {
  dialogo.addEventListener("click", (evento) => {
    if (evento.target === dialogo) dialogo.close();
  });
}

/* ---------- Início ---------- */
(async function iniciar() {
  await apiListar();
  desenhar();
})();
