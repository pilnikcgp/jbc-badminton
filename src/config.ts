// Všechny texty stránky na jednom místě. Upravte a nasaďte znovu.
// Termín a místo se berou z databáze (tabulka editions); texty níže
// se použijí, jen dokud tam nejsou vyplněné.

export const site = {
  /** Název akce – v hlavičce stránky i v záložce prohlížeče. */
  name: 'JBC',
  /** Nadtitulek nad názvem v hero sekci. */
  tagline: 'Turnaj ve smíšené čtyřhře',

  hero: {
    /** Fotka přes celou šířku, soubor v public/. Autentický moment s lidmi, ne prázdný kurt. */
    image: '/hero.jpg',
    imageAlt: 'Společná fotka hráček a hráčů s medailemi na kurtu po minulém ročníku',
    /**
     * Druhý řádek názvu (první řádek je `name`). {year} se nahradí rokem
     * aktuálního ročníku z databáze.
     */
    nameLine2: 'badmintonový turnaj {year}',
    cta: 'Přihlásit se',
  },

  footer: {
    organizer: 'Pořádá JIC',
    url: 'https://www.jic.cz',
    /**
     * Logo JIC z brand kitu (složka 02_Logo), např. '/brand/jic-logo.svg'.
     * Dokud je null, zobrazí se textový odkaz. Logo nedeformovat ani nepřebarvovat.
     */
    logo: null as string | null,
    logoAlt: 'JIC',
  },

  /** Zobrazí se, dokud v databázi není vyplněný termín / místo. */
  dateUnknown: 'Termín vybíráme',
  venueUnknown: 'Místo upřesníme',

  about: {
    heading: 'O turnaji',
    /** Odstavce úvodního textu. */
    paragraphs: [
      'Zástupný text: neformální interní badmintonový turnaj, na který se každý rok těšíme. Hrajeme smíšenou čtyřhru – přihlásíte se sami a páry vylosujeme.',
      'Zástupný text: nezáleží na tom, jestli hrajete pravidelně, nebo jste raketu drželi naposledy na chatě. Jde hlavně o to se potkat a zahrát si.',
    ],
    format: 'Smíšená čtyřhra, páry losem',
  },

  registration: {
    heading: 'Registrace',
    intro: 'Přihlaste se jako jednotlivec, páry vylosujeme.',
    closed: 'Registrace je teď uzavřená.',
    notYetOpen: 'Registrace zatím není otevřená. Sledujte tuto stránku.',
    success: 'Hotovo, jste přihlášení. Těšíme se!',
    duplicate: 'Tento e-mail už je v letošním ročníku přihlášený.',
    invalid: 'Zkontrolujte prosím vyplněné údaje.',
    error: 'Registraci se nepodařilo odeslat. Zkuste to prosím znovu.',
    listHeading: 'Přihlášení',
    listEmpty: 'Zatím nikdo. Buďte první!',
  },

  gallery: {
    heading: 'Fotogalerie',
  },

  history: {
    heading: 'Síň slávy',
    intro:
      'Umístění všech hráček a hráčů ve všech ročnících. Klikněte na hlavičku sloupce pro řazení, na umístění pro zobrazení páru.',
  },
} as const;
