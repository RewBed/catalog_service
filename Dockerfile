# Stage 1: build
FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем весь код
COPY . .

# Генерация Prisma Client
RUN npx prisma generate

# Сборка NestJS
RUN npm run build

# Stage 2: production
FROM node:24-alpine

WORKDIR /app

# Копируем зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# Копируем скомпилированный код и все нужные папки
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/generated ./generated
COPY .env ./
COPY prisma.config.ts ./
COPY grpc ./grpc

# Проверка, что dist действительно есть
RUN ls -la ./dist

# Открываем порт
EXPOSE 3000
EXPOSE 50051