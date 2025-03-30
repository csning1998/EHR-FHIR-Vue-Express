<script lang="ts" setup>
import { ref } from 'vue'
import { RouterView } from 'vue-router'

const drawer = ref(false)
</script>

<template>
   <v-app>
      <v-app-bar app color="primary" dark>
         <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

         <v-toolbar-title>EHR FHIR Web App</v-toolbar-title>

         <v-spacer></v-spacer>

         <v-btn icon>
            <v-icon>mdi-account-circle</v-icon>
         </v-btn>
      </v-app-bar>

      <v-navigation-drawer v-model="drawer" app temporary>
         <v-list dense nav>
            <v-list-item prepend-icon="mdi-home" title="Index" to="/"></v-list-item>
            <v-list-item
               prepend-icon="mdi-account-group"
               title="Patient Management"
               to="/patients"
            ></v-list-item>
         </v-list>
      </v-navigation-drawer>

      <v-main>
         <v-container fluid>
            <router-view v-slot="{ Component }">
               <transition name="fade">
                  <component :is="Component" />
               </transition>
            </router-view>
         </v-container>
      </v-main>

      <v-footer :elevation="2" app>
         <span class="text-caption">&copy; {{ new Date().getFullYear() }} EHR FHIR App</span>
      </v-footer>
   </v-app>
</template>

<style scoped></style>
