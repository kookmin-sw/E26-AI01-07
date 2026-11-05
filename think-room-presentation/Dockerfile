# 생각의 방 발표 자료·포스터: 정적 파일을 nginx 로 서빙한다 (arm64/amd64 모두 지원).
FROM nginx:alpine
COPY . /usr/share/nginx/html
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
