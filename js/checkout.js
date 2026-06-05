// =============================================================================
// CHECKOUT.JS — Envia pedido para a API do admin e redireciona para pagamento
// Depende de: config.js, utils.js, carrinho.js
// =============================================================================

/**
 * Ponto de entrada principal — chamado pelo botão "Finalizar Compra".
 * Valida formulário, monta payload e envia para /api/create-checkout.
 */
async function iniciarCheckout() {
  const btnFinalizar = document.getElementById('btn-finalizar');
  const formErro = document.getElementById('form-erro');

  try {
    // 1. Coleta e valida dados do comprador
    const customer = coletarDadosCliente();
    if (!customer) return; // validação já exibiu mensagem

    // 2. Valida carrinho
    if (cartIsEmpty()) {
      exibirErroCheckout('Seu carrinho está vazio.');
      return;
    }

    // 3. Monta payload
    const items = cartToCheckoutItems();
    const payload = { customer, items };

    // 4. Estado de loading
    setLoadingCheckout(true, btnFinalizar);
    if (formErro) formErro.classList.add('hidden');

    // 5. Envia para a API
    const data = await enviarPedido(payload);

    // 6. Limpa carrinho e redireciona para o link de pagamento InfinitePay
    cartClear();
    window.location.href = data.payment_url;

  } catch (err) {
    console.error('[checkout] Erro:', err);
    exibirErroCheckout(
      err.userMessage ||
        'Não foi possível processar o pagamento. Tente novamente em instantes.'
    );
  } finally {
    setLoadingCheckout(false, btnFinalizar);
  }
}

// --- Coleta e validação do formulário ---

/**
 * Lê os campos do formulário e retorna o objeto customer validado.
 * Retorna null e exibe erros inline se inválido.
 * @returns {{name, email, phone_number}|null}
 */
function coletarDadosCliente() {
  const nome = document.getElementById('campo-nome')?.value.trim() || '';
  const email = document.getElementById('campo-email')?.value.trim() || '';
  const telefone = document.getElementById('campo-telefone')?.value.trim() || '';

  let valido = true;

  if (nome.length < 3) {
    marcarCampoInvalido('campo-nome', 'Informe seu nome completo.');
    valido = false;
  } else {
    limparCampoInvalido('campo-nome');
  }

  if (!isValidEmail(email)) {
    marcarCampoInvalido('campo-email', 'Informe um e-mail válido.');
    valido = false;
  } else {
    limparCampoInvalido('campo-email');
  }

  const phone = sanitizePhone(telefone);
  if (!phone) {
    marcarCampoInvalido('campo-telefone', 'Informe um telefone válido (com DDD).');
    valido = false;
  } else {
    limparCampoInvalido('campo-telefone');
  }

  if (!valido) return null;

  return { name: nome, email, phone_number: phone };
}

// --- Comunicação com a API ---

/**
 * POST para /api/create-checkout no admin (Vercel).
 * Lança erro com .userMessage para exibição amigável.
 * @param {{customer, items}} payload
 * @returns {Promise<{payment_url: string}>}
 */
async function enviarPedido(payload) {
  const url = `${CONFIG.ADMIN_API_URL}/api/create-checkout`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (networkErr) {
    const err = new Error('Falha de rede');
    err.userMessage =
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
    throw err;
  }

  if (!res.ok) {
    let mensagem = 'Erro ao processar o pedido.';
    try {
      const body = await res.json();
      if (body?.error) mensagem = body.error;
    } catch {
      // resposta não é JSON
    }
    const err = new Error(`API ${res.status}`);
    err.userMessage = mensagem;
    throw err;
  }

  const data = await res.json();

  if (!data?.payment_url) {
    const err = new Error('Resposta inválida da API');
    err.userMessage =
      'O servidor retornou uma resposta inesperada. Contate o suporte.';
    throw err;
  }

  return data;
}

// --- Helpers de UI ---

function setLoadingCheckout(loading, btn) {
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<svg class="animate-spin h-5 w-5 mx-auto text-white" fill="none" viewBox="0 0 24 24">
         <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
         <path class="opacity-75" fill="currentColor"
           d="M4 12a8 8 0 018-8v8H4z"></path>
       </svg>`
    : 'Finalizar Compra';
}

function exibirErroCheckout(mensagem) {
  const el = document.getElementById('form-erro');
  if (!el) return;
  el.textContent = mensagem;
  el.classList.remove('hidden');
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function marcarCampoInvalido(campoId, mensagem) {
  const input = document.getElementById(campoId);
  const erro = document.getElementById(`${campoId}-erro`);
  input?.classList.add('border-red-400', 'focus:ring-red-400');
  input?.classList.remove('border-gray-300');
  if (erro) {
    erro.textContent = mensagem;
    erro.classList.remove('hidden');
  }
}

function limparCampoInvalido(campoId) {
  const input = document.getElementById(campoId);
  const erro = document.getElementById(`${campoId}-erro`);
  input?.classList.remove('border-red-400', 'focus:ring-red-400');
  input?.classList.add('border-gray-300');
  erro?.classList.add('hidden');
}
