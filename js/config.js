// =============================================================================
// CONFIG.JS — Configurações globais da vitrine
// Preencha SUPABASE_URL, SUPABASE_ANON_KEY e ADMIN_API_URL antes de publicar.
// NUNCA coloque a SERVICE_ROLE_KEY aqui — use apenas a ANON_KEY.
// =============================================================================

const CONFIG = {
  // --- Supabase ---
  // Encontre em: Supabase → Settings → API → Project URL
  SUPABASE_URL: 'https://SEU_PROJECT_ID.supabase.co',

  // Encontre em: Supabase → Settings → API → anon public
  SUPABASE_ANON_KEY: 'SUA_ANON_KEY_AQUI',

  // --- API do Admin (Vercel) ---
  // URL do projeto ecommerce-admin publicado na Vercel
  ADMIN_API_URL: 'https://SEU_PROJETO.vercel.app',

  // --- Loja ---
  STORE_NAME: 'Minha Loja',
  STORE_LOGO_URL: '', // URL da logo (opcional)

  // --- Cache ---
  CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutos em milissegundos
};

// Valida configurações críticas em desenvolvimento
(function validateConfig() {
  const placeholders = [
    'SEU_PROJECT_ID',
    'SUA_ANON_KEY_AQUI',
    'SEU_PROJETO',
  ];
  const isMisconfigured = placeholders.some(
    (p) =>
      CONFIG.SUPABASE_URL.includes(p) ||
      CONFIG.SUPABASE_ANON_KEY.includes(p) ||
      CONFIG.ADMIN_API_URL.includes(p)
  );
  if (isMisconfigured) {
    console.warn(
      '[CONFIG] ⚠️ Atenção: config.js ainda contém valores placeholder. ' +
        'Preencha SUPABASE_URL, SUPABASE_ANON_KEY e ADMIN_API_URL.'
    );
  }
})();
