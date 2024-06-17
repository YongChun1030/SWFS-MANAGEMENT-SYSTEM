# Stage 1: Build the React app
FROM node:18 as build

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build

# Stage 2: Serve the React app with nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Copy the nginx configuration file
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
