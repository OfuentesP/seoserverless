<script setup>
import { computed, toRaw } from 'vue';
import useSeoAnalysis from '../composables/useSeoAnalysis';

const { resumen } = useSeoAnalysis();
const rawResumen = computed(() => toRaw(resumen));
const datosDisponibles = computed(() => rawResumen.value && Object.keys(rawResumen.value).length > 0);
</script>

