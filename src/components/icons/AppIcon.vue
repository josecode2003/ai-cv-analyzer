<script>
import { h } from 'vue'

/*
 * Set de iconos propio en trazo (estilo "stroke"), para no depender de una
 * librería externa ni de emojis como iconografía de sección.
 */
const ICONS = {
  user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 20a8 8 0 0 1 16 0"></path>',
  briefcase:
    '<rect x="2.5" y="7" width="19" height="13" rx="2"></rect><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M2.5 13h19"></path>',
  'graduation-cap':
    '<path d="M2 8 12 3l10 5-10 5-10-5Z"></path><path d="M6 10.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5"></path><path d="M22 8v6"></path>',
  tool: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a6 6 0 0 1-7.9 7.9l-6.6 6.6a2.1 2.1 0 0 1-3-3l6.6-6.6a6 6 0 0 1 7.9-7.9Z"></path>',
  trophy:
    '<path d="M7 4h10v4a5 5 0 0 1-10 0V4Z"></path><path d="M7 5H4.5A2.5 2.5 0 0 0 7 9.5"></path><path d="M17 5h2.5A2.5 2.5 0 0 1 17 9.5"></path><path d="M12 13v4"></path><path d="M8 21h8"></path>',
  award:
    '<circle cx="12" cy="8" r="6"></circle><path d="m8.5 13.5-1.3 8.3 4.8-2.9 4.8 2.9-1.3-8.3"></path>',
  compass:
    '<circle cx="12" cy="12" r="10"></circle><path d="m15.5 8.5-2 5-5 2 2-5Z"></path>',
  users:
    '<path d="M16 21v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V21"></path><circle cx="9" cy="8" r="3.5"></circle><path d="M22 21v-1.5a4 4 0 0 0-3-3.9"></path><path d="M15.5 4.6a3.5 3.5 0 0 1 0 6.8"></path>',
  'thumbs-up':
    '<path d="M7 21H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3Z"></path><path d="M7 11l3.5-7a2 2 0 0 1 2 2v4h4.6a2 2 0 0 1 2 2.4l-1.2 6A2 2 0 0 1 16 20H7Z"></path>',
  'alert-triangle':
    '<path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
  rocket:
    '<path d="M13.5 2.5c2.4 1.8 4 4.9 4 8 0 1.8-.8 3.7-1.8 4.9l-1.7 1.9-1.7-1.9c-1-1.2-1.8-3.1-1.8-4.9 0-3.1 1.6-6.2 4-8Z"></path><path d="m9 15-2.5 2.5.6 3.4 3.4-.6"></path><path d="m15 15 2.5 2.5-.6 3.4-3.4-.6"></path><circle cx="13.5" cy="9.5" r="1.5"></circle>',
  'bar-chart':
    '<path d="M4 20V10"></path><path d="M12 20V4"></path><path d="M20 20v-7"></path>',
  sun: '<circle cx="12" cy="12" r="4.2"></circle><path d="M12 2.5v2.4M12 19.1v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.5 12h2.4M19.1 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7"></path>',
  moon: '<path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a8.5 8.5 0 1 0 11.1 11.1Z"></path>',
  menu: '<path d="M4 6.5h16"></path><path d="M4 12h16"></path><path d="M4 17.5h16"></path>',
  x: '<path d="m5 5 14 14"></path><path d="m19 5-14 14"></path>',
  'upload-cloud':
    '<path d="M7.5 17.5A4.5 4.5 0 0 1 6 8.7 5.5 5.5 0 0 1 16.9 7a4.5 4.5 0 0 1 .6 9"></path><path d="M12 21v-8"></path><path d="m8.5 15.5 3.5-3.5 3.5 3.5"></path>',
  'file-text':
    '<path d="M6 2.5h8l4.5 4.5V20a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5Z"></path><path d="M14 2.5V7h4.5"></path><path d="M8 12.5h8M8 16.5h8"></path>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"></path>',
  'check-circle':
    '<circle cx="12" cy="12" r="9"></circle><path d="m8.5 12.5 2.5 2.5 4.5-5.5"></path>',
  'x-circle':
    '<circle cx="12" cy="12" r="9"></circle><path d="m9.5 9.5 5 5"></path><path d="m14.5 9.5-5 5"></path>',
  'dot-circle':
    '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="2.6"></circle>',
  'chevron-down': '<path d="m6 9.5 6 6 6-6"></path>',
  'chevron-right': '<path d="m9 6 6 6-6 6"></path>',
  'trending-up':
    '<path d="m3 16.5 6-6.5 4 4 7-8.5"></path><path d="M15 5.5h5v5"></path>',
  'trending-down':
    '<path d="m3 7.5 6 6.5 4-4 7 8.5"></path><path d="M15 18.5h5v-5"></path>',
  minus: '<path d="M5 12h14"></path>',
  newspaper:
    '<path d="M4.5 5.5h11a1.5 1.5 0 0 1 1.5 1.5v11.3A1.7 1.7 0 0 0 18.7 20H6a1.5 1.5 0 0 1-1.5-1.5Z"></path><path d="M17 8.5h2.5a1 1 0 0 1 1 1V18a2 2 0 0 1-2 2"></path><path d="M7.5 9h5M7.5 12h5M7.5 15h3"></path>',
  'external-link':
    '<path d="M9.5 14.5 20 4"></path><path d="M13.5 4H20v6.5"></path><path d="M18 13v5.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H11"></path>',
  'arrow-left': '<path d="M19 12H5"></path><path d="m11 6-6 6 6 6"></path>',
  'arrow-right': '<path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path>',
  trash:
    '<path d="M4.5 7h15"></path><path d="M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2"></path><path d="M6.5 7 7.3 19a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7"></path><path d="M10 11v6M14 11v6"></path>',
  'map-pin':
    '<path d="M12 21.5S5 15.3 5 10a7 7 0 0 1 14 0c0 5.3-7 11.5-7 11.5Z"></path><circle cx="12" cy="10" r="2.5"></circle>',
  target:
    '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="5"></circle><circle cx="12" cy="12" r="1.3"></circle>',
  sparkles:
    '<path d="M12 3v4M12 17v4M3 12h4M17 12h4"></path><path d="m7 7 2 2M15 15l2 2M17 7l-2 2M9 15l-2 2"></path><circle cx="12" cy="12" r="2.2"></circle>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  scale:
    '<path d="M12 3v18"></path><path d="M6.5 4.5h11"></path><path d="M4 9.5 6.5 4.5 9 9.5a2.6 2.6 0 0 1-5 0Z"></path><path d="M15 9.5l2.5-5 2.5 5a2.6 2.6 0 0 1-5 0Z"></path>'
}

/*
 * Render function en vez de plantilla con v-html: el SVG es el único nodo
 * raíz, así que hereda el atributo de scope del componente padre y sus
 * reglas de tamaño se aplican igual en desarrollo que en producción.
 * innerHTML solo recibe el contenido fijo de ICONS, nunca datos de usuario.
 */
export default {
  name: 'AppIcon',

  props: {
    name: {
      type: String,
      required: true
    }
  },

  setup(props) {
    return () =>
      h('svg', {
        class: 'app-icon',
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': '1.8',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
        'aria-hidden': 'true',
        focusable: 'false',
        innerHTML: ICONS[props.name] || ''
      })
  }
}
</script>

<style>
.app-icon {
  width: 1.15em;
  height: 1.15em;
  flex-shrink: 0;
}
</style>
