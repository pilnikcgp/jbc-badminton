import './styles.css';
import { site } from './config';
import { fetchCurrentEdition, type Edition } from './lib/api';
import { initAbout, initFooter, initHero } from './sections/hero';
import { initRegistration } from './sections/registration';
import { initGallery } from './sections/gallery';
import { initHistory } from './sections/history';

document.title = `${site.name} – badmintonový turnaj`;

const section = (id: string) => document.getElementById(id)!;

// Sekce nezávislé na ročníku se načítají hned.
initFooter(document.getElementById('paticka')!);
initGallery(section('galerie'));
initHistory(section('historie'));

let edition: Edition | null = null;
try {
  edition = await fetchCurrentEdition();
} catch (err) {
  console.error('Nepodařilo se načíst aktuální ročník', err);
}

initHero(section('uvod'), edition);
initAbout(section('o-turnaji'), edition);
initRegistration(section('registrace'), edition);
