#!/bin/bash

echo "Actualizando código desde GitHub..."
git pull origin main

echo "Instalando dependencias..."
npm install

echo "Construyendo frontend (si aplica)..."
npm run build

echo "Reiniciando backend con PM2..."
pm2 restart seo20

echo "¡Actualización completa!"
