#!/bin/bash

echo "🔄 Actualizando el repositorio..."
git pull

echo "📦 Instalando dependencias..."
npm install

echo "🔨 Construyendo el proyecto..."
npm run build

echo "🔄 Reiniciando el servidor PM2..."
pm2 restart seo20

echo "✅ Actualización completada!"

# Mostrar el estado del servidor
pm2 status seo20 