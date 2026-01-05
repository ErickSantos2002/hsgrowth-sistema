# Etapa de build
FROM node:20-alpine AS builder

# Diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos de configuração e dependências
COPY package*.json ./
COPY vite.config.ts ./
COPY tsconfig.json ./
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Instala dependências
RUN npm install

# Copia o restante do projeto (src/, index.html, public/, etc)
COPY . .

# Corrige permissões para Alpine (opcional, mas bom)
RUN find node_modules/.bin -type f -exec chmod +x {} \;

# Build do projeto Vite (gera /dist)
RUN npm run build

# Etapa final: Nginx para servir os arquivos
FROM nginx:1.25-alpine

# Copia o build final da etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Substitui o arquivo de configuração do Nginx (SPA fallback para React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 60 para acesso HTTP
EXPOSE 60

# Comando de inicialização do Nginx
CMD ["nginx", "-g", "daemon off;"]
