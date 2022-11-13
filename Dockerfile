FROM node:lts
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production --silent && mv node_modules ../
COPY . .
RUN mkdir -p /usr/src/app/static/img
RUN mkdir -p /usr/src/app/static/icons
RUN chown -R node /usr/src/app
USER node
CMD ["npm", "start"]