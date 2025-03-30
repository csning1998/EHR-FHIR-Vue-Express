import 'vuetify/styles' // Global CSS has to be imported
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi' // Import MDI icons
// Import MDI font CSS
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
   components,
   directives,
   icons: {
      // Configure icon set
      defaultSet: 'mdi',
      aliases,
      sets: {
         mdi,
      },
   },
   // Defailt Theme Settings
   // theme: {
   //   defaultTheme: 'light',
   //   themes: {
   //     light: {
   //       colors: {
   //         primary: '#1976D2',
   //         secondary: '#424242',
   //         accent: '#82B1FF',
   //         error: '#FF5252',
   //         info: '#2196F3',
   //         success: '#4CAF50',
   //         warning: '#FFC107',
   //       },
   //     },
   //   },
   // },
})

export default vuetify
