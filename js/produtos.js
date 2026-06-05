// =============================================================================
// PRODUTOS.JS — Busca produtos do Supabase via REST API
// Depende de: config.js, utils.js
// =============================================================================

const CACHE_KEY_PRODUTOS = 'vitrine_cache_produtos';
const CACHE_KEY_CATEGORIAS = 'vitrine_cache_categorias';

// --- Helpers de cache (sessionStorage, expira ao fechar a aba) ---

function cacheGet(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const { data, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function cacheSet(key, data) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify({ data, expiresAt: Date.now() + CONFIG.CACHE_TTL_MS })
    );
  } catch {
    // sessionStorage cheio ou indisponível — segue sem cache
  }
}

// --- Requisição base ao Supabase REST ---

/**
 * Faz uma requisição GET autenticada à REST API do Supabase.
 * @param {string} endpoint - Ex: '/rest/v1/produtos?select=*'
 * @returns {Promise<Array>}
 */
async function supabaseFetch(endpoint) {
  const url = `${CONFIG.SUPABASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      apikey: CONFIG.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${res.status}: ${body}`);
  }

  return res.json();
}

// --- API pública ---

/**
 * Busca todos os produtos ativos do Supabase.
 * Utiliza cache de sessão para evitar requisições repetidas.
 * @returns {Promise<Array>}
 */
async function fetchProdutos() {
  const cached = cacheGet(CACHE_KEY_PRODUTOS);
  if (cached) return cached;

  const campos = [
    'id', 'slug', 'nome', 'descricao', 'preco',
    'preco_promocional', 'imagem_url', 'em_estoque', 'categoria',
  ].join(',');

  // Filtra apenas produtos ativos, ordena por nome
  const endpoint =
    `/rest/v1/produtos?select=${campos}&ativo=eq.true&order=nome.asc`;

  const data = await supabaseFetch(endpoint);
  cacheSet(CACHE_KEY_PRODUTOS, data);
  return data;
}

/**
 * Busca um único produto pelo slug.
 * Tenta reaproveitar o cache de listagem antes de fazer nova requisição.
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
async function fetchProdutoPorSlug(slug) {
  // Tenta encontrar no cache de listagem primeiro
  const cached = cacheGet(CACHE_KEY_PRODUTOS);
  if (cached) {
    const found = cached.find((p) => p.slug === slug);
    if (found) return found;
  }

  const campos = [
    'id', 'slug', 'nome', 'descricao', 'preco',
    'preco_promocional', 'imagem_url', 'em_estoque', 'categoria',
  ].join(',');

  const endpoint =
    `/rest/v1/produtos?select=${campos}&slug=eq.${encodeURIComponent(slug)}&ativo=eq.true&limit=1`;

  const data = await supabaseFetch(endpoint);
  return data[0] || null;
}

/**
 * Busca produtos de uma mesma categoria, excluindo o produto atual.
 * @param {string} categoria
 * @param {string} excluirSlug - Slug do produto a excluir dos resultados
 * @param {number} [limite=4]
 * @returns {Promise<Array>}
 */
async function fetchProdutosRelacionados(categoria, excluirSlug, limite = 4) {
  // Reaproveita cache de listagem completa se disponível
  const cached = cacheGet(CACHE_KEY_PRODUTOS);
  if (cached) {
    return cached
      .filter((p) => p.categoria === categoria && p.slug !== excluirSlug)
      .slice(0, limite);
  }

  const campos = 'id,slug,nome,preco,preco_promocional,imagem_url,em_estoque';
  const endpoint =
    `/rest/v1/produtos?select=${campos}&categoria=eq.${encodeURIComponent(categoria)}&slug=neq.${encodeURIComponent(excluirSlug)}&ativo=eq.true&limit=${limite}`;

  return supabaseFetch(endpoint);
}

/**
 * Retorna lista de categorias únicas a partir dos produtos carregados.
 * @returns {Promise<string[]>}
 */
async function fetchCategorias() {
  const cached = cacheGet(CACHE_KEY_CATEGORIAS);
  if (cached) return cached;

  const produtos = await fetchProdutos();
  const categorias = [
    ...new Set(
      produtos
        .map((p) => p.categoria)
        .filter(Boolean)
    ),
  ].sort();

  cacheSet(CACHE_KEY_CATEGORIAS, categorias);
  return categorias;
}

// --- Renderização de cards ---

/**
 * Gera o HTML de um card de produto para a grade da vitrine.
 * @param {Object} produto
 * @returns {string} HTML string
 */
function renderCardProduto(produto) {
  const preco = formatPrice(produto.preco);
  const esgotado = produto.em_estoque <= 0;
  const temPromocao =
    produto.preco_promocional &&
    produto.preco_promocional < produto.preco;

  const precoHtml = temPromocao
    ? `<span class="text-gray-400 line-through text-sm">${preco}</span>
       <span class="text-blue-600 font-bold text-lg">${formatPrice(produto.preco_promocional)}</span>`
    : `<span class="text-gray-800 font-bold text-lg">${preco}</span>`;

  const badgeEsgotado = esgotado
    ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
         Esgotado
       </span>`
    : '';

  const badgePromocao =
    temPromocao && !esgotado
      ? `<span class="absolute top-2 left-2 bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
           Promoção
         </span>`
      : '';

  const botao = esgotado
    ? `<button disabled
         class="w-full mt-4 py-2 rounded-xl bg-gray-200 text-gray-400 font-semibold cursor-not-allowed text-sm">
         Esgotado
       </button>`
    : `<button
         onclick="handleAddToCart('${produto.id}')"
         data-produto-id="${produto.id}"
         class="w-full mt-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95
                text-white font-semibold text-sm transition-all duration-150">
         Adicionar ao carrinho
       </button>`;

  return `
    <article class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col"
             data-produto-id="${produto.id}">
      <a href="produto.html?slug=${produto.slug}" class="block relative">
        <img
          src="${getImageUrl(produto.imagem_url)}"
          alt="${produto.nome}"
          class="w-full aspect-square object-cover"
          loading="lazy"
          onerror="this.src='${getImageUrl(null)}'; this.onerror=null;"
        />
        ${badgeEsgotado}
        ${badgePromocao}
      </a>
      <div class="p-4 flex flex-col flex-1">
        <a href="produto.html?slug=${produto.slug}"
           class="text-gray-800 font-medium text-sm leading-snug hover:text-blue-600 transition-colors line-clamp-2 flex-1">
          ${produto.nome}
        </a>
        <div class="flex items-baseline gap-2 mt-2">
          ${precoHtml}
        </div>
        ${botao}
      </div>
    </article>
  `;
}

/**
 * Renderiza a lista de categorias como botões de filtro.
 * @param {string[]} categorias
 * @param {string|null} ativa - Categoria atualmente selecionada
 * @returns {string} HTML string
 */
function renderFiltrosCategorias(categorias, ativa = null) {
  const btnBase =
    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-150 border';
  const btnAtivo = 'bg-blue-600 text-white border-blue-600';
  const btnInativo =
    'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600';

  const todos = `
    <button onclick="filtrarPorCategoria(null)"
            class="${btnBase} ${!ativa ? btnAtivo : btnInativo}">
      Todos
    </button>`;

  const botoes = categorias
    .map(
      (cat) => `
    <button onclick="filtrarPorCategoria('${cat}')"
            class="${btnBase} ${ativa === cat ? btnAtivo : btnInativo}">
      ${cat}
    </button>`
    )
    .join('');

  return todos + botoes;
}
