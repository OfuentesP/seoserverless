<template>
  <div v-if="insight" class="mt-8 mx-auto max-w-3xl p-6 bg-gradient-to-br from-blue-50 to-green-50 rounded-xl shadow-lg border border-blue-200">
    <h3 class="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2"><span>🤖</span> Insight IA Gemini</h3>
    <div class="text-gray-800 leading-relaxed" v-html="geminiMarkdownToHtml(insight)"></div>
  </div>
</template>
<script setup>
import { watch } from 'vue';
const props = defineProps({ insight: String });
watch(() => props.insight, (val) => {
  if (val) console.log('[GeminiInsight] Mostrando insight IA:', val);
});
// Convierte el markdown Gemini a HTML seguro con reglas personalizadas
function geminiMarkdownToHtml(md) {
  md = md.replace(/^(#+)\s*([✅⚠️💡🚀])\s*(.*)$/gm, (match, hashes, emoji, title) => {
    return `<h3>${emoji} ${title.trim()}</h3>`;
  });
  md = md.replace(/^(#+)\s*(.*)$/gm, (match, hashes, title) => {
    return `<h3>${title.trim()}</h3>`;
  });
  md = md.replace(/^(?!<h3>|\*|\-|\s*$)(.+)$/gm, '<p>$1</p>');
  md = md.replace(/\n\* (.+)/g, '<li>$1</li>');
  md = md.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/\*(.+?)\*/g, '<em>$1</em>');
  md = md.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return md;
}
</script> 