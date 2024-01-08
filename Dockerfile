FROM    nginx:1.13.8-alpine

# Environmental variables
ENV     USER=root HOME=/tmp

COPY    ./nginx.conf /etc/nginx/conf.d/default.conf
COPY    ./static                 /
COPY    ./dist                   /
COPY    ./package.json           /package.json


EXPOSE  8000
