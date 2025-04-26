<template>
  <router-view />
</template>

<script setup>
// Este archivo ahora solo sirve como layout para las rutas
</script>

<style>
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fadeIn {
  animation: fadeIn 0.8s ease-out;
}

body {
  font-family: 'Source Serif Pro', serif;
}
</style>