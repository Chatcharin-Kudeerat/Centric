FROM --platform=linux/x86_64 esas-core-base:latest
ARG NODE_VERSION=16.13.0

ARG ESAS_ROOT=/opt/esas/esas-core-v2

ENV container docker
ENV PATH "/opt/esas/esas-core-v2/server/bin:/usr/local/nodenv/shims:/usr/local/nodenv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"
ENV NODENV_ROOT=/usr/local/nodenv
ENV LANG ja_JP.UTF-8
ENV LC_ALL C.UTF-8
ENV ESAS_ROOT=$ESAS_ROOT
ENV ESAS_CONFIG_PATH=/usr/local/esas/conf
ENV NODE_ENV=production
ENV NODE_PATH=src
# ENV REDIS_HOST=redis
# ENV ENGINE_HOST=engine

RUN git clone https://github.com/nodenv/nodenv.git /usr/local/nodenv
RUN mkdir -p /usr/local/nodenv/plugins
RUN git clone https://github.com/nodenv/node-build.git /usr/local/nodenv/plugins/node-build
RUN nodenv init -
RUN nodenv install $NODE_VERSION
RUN nodenv global $NODE_VERSION
COPY tmp/esas-core-v2/native_modules/ $ESAS_ROOT/native_modules/
COPY tmp/esas-core-v2/server/bin $ESAS_ROOT/server/bin
COPY tmp/esas-core-v2/server/package-lock.json $ESAS_ROOT/server/package-lock.json
COPY tmp/esas-core-v2/server/package.json $ESAS_ROOT/server/package.json
COPY tmp/esas-core-v2/server/public $ESAS_ROOT/server/public
COPY tmp/esas-core-v2/server/src $ESAS_ROOT/server/src
RUN bash $ESAS_ROOT/native_modules/build.sh
RUN cd $ESAS_ROOT/server && npm install
RUN chmod 755 $ESAS_ROOT/server/bin/esas_core_server.sh

CMD ["esas_core_server.sh"]
