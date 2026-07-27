/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

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
