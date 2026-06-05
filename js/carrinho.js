// =============================================================================
// CARRINHO.JS — Gerenciamento do carrinho de compras no localStorage
// Depende de: utils.js
// =============================================================================

const CART_KEY = 'vitrine_cart';

// --- Leitura e escrita ---

/**
 * Retorna todos os itens do carrinho.
 * @returns {Array<{id, slug, nome, preco, preco_promocional, imagem_url, quantidade, estoque}>}
 */
function cartGet() {
  return storageGet(CART_KEY, []);
}

/**
 * Persiste o array de itens e atualiza o contador no header.
 * @param {Array} items
 */
function cartSave(items) {
  storageSet(CART_KEY, items);
  cartUpdateBadge();
}

// --- Operações principais ---

/**
 * Adiciona um produto ao carrinho ou incrementa a quantidade se já existir.
 * Respeita o limite de estoque.
 * @param {Object} produto - Objeto produto do Supabase
 * @param {number} [quantidade=1]
 * @returns {'added'|'updated'|'out_of_stock'|'max_stock'}
 */
function cartAdd(produto, quantidade = 1) {
  const items = cartGet();
  const idx = items.findIndex((i) => i.id === produto.id);

  if (idx === -1) {
    // Produto novo no carrinho
    if (produto.em_estoque <= 0) return 'out_of_stock';

    const qtd = Math.min(quantidade, produto.em_estoque);
    items.push({
      id: produto.id,
      slug: produto.slug,
      nome: produto.nome,
      preco: produto.preco,
      preco_promocional: produto.preco_promocional || null,
      imagem_url: produto.imagem_url || null,
      quantidade: qtd,
      estoque: produto.em_estoque,
    });
    cartSave(items);
    return 'added';
  }

  // Produto já existe — incrementa
  const novaQtd = items[idx].quantidade + quantidade;
  if (novaQtd > items[idx].estoque) {
    // Atualiza ao máximo permitido sem exceder
    items[idx].quantidade = items[idx].estoque;
    cartSave(items);
    return 'max_stock';
  }

  items[idx].quantidade = novaQtd;
  cartSave(items);
  return 'updated';
}

/**
 * Define a quantidade exata de um item. Remove o item se quantidade <= 0.
 * @param {string} produtoId
 * @param {number} quantidade
 */
function cartSetQuantity(produtoId, quantidade) {
  let items = cartGet();
  const idx = items.findIndex((i) => i.id === produtoId);
  if (idx === -1) return;

  if (quantidade <= 0) {
    items.splice(idx, 1);
  } else {
    items[idx].quantidade = Math.min(quantidade, items[idx].estoque);
  }

  cartSave(items);
}

/**
 * Remove um item do carrinho pelo ID.
 * @param {string} produtoId
 */
function cartRemove(produtoId) {
  const items = cartGet().filter((i) => i.id !== produtoId);
  cartSave(items);
}

/**
 * Esvazia o carrinho completamente.
 */
function cartClear() {
  storageRemove(CART_KEY);
  cartUpdateBadge();
}

// --- Cálculos ---

/**
 * Retorna o preço efetivo de um item (promocional se houver, senão normal).
 * @param {Object} item
 * @returns {number}
 */
function cartItemPrice(item) {
  return item.preco_promocional && item.preco_promocional < item.preco
    ? item.preco_promocional
    : item.preco;
}

/**
 * Calcula o subtotal de um item (preço × quantidade).
 * @param {Object} item
 * @returns {number}
 */
function cartItemSubtotal(item) {
  return cartItemPrice(item) * item.quantidade;
}

/**
 * Calcula o total geral do carrinho.
 * @returns {number}
 */
function cartTotal() {
  return cartGet().reduce((sum, item) => sum + cartItemSubtotal(item), 0);
}

/**
 * Retorna a quantidade total de itens no carrinho (somando quantidades).
 * @returns {number}
 */
function cartCount() {
  return cartGet().reduce((sum, item) => sum + item.quantidade, 0);
}

/**
 * Retorna true se o carrinho estiver vazio.
 * @returns {boolean}
 */
function cartIsEmpty() {
  return cartGet().length === 0;
}

// --- UI: badge do header ---

/**
 * Atualiza o número exibido no ícone do carrinho no header.
 * Busca qualquer elemento com [data-cart-badge] na página.
 */
function cartUpdateBadge() {
  const count = cartCount();
  document.querySelectorAll('[data-cart-badge]').forEach((el) => {
    el.textContent = count;
    // Exibe o badge apenas quando há itens
    if (count > 0) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

// Inicializa o badge assim que o script carrega
document.addEventListener('DOMContentLoaded', cartUpdateBadge);

// --- Serialização para checkout ---

/**
 * Converte os itens do carrinho no formato esperado pela API /api/create-checkout.
 * Preços são enviados em centavos (inteiros).
 * @returns {Array<{description, quantity, price}>}
 */
function cartToCheckoutItems() {
  return cartGet().map((item) => ({
    description: item.nome,
    quantity: item.quantidade,
    price: realToCents(cartItemPrice(item)), // centavos
  }));
}
