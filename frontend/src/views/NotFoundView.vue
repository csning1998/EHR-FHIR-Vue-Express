<script lang="ts" setup></script>

<template>
   <v-container class="fill-height" fluid>
      <v-row align="center" class="text-center" justify="center">
         <v-col cols="12">
            <div class="text-h1 font-weight-bold text-primary">404</div>
            <div class="text-h4 mt-4 mb-8">Aw! snap, you got lost...</div>
            <v-btn :to="{ name: 'home' }" color="primary" size="large">
               <v-icon start>mdi-home</v-icon>
               Return home page
            </v-btn>
         </v-col>
      </v-row>
   </v-container>
</template>

<style scoped>
.fill-height {
   min-height: 80vh;
}
</style>
