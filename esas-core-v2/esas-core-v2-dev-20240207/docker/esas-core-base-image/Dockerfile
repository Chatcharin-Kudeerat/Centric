FROM --platform=linux/x86_64 ubuntu:22.04
ENV container docker
ENV PATH "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"
ENV LANG ja_JP.UTF-8
ENV LC_ALL C.UTF-8
RUN apt-get update && apt -y install build-essential language-pack-ja git curl cmake
# For chrome
RUN apt install -y libnss3 libatk1.0-0 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libxkbcommon0 libpango1.0-0 libasound2
RUN update-locale LANG=ja_JP.UTF-8
VOLUME ["/sys/fs/cgroup"]
STOPSIGNAL SIGRTMIN+3
