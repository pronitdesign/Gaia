import Image from "next/image";

type BadgeTone = "white" | "purple" | "lilac";

const badgeStyles: Record<BadgeTone, { border: string; text: string; icon: string }> = {
  white: {
    border: "border-white/10",
    text: "text-white",
    icon: "/figma/icon-heart-white.svg",
  },
  purple: {
    border: "border-purple/10",
    text: "text-purple",
    icon: "/figma/icon-heart-purple.svg",
  },
  lilac: {
    border: "border-purple/10",
    text: "text-lilac",
    icon: "/figma/icon-heart-lilac.svg",
  },
};

export function SectionBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  const s = badgeStyles[tone];
  return (
    <div
      className={`inline-flex items-center justify-center gap-1 rounded-full border ${s.border} px-4 py-2`}
    >
      <Image src={s.icon} alt="" width={20} height={20} className="size-5" />
      <p
        className={`font-display text-[14px] uppercase leading-none tracking-[-0.42px] ${s.text}`}
      >
        {children}
      </p>
    </div>
  );
}

export function GradientButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="btn-gradient flex h-12 cursor-pointer items-center justify-center gap-1 rounded-full px-6 transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
    >
      <span className="text-[16px] font-medium leading-[1.2] tracking-[-0.16px] text-white">
        {children}
      </span>
      <Image src="/figma/icon-arrow.svg" alt="" width={20} height={20} className="size-5" />
    </button>
  );
}

export function OutlineButton({
  dark,
  children,
}: {
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`flex h-12 cursor-pointer items-center justify-center gap-1 rounded-full border px-6 transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98] ${
        dark ? "border-ink/10 text-ink" : "border-white/10 bg-white/5 text-white"
      }`}
    >
      <span className="text-[16px] font-medium leading-[1.2] tracking-[-0.16px]">{children}</span>
      <Image
        src={dark ? "/figma/icon-arrow-forward-dark.svg" : "/figma/icon-arrow-forward.svg"}
        alt=""
        width={20}
        height={20}
        className="size-5 rotate-90"
      />
    </button>
  );
}
