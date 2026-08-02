/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Sessões paralelas no mesmo repo compartilhavam o mesmo .next e corrompiam o
  // build uma da outra. Com GAIA_DIST cada sessão constrói e serve o seu próprio
  // diretório, sem tocar no da outra. Sem a variável, nada muda.
  distDir: process.env.GAIA_DIST || ".next",

  images: {
    // Os <Image> do bloco do Kácio (ícones, avatares) passam a sair em AVIF
    // quando o browser aceita, com WebP de fallback. As fotos servidas por <img>
    // cru já vão em WebP dimensionado direto do public/ — o pipeline do
    // next/image não as toca.
    formats: ["image/avif", "image/webp"],
    // Larguras que a página realmente pede. A lista padrão do Next vai até
    // 3840 e gera variantes que nada nesta landing consome.
    deviceSizes: [640, 828, 1080, 1280, 1920, 2560],
    imageSizes: [32, 64, 128, 256, 400],
    minimumCacheTTL: 2592000, // 30 dias
  },

  async headers() {
    // Nada em public/ tem hash no nome, então o default do Next é
    // `max-age=0` — toda revisita revalida tudo de novo, mesmo sem ter mudado.
    // Estes assets só mudam junto com um deploy, então vale cache longo com
    // revalidação em segundo plano.
    const cache = [
      {
        key: "Cache-Control",
        value: "public, max-age=2592000, stale-while-revalidate=604800",
      },
    ];
    return [
      // Assets soltos na RAIZ de /public (auditoria Felix 2.5): sem esta regra
      // eles saem com max-age=0 e toda revisita paga 10–15 RTTs de revalidação
      // — e o optimizer ESPELHA o Cache-Control do upstream, então rotear a
      // imagem sem consertar isto aqui não consertava o cache dela. Padrão de
      // segmento único (alternância explícita por prefixo/arquivo): nunca
      // alcança /_next/* nem as subpastas, que têm regra própria. 30d+SWR e
      // não immutable — immutable exigiria renomear a cada troca de conteúdo,
      // e estes arquivos já foram trocados in-place mais de uma vez.
      {
        source:
          "/:file(loading\\.mp4|loading-mobile\\.mp4|loading-av1\\.mp4|loading-mobile-av1\\.mp4|loading-poster\\.webp|passo.*\\.webp|pricing-campo-bg.*\\.webp|roberta.*\\.webp|pessoa-.*\\.webp|plano-.*\\.webp|orquidea-roberta\\.webp|quem-construiu-olhos\\.webp)",
        headers: cache,
      },
      { source: "/figma/:path*", headers: cache },
      { source: "/video/:path*", headers: cache },
      { source: "/olho-seq/:path*", headers: cache },
      { source: "/textures/:path*", headers: cache },
      { source: "/water/:path*", headers: cache },
      { source: "/models/:path*", headers: cache },
      { source: "/fonts/:path*", headers: cache },
      { source: "/fx/:path*", headers: cache },
    ];
  },
};

export default nextConfig;
