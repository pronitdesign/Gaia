/* ── Elenco dos mocks ──────────────────────────────────────────────────────
   As mesmas pessoas aparecem no bento do Features E na tela do iPhone
   (PhoneScreen), que pousa DENTRO do card Prontuário do próprio Features. Com
   os nomes escritos à mão em cada mock eles derivavam: a Marina do plano tinha
   uma foto e a Marina do prontuário, iniciais; um "Rafael" no laudo virava um
   "Diego" na agenda logo abaixo. Como as duas superfícies dividem a mesma
   dobra da tela, isso não lê como dado de exemplo — lê como bug.

   `photo` é opcional DE PROPÓSITO, e não é um elenco pela metade: em produto
   real nem todo paciente sobe foto, e o Avatar cai nas iniciais sozinho. É o
   que sustenta a Bianca (e a Ana/Pedro da tela de Início) sem inventar rosto
   pra elas. Retratos em /public/pessoa-*.webp — quadrados de 256px, já
   recortados no rosto, então o object-cover não precisa de object-position.  */

export type Person = {
  name: string;
  /** Iniciais — fallback do Avatar quando não há `photo`. */
  init: string;
  photo?: string;
};

export const MARINA: Person = { name: "Marina Alves", init: "MA", photo: "/pessoa-marina.webp" };
export const JOAO: Person = { name: "João Silva", init: "JS", photo: "/pessoa-joao.webp" };
export const CAIO: Person = { name: "Caio Medeiros", init: "CM", photo: "/pessoa-caio.webp" };
export const BIANCA: Person = { name: "Bianca Souza", init: "BS" };
export const ANA: Person = { name: "Ana Costa", init: "AC" };
export const PEDRO: Person = { name: "Pedro Lima", init: "PL" };
