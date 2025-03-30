<script lang="ts" setup>
import axios from 'axios'
import { onMounted } from 'vue'

// Home view component that checks backend health on mount
onMounted(async () => {
   try {
      // Replace the URL with your backend health check endpoint
      const response = await axios.get('http://localhost:3333/api/health')
      console.log('Backend health check response:', response.data)
   } catch (error) {
      console.error('Failed to call backend API:', error)
   }
})
</script>

<template>
   <v-card>
      <v-card-title class="text-h5">Home</v-card-title>
      <v-card-text>
         Welcome to the EHR FHIR Demo App. Select functions from the left drawer.
      </v-card-text>
   </v-card>
</template>

<style scoped></style>
