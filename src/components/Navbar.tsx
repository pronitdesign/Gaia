import Image from "next/image";

const links = [
  { label: "Benefícios", href: "#beneficios" },
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Depoimentos", href: "#depoimentos" },
  { label: "FAQ", href: "#faq" },
  { label: "Planos", href: "#planos" },
];

export default function Navbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-40 mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-6 lg:px-12">
      <a href="#" aria-label="Gaia">
        <Image src="/figma/logo-gaia.svg" alt="Gaia" width={108} height={28} priority />
      </a>

      <nav className="hidden items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 backdrop-blur-lg lg:flex">
        {links.map((link) => (
          <a
            key={link.label}
            href={link.href}
            className="p-2.5 font-nav text-[14px] leading-[1.2] tracking-[-0.14px] text-white transition-opacity hover:opacity-70"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="hidden h-10 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.02] px-4 backdrop-blur-lg transition-opacity hover:opacity-80 sm:flex"
        >
          <span className="text-[14px] font-medium leading-[1.2] tracking-[-0.14px] text-white">
            Fazer Login
          </span>
        </button>
        <button
          type="button"
          className="btn-gradient flex h-10 cursor-pointer items-center justify-center rounded-full px-4 transition-transform duration-300 hover:scale-[1.03]"
        >
          <span className="text-[14px] font-medium leading-[1.2] tracking-[-0.14px] text-white">
            Criar Conta
          </span>
        </button>
      </div>
    </header>
  );
}
