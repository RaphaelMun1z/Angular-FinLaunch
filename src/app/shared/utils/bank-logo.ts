export function bankLogoForName(name: string | null | undefined): string | null {
  const normalized = (name ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

  if (normalized.includes("itau")) return "assets/banks/itau.png";
  if (normalized.includes("nubank") || normalized === "nu") return "assets/banks/nubank.png";
  if (normalized.includes("swile")) return "assets/banks/swile.png";
  return null;
}
