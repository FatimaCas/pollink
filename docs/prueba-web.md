# Probar Pollink en el navegador

Versión web de la app con datos de ejemplo (Ana, Beto y Carla), sin conexión a Roble. Cada recarga empieza de cero. Sirve para revisar y discutir la UX.

**Link:** https://fatimacas.github.io/pollink/ (se actualiza solo con cada cambio en `dev`; tarda 3-5 min).

## Para diseño
1. Abre el link, mejor en el celular o con el navegador en vista móvil (F12 → icono de móvil).
2. En el celular: menú del navegador → «Agregar a pantalla de inicio» para abrirla como app.
3. Entra con `ana@demo.com` / `123456`, o usa «Continuar como invitado».
4. Recargar la página reinicia los datos.
5. Los comentarios van como se acuerde con el equipo (issue o PR); no hay nada que instalar.

Es la versión web: la barra inferior, los márgenes del teléfono y algunos gestos pueden verse distintos a la app nativa.

## Para desarrollo
1. Rama desde `origin/dev`.
2. `npm install` y `npm run web` (con `EXPO_PUBLIC_DATA_SOURCE=local` para datos locales; sin esa variable usa Roble).
3. `npm run build:web` genera `dist/` igual que el deploy, para comprobar que compila.
4. PR a `dev`. Al mergear, el workflow `Deploy web` republica el link.
5. Si falla el deploy: pestaña Actions → «Deploy web» → Re-run. Se puede lanzar a mano con «Run workflow».

Requisito único, una vez, por quien administre el repo: Settings → Pages → Source: **GitHub Actions**.
