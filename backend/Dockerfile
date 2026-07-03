# Stage 1: Build & Install dependencies
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Cài đặt các công cụ cần thiết để build các native addons như bcrypt
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./

# Cài đặt các dependencies cho môi trường production
RUN npm ci --only=production

# Stage 2: Runtime image
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy node_modules và code nguồn từ stage builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY src/ ./src/
# Tạo thư mục uploads nếu chưa có hoặc copy thư mục uploads hiện tại
COPY uploads/ ./uploads/

# Thiết lập môi trường
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

CMD ["npm", "start"]
