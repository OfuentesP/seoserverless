<template>
  <div v-if="estado" class="text-center mt-4 text-gray-700 font-medium mt-4">
    {{ estado }}
  </div>
</template>
<script setup>
const props = defineProps({ estado: String });
</script> 