// =============================================================================
// UTILS.JS — Funções utilitárias reutilizáveis
// =============================================================================

// --- Formatação monetária ---

/**
 * Formata um valor numérico como moeda brasileira.
 * @param {number} value - Valor em reais (ex: 29.90)
 * @returns {string} Ex: "R$ 29,90"
 */
function formatPrice(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Converte centavos para reais.
 * @param {number} cents - Valor em centavos (ex: 2990)
 * @returns {number} Ex: 29.90
 */
function centsToReal(cents) {
  return cents / 100;
}

/**
 * Converte reais para centavos (arredonda para inteiro).
 * @param {number} real - Valor em reais (ex: 29.90)
 * @returns {number} Ex: 2990
 */
function realToCents(real) {
  return Math.round(real * 100);
}

// --- Validação de formulário ---

/**
 * Valida formato de e-mail.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Valida e formata telefone brasileiro (aceita com ou sem máscara).
 * Retorna null se inválido.
 * @param {string} phone
 * @returns {string|null} Ex: "11999999999"
 */
function sanitizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  // Aceita 10 (fixo) ou 11 (celular) dígitos
  if (digits.length < 10 || digits.length > 11) return null;
  return digits;
}

// --- URL e navegação ---

/**
 * Lê um parâmetro da query string da URL atual.
 * @param {string} key
 * @returns {string|null}
 */
function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

/**
 * Redireciona para uma URL, com fallback para index.html.
 * @param {string} url
 */
function redirectTo(url) {
  window.location.href = url || 'index.html';
}

// --- DOM ---

/**
 * Atalho para document.querySelector — lança erro descritivo se não encontrar.
 * @param {string} selector
 * @param {Element} [root=document]
 * @returns {Element}
 */
function $(selector, root = document) {
  const el = root.querySelector(selector);
  if (!el) throw new Error(`Elemento não encontrado: "${selector}"`);
  return el;
}

/**
 * Atalho para document.querySelectorAll — retorna Array (não NodeList).
 * @param {string} selector
 * @param {Element} [root=document]
 * @returns {Element[]}
 */
function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Exibe um elemento (remove a classe 'hidden').
 * @param {Element|string} elOrSelector
 */
function show(elOrSelector) {
  const el = typeof elOrSelector === 'string'
    ? document.querySelector(elOrSelector)
    : elOrSelector;
  el?.classList.remove('hidden');
}

/**
 * Oculta um elemento (adiciona a classe 'hidden').
 * @param {Element|string} elOrSelector
 */
function hide(elOrSelector) {
  const el = typeof elOrSelector === 'string'
    ? document.querySelector(elOrSelector)
    : elOrSelector;
  el?.classList.add('hidden');
}

// --- Imagens ---

/**
 * Retorna a URL da imagem ou um placeholder SVG inline se estiver vazia.
 * @param {string|null} url
 * @param {string} [alt='Produto']
 * @returns {string}
 */
function getImageUrl(url, alt = 'Produto') {
  if (url && url.trim() !== '') return url;
  // Placeholder SVG cinza com ícone de câmera
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-size='64' text-anchor='middle' dominant-baseline='middle' fill='%239ca3af'%3E📦%3C/text%3E%3C/svg%3E`;
}

/**
 * Adiciona fallback automático de imagem a um elemento <img>.
 * @param {HTMLImageElement} imgEl
 */
function attachImageFallback(imgEl) {
  imgEl.addEventListener('error', () => {
    imgEl.src = getImageUrl(null);
    imgEl.onerror = null; // Evita loop
  });
}

// --- Notificações (toast) ---

let _toastTimer = null;

/**
 * Exibe uma notificação toast temporária na tela.
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='success']
 * @param {number} [durationMs=3000]
 */
function showToast(message, type = 'success', durationMs = 3000) {
  // Remove toast anterior se existir
  document.getElementById('toast-container')?.remove();
  clearTimeout(_toastTimer);

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  const toast = document.createElement('div');
  toast.id = 'toast-container';
  toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all duration-300 ${colors[type] || colors.info}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  _toastTimer = setTimeout(() => toast.remove(), durationMs);
}

// --- Skeleton loader ---

/**
 * Gera N cards skeleton para exibir durante o carregamento de produtos.
 * @param {number} count
 * @returns {string} HTML string
 */
function generateSkeletons(count = 8) {
  return Array.from({ length: count }, () => `
    <div class="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
      <div class="bg-gray-200 aspect-square"></div>
      <div class="p-4 space-y-3">
        <div class="h-4 bg-gray-200 rounded w-3/4"></div>
        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
        <div class="h-10 bg-gray-200 rounded-xl mt-4"></div>
      </div>
    </div>
  `).join('');
}

// --- Storage seguro ---

/**
 * Lê JSON do localStorage com fallback para valor padrão.
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
function storageGet(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Salva valor como JSON no localStorage. Silencia erros (ex: modo privado cheio).
 * @param {string} key
 * @param {*} value
 */
function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[storageSet] Falha ao salvar no localStorage:', e);
  }
}

/**
 * Remove uma chave do localStorage.
 * @param {string} key
 */
function storageRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // silencioso
  }
}
